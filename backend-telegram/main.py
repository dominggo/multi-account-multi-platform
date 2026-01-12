"""
Telegram Backend Service
Handles Telegram account management and messaging
"""

import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from loguru import logger
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError

# Load environment variables
load_dotenv()

# Configuration
API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "messaging_platform")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
SESSION_DIR = Path(os.getenv("SESSION_DIR", "./sessions"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# Ensure directories exist
SESSION_DIR.mkdir(exist_ok=True)
Path("./logs").mkdir(exist_ok=True)

# Configure logging
logger.add(
    os.getenv("LOG_FILE", "./logs/telegram-backend.log"),
    rotation="10 MB",
    retention="7 days",
    level=os.getenv("LOG_LEVEL", "INFO")
)

# FastAPI app
app = FastAPI(title="Telegram Backend API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active clients
active_clients: Dict[str, TelegramClient] = {}

# ============================================================================
# Pydantic Models
# ============================================================================

class PhoneAuthRequest(BaseModel):
    phone_number: str

class CodeVerifyRequest(BaseModel):
    phone_number: str
    code: str
    phone_code_hash: str

class PasswordRequest(BaseModel):
    phone_number: str
    password: str

class SendMessageRequest(BaseModel):
    phone_number: str
    chat_id: str
    message: str

class AccountStatus(BaseModel):
    phone_number: str
    is_connected: bool
    user_info: Optional[Dict] = None

# ============================================================================
# Helper Functions
# ============================================================================

def get_client(phone_number: str) -> TelegramClient:
    """Get or create a Telegram client for a phone number"""
    if phone_number in active_clients:
        return active_clients[phone_number]

    # Create new client
    session_file = SESSION_DIR / f"{phone_number}.session"
    client = TelegramClient(str(session_file), API_ID, API_HASH)
    active_clients[phone_number] = client
    return client

async def save_session_to_db(phone_number: str, session_string: str):
    """Save session string to database"""
    # TODO: Implement database save
    logger.info(f"Session saved for {phone_number}")

async def load_session_from_db(phone_number: str) -> Optional[str]:
    """Load session string from database"""
    # TODO: Implement database load
    return None

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Telegram Backend",
        "status": "running",
        "version": "1.0.0",
        "active_accounts": len(active_clients)
    }

@app.post("/auth/request-code")
async def request_phone_code(request: PhoneAuthRequest):
    """
    Step 1: Request verification code for phone number
    """
    try:
        client = get_client(request.phone_number)

        if not client.is_connected():
            await client.connect()

        # Send code request
        result = await client.send_code_request(request.phone_number)

        logger.info(f"Code sent to {request.phone_number}")

        return {
            "success": True,
            "phone_number": request.phone_number,
            "phone_code_hash": result.phone_code_hash,
            "message": "Verification code sent via Telegram"
        }

    except Exception as e:
        logger.error(f"Error requesting code for {request.phone_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify-code")
async def verify_code(request: CodeVerifyRequest):
    """
    Step 2: Verify the code received via SMS/Telegram
    """
    try:
        client = get_client(request.phone_number)

        if not client.is_connected():
            await client.connect()

        # Sign in with code
        try:
            await client.sign_in(
                request.phone_number,
                request.code,
                phone_code_hash=request.phone_code_hash
            )

            # Get user info
            me = await client.get_me()

            # Save session to database
            session_string = StringSession.save(client.session)
            await save_session_to_db(request.phone_number, session_string)

            logger.info(f"Successfully authenticated {request.phone_number}")

            return {
                "success": True,
                "phone_number": request.phone_number,
                "requires_password": False,
                "user_info": {
                    "id": me.id,
                    "first_name": me.first_name,
                    "last_name": me.last_name,
                    "username": me.username
                }
            }

        except SessionPasswordNeededError:
            logger.warning(f"2FA password required for {request.phone_number}")
            return {
                "success": False,
                "requires_password": True,
                "message": "Two-factor authentication enabled. Password required."
            }

    except PhoneCodeInvalidError:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    except Exception as e:
        logger.error(f"Error verifying code for {request.phone_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify-password")
async def verify_password(request: PasswordRequest):
    """
    Step 3 (Optional): Verify 2FA password if required
    """
    try:
        client = get_client(request.phone_number)

        if not client.is_connected():
            await client.connect()

        # Sign in with password
        await client.sign_in(password=request.password)

        # Get user info
        me = await client.get_me()

        # Save session
        session_string = StringSession.save(client.session)
        await save_session_to_db(request.phone_number, session_string)

        logger.info(f"Successfully authenticated {request.phone_number} with 2FA")

        return {
            "success": True,
            "phone_number": request.phone_number,
            "user_info": {
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username
            }
        }

    except Exception as e:
        logger.error(f"Error verifying password for {request.phone_number}: {e}")
        raise HTTPException(status_code=401, detail="Invalid password")

@app.get("/account/status/{phone_number}")
async def get_account_status(phone_number: str):
    """Get account connection status"""
    try:
        if phone_number not in active_clients:
            return {
                "phone_number": phone_number,
                "is_connected": False
            }

        client = active_clients[phone_number]

        if client.is_connected():
            me = await client.get_me()
            return {
                "phone_number": phone_number,
                "is_connected": True,
                "user_info": {
                    "id": me.id,
                    "first_name": me.first_name,
                    "last_name": me.last_name,
                    "username": me.username
                }
            }
        else:
            return {
                "phone_number": phone_number,
                "is_connected": False
            }

    except Exception as e:
        logger.error(f"Error getting status for {phone_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/message/send")
async def send_message(request: SendMessageRequest):
    """Send a message to a chat"""
    try:
        client = get_client(request.phone_number)

        if not client.is_connected():
            await client.connect()

        # Send message
        message = await client.send_message(request.chat_id, request.message)

        logger.info(f"Message sent from {request.phone_number} to {request.chat_id}")

        return {
            "success": True,
            "message_id": message.id,
            "date": message.date.isoformat()
        }

    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/{phone_number}")
async def get_chats(phone_number: str, limit: int = 20):
    """Get recent chats for an account"""
    try:
        client = get_client(phone_number)

        if not client.is_connected():
            await client.connect()

        dialogs = await client.get_dialogs(limit=limit)

        chats = []
        for dialog in dialogs:
            chats.append({
                "id": dialog.id,
                "name": dialog.name,
                "unread_count": dialog.unread_count,
                "last_message": dialog.message.message if dialog.message else None,
                "date": dialog.date.isoformat() if dialog.date else None
            })

        return {
            "phone_number": phone_number,
            "chats": chats
        }

    except Exception as e:
        logger.error(f"Error getting chats for {phone_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/account/disconnect/{phone_number}")
async def disconnect_account(phone_number: str):
    """Disconnect an account"""
    try:
        if phone_number in active_clients:
            client = active_clients[phone_number]
            await client.disconnect()
            del active_clients[phone_number]
            logger.info(f"Disconnected {phone_number}")

        return {
            "success": True,
            "phone_number": phone_number,
            "message": "Account disconnected"
        }

    except Exception as e:
        logger.error(f"Error disconnecting {phone_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# WebSocket for Real-time Messages
# ============================================================================

@app.websocket("/ws/{phone_number}")
async def websocket_endpoint(websocket: WebSocket, phone_number: str):
    """WebSocket endpoint for real-time message updates"""
    await websocket.accept()

    try:
        client = get_client(phone_number)

        if not client.is_connected():
            await client.connect()

        # Event handler for new messages
        @client.on(events.NewMessage)
        async def handler(event):
            message_data = {
                "type": "new_message",
                "chat_id": event.chat_id,
                "sender_id": event.sender_id,
                "message": event.message.message,
                "date": event.date.isoformat()
            }
            await websocket.send_json(message_data)

        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {phone_number}")
    except Exception as e:
        logger.error(f"WebSocket error for {phone_number}: {e}")
    finally:
        await websocket.close()

# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Telegram Backend starting...")
    logger.info(f"API ID configured: {API_ID > 0}")
    logger.info(f"Session directory: {SESSION_DIR}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Telegram Backend shutting down...")

    # Disconnect all clients
    for phone_number, client in active_clients.items():
        try:
            await client.disconnect()
            logger.info(f"Disconnected {phone_number}")
        except Exception as e:
            logger.error(f"Error disconnecting {phone_number}: {e}")

# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=os.getenv("DEBUG", "False").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )

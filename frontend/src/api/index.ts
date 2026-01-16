import axios from 'axios';
import { Account, Chat, Platform } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('messaging-platform-storage');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
});

// Auth
export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const changePassword = async (current_password: string, new_password: string) => {
  const response = await api.post('/auth/change-password', { current_password, new_password });
  return response.data;
};

// Accounts
export const getAccounts = async (): Promise<{ accounts: Account[] }> => {
  const response = await api.get('/accounts');
  return response.data;
};

export const createAccount = async (data: {
  phone_number: string;
  country_code: string;
  platform: Platform;
  display_name?: string;
  notes?: string;
}): Promise<Account> => {
  const response = await api.post('/accounts', data);
  return response.data;
};

export const updateAccount = async (
  id: number,
  data: Partial<Account>
): Promise<Account> => {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
};

export const deleteAccount = async (id: number): Promise<void> => {
  await api.delete(`/accounts/${id}`);
};

// Telegram
export const telegramRequestCode = async (phone_number: string) => {
  const response = await api.post('/telegram/auth/request-code', { phone_number });
  return response.data;
};

export const telegramVerifyCode = async (phone_number: string, code: string, phone_code_hash: string) => {
  const response = await api.post('/telegram/auth/verify-code', {
    phone_number,
    code,
    phone_code_hash,
  });
  return response.data;
};

export const telegramGetStatus = async (phone_number: string) => {
  const response = await api.get(`/telegram/account/status/${phone_number}`);
  return response.data;
};

export const telegramSendMessage = async (phone_number: string, chat_id: string, message: string) => {
  const response = await api.post('/telegram/message/send', {
    phone_number,
    chat_id,
    message,
  });
  return response.data;
};

export const telegramGetChats = async (phone_number: string): Promise<Chat[]> => {
  const response = await api.get(`/telegram/chats/${phone_number}`);
  return response.data.chats || [];
};

export const telegramVerifyPassword = async (phone_number: string, password: string) => {
  const response = await api.post('/telegram/auth/verify-password', {
    phone_number,
    password,
  });
  return response.data;
};

export const getTelegramActiveSessions = async () => {
  const response = await api.get('/telegram/accounts/active');
  return response.data;
};

export const telegramDisconnect = async (phone_number: string) => {
  const response = await api.post(`/telegram/account/disconnect/${phone_number}`);
  return response.data;
};

// WhatsApp
export const whatsappStartAuth = async (phone_number: string) => {
  const response = await api.post('/whatsapp/auth/start', { phone_number });
  return response.data;
};

export const whatsappGetQR = async (phone_number: string) => {
  const response = await api.get(`/whatsapp/auth/qr/${phone_number}`);
  return response.data;
};

export const whatsappGetStatus = async (phone_number: string) => {
  const response = await api.get(`/whatsapp/account/status/${phone_number}`);
  return response.data;
};

export const whatsappSendMessage = async (phone_number: string, chat_id: string, message: string) => {
  const response = await api.post('/whatsapp/message/send', {
    phone_number,
    chat_id,
    message,
  });
  return response.data;
};

export const whatsappGetChats = async (phone_number: string): Promise<Chat[]> => {
  const response = await api.get(`/whatsapp/chats/${phone_number}`);
  return response.data.chats || [];
};

export const getWhatsAppActiveSessions = async () => {
  const response = await api.get('/whatsapp/accounts/active');
  return response.data;
};

export const whatsappDisconnect = async (phone_number: string) => {
  const response = await api.post(`/whatsapp/account/disconnect/${phone_number}`);
  return response.data;
};

export default api;

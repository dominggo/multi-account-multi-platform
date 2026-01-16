import { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageCircle,
  RefreshCw,
  Search,
  Loader2,
  User,
  Users,
  Wifi,
  WifiOff,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { Account, Chat, Message } from '../types';
import {
  telegramGetChats,
  telegramSendMessage,
  telegramGetStatus,
  whatsappGetChats,
  whatsappSendMessage,
  whatsappGetStatus
} from '../api';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '../store';

interface ChatTabProps {
  account: Account;
}

export function ChatTab({ account }: ChatTabProps) {
  const { setEditingAccount } = useStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    fetchChats();
  }, [account.phone_number]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkStatus = async () => {
    setConnectionStatus('checking');
    try {
      const statusFn = account.platform === 'telegram' ? telegramGetStatus : whatsappGetStatus;
      const result = await statusFn(account.phone_number);
      setConnectionStatus(result.is_connected || result.status === 'connected' ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    setError(null);
    try {
      const chatsFn = account.platform === 'telegram' ? telegramGetChats : whatsappGetChats;
      const data = await chatsFn(account.phone_number);
      setChats(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chats');
      // Demo chats for preview
      setChats([
        {
          id: '1',
          name: 'John Doe',
          type: 'private',
          last_message: 'Hey, how are you?',
          last_message_at: new Date().toISOString(),
          unread_count: 2,
        },
        {
          id: '2',
          name: 'Team Chat',
          type: 'group',
          last_message: 'Meeting at 3pm',
          last_message_at: new Date(Date.now() - 3600000).toISOString(),
          unread_count: 0,
        },
        {
          id: '3',
          name: 'Support Channel',
          type: 'channel',
          last_message: 'New update available',
          last_message_at: new Date(Date.now() - 86400000).toISOString(),
          unread_count: 5,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    // Demo messages
    setMessages([
      {
        id: '1',
        chat_id: chat.id,
        content: 'Hello!',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        is_outgoing: false,
        status: 'read',
      },
      {
        id: '2',
        chat_id: chat.id,
        content: 'Hi there! How can I help you?',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        is_outgoing: true,
        status: 'read',
      },
      {
        id: '3',
        chat_id: chat.id,
        content: chat.last_message || 'Latest message',
        timestamp: chat.last_message_at || new Date().toISOString(),
        is_outgoing: false,
        status: 'delivered',
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      const sendFn = account.platform === 'telegram' ? telegramSendMessage : whatsappSendMessage;
      await sendFn(account.phone_number, selectedChat.id, newMessage);

      // Add message to local state
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          chat_id: selectedChat.id,
          content: newMessage,
          timestamp: new Date().toISOString(),
          is_outgoing: true,
          status: 'sent',
        },
      ]);
      setNewMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'group':
        return <Users className="w-5 h-5" />;
      case 'channel':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Chat List Sidebar */}
      <div className={`w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Account Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                account.platform === 'telegram' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {account.platform === 'telegram' ? (
                  <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {account.display_name || account.phone_number}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {connectionStatus === 'connected' ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Connected</span>
                    </>
                  ) : connectionStatus === 'checking' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                      <span className="text-gray-500">Checking...</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchChats}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => setEditingAccount(account)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 m-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">{error}</p>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No chats found
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    chat.type === 'group' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    chat.type === 'channel' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {getChatIcon(chat.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {chat.name}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                        {formatTime(chat.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {chat.last_message}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedChat.type === 'group' ? 'bg-purple-100 dark:bg-purple-900/30' :
                selectedChat.type === 'channel' ? 'bg-orange-100 dark:bg-orange-900/30' :
                'bg-gray-100 dark:bg-gray-700'
              }`}>
                {getChatIcon(selectedChat.type)}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selectedChat.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedChat.type}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_outgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      message.is_outgoing
                        ? account.platform === 'telegram'
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.is_outgoing ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  disabled={connectionStatus !== 'connected'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim() || connectionStatus !== 'connected'}
                  className={`p-3 rounded-full text-white disabled:opacity-50 ${
                    account.platform === 'telegram'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type Platform = 'telegram' | 'whatsapp';
export type AccountStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Account {
  id: number;
  phone_number: string;
  country_code: string;
  platform: Platform;
  display_name: string | null;
  status: AccountStatus;
  registered_at: string;
  last_active: string | null;
  keep_alive_enabled: boolean;
  keep_alive_interval: number;
  notes: string | null;
  last_topup: string | null;
  last_message_at: string | null;
}

export interface Message {
  id: number | string;
  account_id?: number;
  chat_id: string;
  chat_name?: string;
  sender_name?: string;
  content: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  is_outgoing: boolean;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group' | 'channel';
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface TabData {
  id: string;
  type: 'dashboard' | 'chat';
  title: string;
  accountId?: number;
  account?: Account;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

import { useEffect, useState } from 'react';
import {
  Phone,
  MessageCircle,
  Clock,
  Settings,
  Trash2,
  Edit,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
  Lock,
  QrCode,
  X,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store';
import { Account } from '../types';
import { getAccounts, getTelegramActiveSessions, getWhatsAppActiveSessions, telegramDisconnect, whatsappDisconnect } from '../api';
import { formatDistanceToNow } from 'date-fns';

interface BackendSession {
  phone_number: string;
  is_connected: boolean;
  user_info?: {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    username?: string;
    name?: string;
  };
  needs_password?: boolean;
  has_session_file?: boolean;
  has_qr_pending?: boolean;
  qr_code?: string;
  platform: 'telegram' | 'whatsapp';
}

export function Dashboard() {
  const {
    accounts,
    setAccounts,
    addTab,
    setEditingAccount,
    setShowAddAccountModal
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendSessions, setBackendSessions] = useState<BackendSession[]>([]);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchBackendSessions();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load accounts');
      // Use demo data for now
      setAccounts([
        {
          id: 1,
          phone_number: '+1234567890',
          country_code: 'US',
          platform: 'telegram',
          display_name: 'US Telegram',
          status: 'active',
          registered_at: '2024-01-15T10:00:00Z',
          last_active: '2024-01-15T15:30:00Z',
          keep_alive_enabled: true,
          keep_alive_interval: 86400,
          notes: 'Main US account',
          last_topup: '2024-01-10',
          last_message_at: '2024-01-15T15:25:00Z',
        },
        {
          id: 2,
          phone_number: '+447123456789',
          country_code: 'GB',
          platform: 'whatsapp',
          display_name: 'UK WhatsApp',
          status: 'active',
          registered_at: '2024-01-10T08:00:00Z',
          last_active: '2024-01-15T14:00:00Z',
          keep_alive_enabled: true,
          keep_alive_interval: 86400,
          notes: 'UK business line',
          last_topup: '2024-01-05',
          last_message_at: '2024-01-15T13:45:00Z',
        },
        {
          id: 3,
          phone_number: '+6281234567890',
          country_code: 'ID',
          platform: 'telegram',
          display_name: 'ID Telegram',
          status: 'inactive',
          registered_at: '2024-01-01T12:00:00Z',
          last_active: '2024-01-10T09:00:00Z',
          keep_alive_enabled: false,
          keep_alive_interval: 86400,
          notes: 'Indonesia personal',
          last_topup: '2023-12-15',
          last_message_at: '2024-01-10T08:30:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackendSessions = async () => {
    setLoadingBackend(true);
    const sessions: BackendSession[] = [];

    try {
      // Fetch Telegram sessions
      const telegramData = await getTelegramActiveSessions();
      if (telegramData.sessions) {
        for (const session of telegramData.sessions) {
          sessions.push({
            ...session,
            platform: 'telegram' as const,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch Telegram sessions:', err);
    }

    try {
      // Fetch WhatsApp sessions
      const whatsappData = await getWhatsAppActiveSessions();
      if (whatsappData.sessions) {
        for (const session of whatsappData.sessions) {
          sessions.push({
            ...session,
            platform: 'whatsapp' as const,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp sessions:', err);
    }

    setBackendSessions(sessions);
    setLoadingBackend(false);
  };

  const handleDisconnect = async (session: BackendSession) => {
    if (!confirm(`Disconnect ${session.phone_number}? This will log out the session.`)) {
      return;
    }

    setDisconnecting(session.phone_number);
    try {
      if (session.platform === 'telegram') {
        await telegramDisconnect(session.phone_number);
      } else {
        await whatsappDisconnect(session.phone_number);
      }
      // Refresh sessions
      await fetchBackendSessions();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const openAccountTab = (account: Account) => {
    addTab({
      id: `account-${account.id}`,
      type: 'chat',
      title: account.display_name || account.phone_number,
      accountId: account.id,
      account,
    });
  };

  const getPlatformBadge = (platform: string) => {
    if (platform === 'telegram') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center gap-1">
          <Send className="w-3 h-3" />
          Telegram
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
        <MessageCircle className="w-3 h-3" />
        WhatsApp
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const icons = {
      active: <Wifi className="w-3 h-3" />,
      inactive: <WifiOff className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      suspended: <WifiOff className="w-3 h-3" />,
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSessionStatusBadge = (session: BackendSession) => {
    if (session.is_connected) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          Connected
        </span>
      );
    }
    if (session.needs_password) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Needs 2FA
        </span>
      );
    }
    if (session.has_qr_pending) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center gap-1">
          <QrCode className="w-3 h-3" />
          QR Pending
        </span>
      );
    }
    if (session.has_session_file) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
          <WifiOff className="w-3 h-3" />
          Session Saved
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
        <WifiOff className="w-3 h-3" />
        Disconnected
      </span>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return date;
    }
  };

  // Summary stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const telegramAccounts = accounts.filter(a => a.platform === 'telegram').length;
  const whatsappAccounts = accounts.filter(a => a.platform === 'whatsapp').length;

  // Backend session stats
  const connectedSessions = backendSessions.filter(s => s.is_connected).length;
  const pendingSessions = backendSessions.filter(s => s.needs_password || s.has_qr_pending).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAccounts}</p>
            </div>
            <Phone className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeAccounts}</p>
            </div>
            <Wifi className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Telegram</p>
              <p className="text-2xl font-bold text-blue-600">{telegramAccounts}</p>
            </div>
            <Send className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">WhatsApp</p>
              <p className="text-2xl font-bold text-green-600">{whatsappAccounts}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Showing demo data</p>
        </div>
      )}

      {/* Backend Sessions Section */}
      {backendSessions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backend Sessions</h2>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                {connectedSessions} connected
              </span>
              {pendingSessions > 0 && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                  {pendingSessions} pending
                </span>
              )}
            </div>
            <button
              onClick={fetchBackendSessions}
              disabled={loadingBackend}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingBackend ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                These are active sessions in the backend services. Sessions shown here are connected or have saved credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backendSessions.map((session) => (
                <div
                  key={`${session.platform}-${session.phone_number}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        session.platform === 'telegram' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {session.platform === 'telegram' ? (
                          <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {session.user_info?.first_name || session.user_info?.name || session.phone_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.phone_number}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(session)}
                      disabled={disconnecting === session.phone_number}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      {disconnecting === session.phone_number ? (
                        <RefreshCw className="w-4 h-4 text-red-500 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {getPlatformBadge(session.platform)}
                    {getSessionStatusBadge(session)}
                  </div>

                  {session.user_info?.username && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      @{session.user_info.username}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts</h2>
          <button
            onClick={fetchAccounts}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No accounts added yet</p>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Topup
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => openAccountTab(account)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          account.platform === 'telegram' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {account.platform === 'telegram' ? (
                            <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {account.display_name || account.phone_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {account.phone_number} ({account.country_code})
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getPlatformBadge(account.platform)}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(account.last_message_at)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {account.last_topup || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate block">
                        {account.notes || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingAccount(account)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this account?')) {
                              // deleteAccount(account.id);
                            }
                          }}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <button
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

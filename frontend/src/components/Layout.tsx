import { X, Plus, LayoutDashboard, MessageCircle, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { TabData } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { tabs, activeTabId, setActiveTab, removeTab, setShowAddAccountModal, logout, user } = useStore();

  const getTabIcon = (tab: TabData) => {
    if (tab.type === 'dashboard') {
      return <LayoutDashboard className="w-4 h-4" />;
    }
    return <MessageCircle className="w-4 h-4" />;
  };

  const getPlatformColor = (tab: TabData) => {
    if (tab.type === 'dashboard') return 'bg-gray-600';
    if (tab.account?.platform === 'telegram') return 'bg-blue-500';
    if (tab.account?.platform === 'whatsapp') return 'bg-green-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Multi-Account Messaging
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{user?.username}</span>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-b-2 transition-colors min-w-max ${
                activeTabId === tab.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`w-2 h-2 rounded-full ${getPlatformColor(tab)}`} />
              {getTabIcon(tab)}
              <span className={`text-sm ${
                activeTabId === tab.id
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300'
              }`}>
                {tab.title}
              </span>
              {tab.id !== 'dashboard' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

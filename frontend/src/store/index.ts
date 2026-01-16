import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, TabData, User } from '../types';

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;

  // Accounts
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: number, updates: Partial<Account>) => void;
  removeAccount: (id: number) => void;

  // Tabs
  tabs: TabData[];
  activeTabId: string;
  addTab: (tab: TabData) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Modals
  showAddAccountModal: boolean;
  setShowAddAccountModal: (show: boolean) => void;
  editingAccount: Account | null;
  setEditingAccount: (account: Account | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),

      // Accounts
      accounts: [],
      setAccounts: (accounts) => set({ accounts }),
      addAccount: (account) => set((state) => ({
        accounts: [...state.accounts, account]
      })),
      updateAccount: (id, updates) => set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      })),
      removeAccount: (id) => set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        tabs: state.tabs.filter((t) => t.accountId !== id),
      })),

      // Tabs
      tabs: [{ id: 'dashboard', type: 'dashboard', title: 'Dashboard' }],
      activeTabId: 'dashboard',
      addTab: (tab) => {
        const { tabs } = get();
        const exists = tabs.find((t) => t.id === tab.id);
        if (!exists) {
          set({ tabs: [...tabs, tab], activeTabId: tab.id });
        } else {
          set({ activeTabId: tab.id });
        }
      },
      removeTab: (id) => {
        if (id === 'dashboard') return;
        const { tabs, activeTabId } = get();
        const newTabs = tabs.filter((t) => t.id !== id);
        const newActiveId = activeTabId === id
          ? newTabs[newTabs.length - 1]?.id || 'dashboard'
          : activeTabId;
        set({ tabs: newTabs, activeTabId: newActiveId });
      },
      setActiveTab: (id) => set({ activeTabId: id }),

      // Modals
      showAddAccountModal: false,
      setShowAddAccountModal: (show) => set({ showAddAccountModal: show }),
      editingAccount: null,
      setEditingAccount: (account) => set({ editingAccount: account }),
    }),
    {
      name: 'messaging-platform-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

import { useStore } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ChatTab } from './components/ChatTab';
import { AddAccountModal } from './components/AddAccountModal';
import { EditAccountModal } from './components/EditAccountModal';
import { LoginPage } from './components/LoginPage';

function App() {
  const { tabs, activeTabId, token } = useStore();

  // Show login page if not authenticated
  if (!token) {
    return <LoginPage />;
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const renderContent = () => {
    if (!activeTab || activeTab.type === 'dashboard') {
      return <Dashboard />;
    }

    if (activeTab.type === 'chat' && activeTab.account) {
      return <ChatTab account={activeTab.account} />;
    }

    return <Dashboard />;
  };

  return (
    <Layout>
      {renderContent()}
      <AddAccountModal />
      <EditAccountModal />
    </Layout>
  );
}

export default App;

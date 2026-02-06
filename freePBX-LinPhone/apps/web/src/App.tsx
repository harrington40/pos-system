import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CallPage } from './pages/CallPage';
import ContactsPage from './pages/ContactsPage';
import MessagesPage from './pages/MessagesPage';
import VoicemailPage from './pages/VoicemailPage';
import { AgentsPage } from './pages/AgentsPage';
import { QueuesPage } from './pages/QueuesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calls" element={<CallPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/voicemail" element={<VoicemailPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

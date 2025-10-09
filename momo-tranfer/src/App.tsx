import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navigation } from './components/Navigation.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { SendMoney } from './pages/SendMoney.tsx';
import { ReceiveMoney } from './pages/ReceiveMoney.tsx';
import { TransactionHistory } from './pages/TransactionHistory.tsx';
import Profile from './pages/Profile.tsx';
import ExchangeRates from './pages/ExchangeRates.tsx';
import CommercialExchangeRates from './pages/CommercialExchangeRates.tsx';
import { Login } from './pages/AuthComponent.tsx';
import { Register } from './pages/Register.tsx';
import { BusinessPartners } from './pages/BusinessPartners.tsx';
import { BusinessRegistration } from './pages/BusinessRegistration.tsx';
import { MoneyExchangers } from './pages/MoneyExchangers.tsx';
import { ExchangerProfile } from './pages/ExchangerProfile.tsx';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30">
      {!isAuthPage && <Navigation />}
      <main className={!isAuthPage ? "pb-20 md:pb-0" : ""}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/send" element={<SendMoney />} />
          <Route path="/receive" element={<ReceiveMoney />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/exchange-rates" element={<ExchangeRates />} />
          <Route path="/commercial-exchange-rates" element={<CommercialExchangeRates />} />
          <Route path="/business/partners" element={<BusinessPartners />} />
          <Route path="/business/register" element={<BusinessRegistration />} />
          <Route path="/money-exchangers" element={<MoneyExchangers />} />
          <Route path="/exchanger/:id" element={<ExchangerProfile />} />
        </Routes>
      </main>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </div>
    );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

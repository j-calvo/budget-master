import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, CreditCard as CardIcon, LayoutDashboard, PieChart, Settings, Wallet, Landmark, Activity, LogOut, Coins, Menu, Zap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import SettingsPage from './pages/Settings';
import CreditCards from './pages/CreditCards';
import Loans from './pages/Loans';
import Analytics from './pages/Analytics';
import Tools from './pages/Tools';
import Services from './pages/Services';
import QuickAddTransaction from './components/QuickAddTransaction';
import { useTranslation } from 'react-i18next';

// ... navItems and Sidebar ... 
const navItems = [
  { path: '/', name: 'Dashboard', subtitle: 'Overview', icon: <LayoutDashboard size={22} /> },
  { path: '/accounts', name: 'Accounts', subtitle: 'Balances', icon: <Wallet size={22} /> },
  { path: '/credit-cards', name: 'Cards', subtitle: 'Liabilities', icon: <CardIcon size={22} /> },
  { path: '/loans', name: 'Loans', subtitle: 'Obligations', icon: <Landmark size={22} /> },
  { path: '/transactions', name: 'Activity', subtitle: 'History', icon: <Activity size={22} /> },
  { path: '/services', name: 'Services', subtitle: 'Utilities', icon: <Zap size={22} /> },
  { path: '/budgets', name: 'Budgets', subtitle: 'Planning', icon: <PieChart size={22} /> },
  { path: '/analytics', name: 'Analytics', subtitle: 'Insights', icon: <PieChart size={22} /> },
  { path: '/tools', name: 'Tools', subtitle: 'Calculators', icon: <Coins size={22} /> },
];

function Sidebar({ onClose }) {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col w-64 glass-panel h-full text-slate-300 border-r border-brand-600/30">
      <div className="px-6 md:px-8 mt-6 md:mt-8 mb-6 md:mb-10 flex items-center gap-4 font-serif font-bold tracking-tight text-xl md:text-2xl shrink-0">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-900/50 border border-brand-600/50 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.1)] p-2">
          <img src="/logo.svg" alt="Budget Master" className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
        </div>
        <span className="bg-gradient-to-r from-white to-gold-100 bg-clip-text text-transparent italic">{t('Budget Master')}</span>
      </div>
      <nav className="flex-1 px-4 space-y-0.5 md:space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 md:gap-4 px-4 py-2.5 md:py-3.5 rounded-xl transition-all duration-300 ${isActive
                ? 'bg-gradient-to-r from-brand-600/40 to-transparent text-white font-medium border-l-2 border-gold-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                : 'text-slate-400 hover:bg-brand-600/20 hover:text-white hover:translate-x-1'
                }`}
            >
              <div className={isActive ? 'text-gold-500 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}>
                {item.icon}
              </div>
              <span className="text-[14px] md:text-[15px]">{t(item.name)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto border-t border-brand-600/30 flex flex-col gap-1 md:gap-2 relative pb-8 md:pb-4">
        <Link to="/settings" onClick={onClose} className={`flex items-center gap-3 md:gap-4 px-4 py-2.5 md:py-3 rounded-xl transition-all duration-300 ${location.pathname === '/settings'
          ? 'bg-gradient-to-r from-brand-600/40 to-transparent text-white font-medium border-l-2 border-gold-500'
          : 'text-slate-400 hover:bg-brand-600/20 hover:text-white'
          }`}>
          <div className={location.pathname === '/settings' ? 'text-gold-500 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}>
            <Settings size={20} />
          </div>
          <span className="text-[14px] md:text-[15px]">{t('Settings')}</span>
        </Link>

        <button onClick={() => { logout(); onClose?.(); }} className="flex items-center gap-3 md:gap-4 px-4 py-2.5 md:py-3 rounded-xl transition-all duration-300 text-slate-400 hover:bg-red-500/20 hover:text-red-400 text-left">
          <LogOut size={20} />
          <span className="text-[14px] md:text-[15px]">{t('Sign Out')}</span>
        </button>
      </div>
    </div>
  );
}

function MobileNav() {
  const location = useLocation();
  const { t } = useTranslation();

  const primaryNav = navItems.slice(0, 4);

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
      <div className="glass-card shadow-lg shadow-brand-900/50 flex justify-between items-center px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-2xl">
        {primaryNav.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-gold-400 -translate-y-1' : 'text-slate-400 hover:text-white'
                }`}
            >
              <div className={isActive ? 'drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]' : ''}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium tracking-wide">{t(item.name)}</span>
              {isActive && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,1)]"></div>}
            </Link>
          );
        })}
        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${location.pathname === '/settings' ? 'text-gold-400 -translate-y-1' : 'text-slate-400 hover:text-white'
            }`}
        >
          <div className={location.pathname === '/settings' ? 'drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]' : ''}>
            <Settings size={22} />
          </div>
          <span className="text-[10px] font-medium tracking-wide">{t('Settings')}</span>
          {location.pathname === '/settings' && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,1)]"></div>}
        </Link>
      </div>
    </div>
  );
}

function GlobalHeader({ onMenuClick }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  // Find current view title and subtitle
  let title = 'Dashboard';
  let subtitle = 'Overview';
  if (location.pathname !== '/') {
    const match = [...navItems, { path: '/settings', name: 'Settings', subtitle: 'Configuration' }]
      .filter(i => i.path !== '/')
      .find(i => location.pathname.startsWith(i.path));
    if (match) {
      title = match.name;
      subtitle = match.subtitle || title;
    }
  }

  return (
    <header className="sticky top-0 z-40 md:mb-6 mb-4 glass-panel border-b border-brand-600/30">
      <div className="flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-white tracking-wide">{t(title)}</h1>
            <p className="text-xs text-gold-400 font-medium tracking-widest uppercase mt-0.5 opacity-80">{t(subtitle)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm text-white font-medium">{user?.name}</p>
            <p className="text-[10px] text-gold-400 font-bold tracking-widest uppercase">{t(user?.role || '')}</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-gold-500/30 flex items-center justify-center bg-brand-700/50 text-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <span className="font-serif font-bold italic">{user?.name?.charAt(0) || 'U'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen selection:bg-gold-500/30 selection:text-white text-slate-200">
      {/* Sidebar - Desktop (static) and Mobile (drawer) */}
      <div 
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col pb-24 md:pb-0 min-w-0 w-full overflow-hidden">
        <GlobalHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 px-4 md:px-10 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
      <QuickAddTransaction />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold-500 font-serif text-xl italic drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">{t('Authenticating Wallet...')}</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/credit-cards" element={<CreditCards />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

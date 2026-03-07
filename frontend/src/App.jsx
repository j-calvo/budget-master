import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, CreditCard as CardIcon, LayoutDashboard, PieChart, Settings, Wallet, Landmark } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import SettingsPage from './pages/Settings';
import CreditCards from './pages/CreditCards';
import Loans from './pages/Loans';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/accounts', name: 'Accounts', icon: <Wallet size={20} /> },
    { path: '/credit-cards', name: 'Credit Cards', icon: <CardIcon size={20} /> },
    { path: '/loans', name: 'Loans', icon: <Landmark size={20} /> },
    { path: '/transactions', name: 'Transactions', icon: <CardIcon size={20} /> },
    { path: '/budgets', name: 'Budgets', icon: <PieChart size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen fixed top-0 left-0 flex flex-col pt-6 z-10 text-slate-300">
      <div className="px-6 mb-8 flex items-center gap-2 text-white font-bold text-xl">
        <Home className="text-primary-500" />
        <span>FinTrack</span>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary-600 text-white font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto">
        <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          location.pathname === '/settings'
            ? 'bg-primary-600 text-white font-medium'
            : 'hover:bg-slate-800 hover:text-white'
        }`}>
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

// removed mock components

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/credit-cards" element={<CreditCards />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

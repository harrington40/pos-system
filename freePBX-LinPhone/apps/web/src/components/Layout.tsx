import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Phone, 
  Users, 
  Clock, 
  BarChart3, 
  Settings,
  LayoutDashboard,
  MessageSquare,
  Voicemail,
  UserCircle
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/calls', icon: Phone, label: 'Calls' },
    { path: '/contacts', icon: UserCircle, label: 'Contacts' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/voicemail', icon: Voicemail, label: 'Voicemail' },
    { path: '/agents', icon: Users, label: 'Agents' },
    { path: '/queues', icon: Clock, label: 'Queues' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Phone className="w-8 h-8" />
            Smart SIP
          </h1>
        </div>
        
        <nav className="px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

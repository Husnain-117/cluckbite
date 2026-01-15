import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ManagerNotifications from './ManagerNotifications';

interface ManagerLayoutProps {
  children: React.ReactNode;
  activeTab: 'orders' | 'walkin' | 'phone';
  onTabChange: (tab: 'orders' | 'walkin' | 'phone') => void;
}

const ManagerLayout = ({ children, activeTab, onTabChange }: ManagerLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_role', 'manager')
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 10000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/manager/login');
  };

  const navItems = [
    { id: 'orders', label: 'Order Management', icon: ClipboardList },
    { id: 'walkin', label: 'Walk-In Orders', icon: ShoppingCart },
    { id: 'phone', label: 'Phone Orders', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            {isSidebarOpen && (
              <Link to="/manager" className="font-heading font-bold text-xl gradient-text">
                Cluck Bite
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as 'orders' | 'walkin' | 'phone')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              ))}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border">
            {isSidebarOpen && user && (
              <div className="mb-3 px-4">
                <p className="font-medium truncate">{user.email}</p>
                <p className="text-sm text-muted-foreground">Manager</p>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start gap-3"
            >
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span>Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LayoutDashboard className="h-5 w-5" />
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">
                {activeTab === 'orders' ? 'Order Management' : 
                 activeTab === 'walkin' ? 'Walk-In Orders' : 'Phone Orders (Delivery)'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                {isNotificationsOpen && (
                  <ManagerNotifications onClose={() => setIsNotificationsOpen(false)} />
                )}
              </div>

              {/* Back to Customer Site */}
              <Link to="/">
                <Button variant="outline" size="sm">
                  View Customer Site
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default ManagerLayout;

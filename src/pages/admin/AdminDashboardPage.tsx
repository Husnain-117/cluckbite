import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import InventoryManagement from '@/components/admin/InventoryManagement';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AdminOrdersOverview from '@/components/admin/AdminOrdersOverview';
import UserManagement from '@/components/admin/UserManagement';
import AdminSettings from '@/components/admin/AdminSettings';
import CategoryManagement from '@/components/admin/CategoryManagement';
import OffersManagement from '@/components/admin/OffersManagement';
import AddonsManagement from '@/components/admin/AddonsManagement';

const AdminDashboardPage = () => {
  const { user, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once when loading is complete and user is not admin
    if (!loading && !hasRedirected && (!user || !isAdmin)) {
      setHasRedirected(true);
      navigate('/admin/login', { replace: true });
    }
  }, [user, isAdmin, loading, navigate, hasRedirected]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting (prevents flash)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'inventory':
        return <InventoryManagement />;
      case 'addons':
        return <AddonsManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'offers':
        return <OffersManagement />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'orders':
        return <AdminOrdersOverview />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminDashboardPage;

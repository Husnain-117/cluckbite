import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagerAuth } from '@/hooks/useManagerAuth';
import ManagerLayout from '@/components/manager/ManagerLayout';
import OrderManagement from '@/components/manager/OrderManagement';
import WalkInOrders from '@/components/manager/WalkInOrders';
import PhoneOrders from '@/components/manager/PhoneOrders';

const ManagerDashboard = () => {
  const { isManager, isLoading } = useManagerAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'walkin' | 'phone'>('orders');

  useEffect(() => {
    if (!isLoading && !isManager) {
      navigate('/manager/login');
    }
  }, [isManager, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <OrderManagement />;
      case 'walkin':
        return <WalkInOrders />;
      case 'phone':
        return <PhoneOrders />;
      default:
        return <OrderManagement />;
    }
  };

  return (
    <ManagerLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </ManagerLayout>
  );
};

export default ManagerDashboard;

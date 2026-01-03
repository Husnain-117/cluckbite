import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagerAuth } from '@/hooks/useManagerAuth';
import ManagerLayout from '@/components/manager/ManagerLayout';
import OrderManagement from '@/components/manager/OrderManagement';
import WalkInOrders from '@/components/manager/WalkInOrders';

const ManagerDashboard = () => {
  const { isManager, isLoading } = useManagerAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'walkin'>('orders');

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

  return (
    <ManagerLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'orders' ? <OrderManagement /> : <WalkInOrders />}
    </ManagerLayout>
  );
};

export default ManagerDashboard;

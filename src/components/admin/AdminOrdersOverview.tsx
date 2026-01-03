import React, { useState } from 'react';
import { Search, Filter, Eye, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import OrderDetailsModal from '@/components/manager/OrderDetailsModal';

const AdminOrdersOverview = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-all-orders', statusFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter as any);
      }

      if (sourceFilter !== 'all') {
        query = query.eq('order_source', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ['admin-order-items', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', selectedOrder.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrder,
  });

  const filteredOrders = orders?.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    approved: 'bg-blue-500/10 text-blue-500',
    preparing: 'bg-purple-500/10 text-purple-500',
    ready: 'bg-green-500/10 text-green-500',
    completed: 'bg-green-500/10 text-green-500',
    rejected: 'bg-red-500/10 text-red-500',
  };

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    partial: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-green-500/10 text-green-500',
  };

  const exportToCSV = () => {
    if (!orders) return;

    const headers = ['Order #', 'Customer', 'Email', 'Phone', 'Type', 'Amount', 'Payment', 'Status', 'Date'];
    const rows = orders.map((order) => [
      order.order_number,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.order_type,
      order.total_amount,
      order.payment_status,
      order.order_status,
      new Date(order.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Order Overview</h1>
          <p className="text-muted-foreground">View and manage all system orders</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="input-styled pl-12"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-48 input-styled">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full lg:w-48 input-styled">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="walk-in">Walk-In</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="card-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-4 text-sm font-medium">Order #</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Customer</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Type</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Amount</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Payment</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Source</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Date</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders?.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-4 px-4 font-medium text-primary">{order.order_number}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 capitalize">{order.order_type}</td>
                    <td className="py-4 px-4 font-semibold text-secondary">
                      ${Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${paymentStatusColors[order.payment_status]}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.order_status]}`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.order_source === 'walk-in' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {order.order_source || 'online'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && isModalOpen && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminOrdersOverview;

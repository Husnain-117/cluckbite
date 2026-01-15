import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar, Download, RefreshCw, Package, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import OrderDetailsModal from './OrderDetailsModal';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  preparing: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  ready: { bg: 'bg-green-500/10', text: 'text-green-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  partial: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500' },
};

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['manager-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('manager-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['manager-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.order_status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((order) => {
      counts[order.order_status] = (counts[order.order_status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const pendingCount = statusCounts.pending || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card-elevated p-3 md:p-4">
          <p className="text-xs md:text-sm text-muted-foreground">Today's Orders</p>
          <p className="text-xl md:text-2xl font-heading font-bold">{orders.length}</p>
        </div>
        <div className="card-elevated p-3 md:p-4">
          <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
          <p className="text-xl md:text-2xl font-heading font-bold text-yellow-500">{pendingCount}</p>
        </div>
        <div className="card-elevated p-3 md:p-4">
          <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
          <p className="text-xl md:text-2xl font-heading font-bold text-purple-500">
            {(statusCounts.approved || 0) + (statusCounts.preparing || 0)}
          </p>
        </div>
        <div className="card-elevated p-3 md:p-4">
          <p className="text-xs md:text-sm text-muted-foreground">Revenue</p>
          <p className="text-xl md:text-2xl font-heading font-bold text-secondary">
            £{orders.reduce((sum, o) => sum + Number(o.total_amount), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="input-styled pl-10 h-10"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} size="sm" className="h-10">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Tabs - Horizontal scroll on mobile */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex overflow-x-auto h-auto gap-1.5 bg-transparent p-0 scrollbar-hide -mx-1 px-1">
          {['all', 'pending', 'approved', 'preparing', 'ready', 'completed', 'rejected'].map((status) => (
            <TabsTrigger
              key={status}
              value={status}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm capitalize whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
                status === 'pending' && statusCounts.pending > 0 ? 'animate-pulse' : ''
              }`}
            >
              {status} {statusCounts[status] ? `(${statusCounts[status]})` : ''}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders Grid - Responsive */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg md:text-xl font-heading font-semibold">No orders found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredOrders.map((order) => {
            const statusColor = statusColors[order.order_status] || statusColors.pending;
            const paymentColor = paymentStatusColors[order.payment_status] || paymentStatusColors.pending;

            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`card-elevated p-4 text-left transition-all hover:border-primary/50 ${
                  order.order_status === 'pending' ? 'ring-2 ring-yellow-500/30' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-heading font-bold text-base md:text-lg text-primary">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium capitalize ${statusColor.bg} ${statusColor.text}`}>
                    {order.order_status}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="mb-3">
                  <p className="font-medium text-sm truncate">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.customer_phone}</p>
                </div>

                {/* Order Type & Total */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    {order.order_type === 'delivery' ? (
                      <Truck className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Store className="h-3.5 w-3.5 text-secondary" />
                    )}
                    <span className="capitalize">{order.order_type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-secondary">
                      £{Number(order.total_amount).toFixed(2)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>

                {/* Items count */}
                <p className="text-xs text-muted-foreground mt-2">
                  {order.order_items?.length || 0} items
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderManagement;

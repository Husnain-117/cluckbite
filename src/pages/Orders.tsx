import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Package, Clock, CheckCircle, XCircle, Truck, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  preparing: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  ready: { bg: 'bg-green-500/10', text: 'text-green-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  preparing: Package,
  ready: Package,
  completed: CheckCircle,
  rejected: XCircle,
};

const Orders = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <span className="text-8xl block mb-6">🔐</span>
          <h1 className="text-2xl font-heading font-bold mb-4">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your order history
          </p>
          <Link to="/auth">
            <Button className="btn-primary">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-heading font-bold ml-4">My Orders</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : !orders?.length ? (
          <div className="text-center py-12">
            <span className="text-8xl block mb-6">📦</span>
            <h2 className="text-2xl font-heading font-bold mb-4">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't placed any orders yet. Start your first order!
            </p>
            <Link to="/menu">
              <Button className="btn-primary">Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = statusIcons[order.order_status] || Package;
              const colors = statusColors[order.order_status] || statusColors.pending;

              return (
                <Link
                  key={order.id}
                  to={`/track-order?order=${order.order_number}`}
                  className="card-elevated p-4 block group hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order</p>
                      <p className="font-heading font-bold text-primary">{order.order_number}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${colors.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${colors.text}`} />
                      <span className={`text-sm font-medium capitalize ${colors.text}`}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {order.order_type === 'delivery' ? (
                          <Truck className="h-4 w-4" />
                        ) : (
                          <Store className="h-4 w-4" />
                        )}
                        <span className="capitalize">{order.order_type}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-secondary">
                        ${Number(order.total_amount).toFixed(2)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;

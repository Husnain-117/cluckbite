import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, Package, Clock, CheckCircle, XCircle, Truck, UtensilsCrossed, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  order_type: string;
  order_status: string;
  total_amount: number;
  created_at: string;
  delivery_address?: string;
}

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const initialOrderNumber = searchParams.get('order') || '';
  const [searchQuery, setSearchQuery] = useState(initialOrderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { user } = useAuth();

  const fetchOrder = async (orderNumber: string) => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      
      setOrder(data);
      
      if (!data) {
        toast.error('Order not found');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      fetchOrder(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  // Real-time subscription
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
          toast.info(`Order status updated: ${(payload.new as Order).order_status}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(searchQuery);
  };

  const getStatusIndex = (status: string) => {
    if (status === 'rejected') return -1;
    return statusSteps.findIndex((s) => s.key === status);
  };

  const currentStatusIndex = order ? getStatusIndex(order.order_status) : -1;

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
          <h1 className="text-xl font-heading font-bold ml-4">Track Order</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter order number (e.g., ORD-20260103-XXXX)"
                className="input-styled pl-12"
              />
            </div>
            <Button type="submit" className="btn-primary px-6">
              Track
            </Button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        )}

        {/* Order Not Found */}
        {hasSearched && !isLoading && !order && (
          <div className="text-center py-12">
            <span className="text-6xl block mb-4">🔍</span>
            <h2 className="text-2xl font-heading font-bold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find an order with that number. Please check and try again.
            </p>
            <Link to="/menu">
              <Button className="btn-primary">Browse Menu</Button>
            </Link>
          </div>
        )}

        {/* Order Details */}
        {order && !isLoading && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Info Card */}
            <div className="card-elevated p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="text-xl font-heading font-bold text-primary">{order.order_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.order_type === 'delivery' ? (
                    <Truck className="h-5 w-5 text-primary" />
                  ) : (
                    <Store className="h-5 w-5 text-secondary" />
                  )}
                  <span className="text-sm font-medium capitalize">{order.order_type}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-secondary">${Number(order.total_amount).toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                {order.delivery_address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{order.delivery_address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            {order.order_status === 'rejected' ? (
              <div className="card-elevated p-6 border-destructive">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-lg">Order Rejected</p>
                    <p className="text-sm text-muted-foreground">
                      Unfortunately, your order could not be processed. Please contact us for more details.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-elevated p-6">
                <h3 className="font-heading font-semibold mb-6">Order Status</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
                  <div
                    className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                    style={{
                      height: `${Math.max(0, (currentStatusIndex / (statusSteps.length - 1)) * 100)}%`,
                    }}
                  />

                  {/* Steps */}
                  <div className="space-y-8">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex items-center gap-4 relative">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-primary/30 animate-pulse' : ''}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p
                              className={`font-semibold ${
                                isCompleted ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-sm text-primary animate-pulse">In progress...</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Link to="/menu" className="flex-1">
                <Button className="w-full btn-primary">Order Again</Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full btn-outline">
                  Back Home
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* My Orders (for logged in users) */}
        {user && !hasSearched && (
          <div className="text-center py-12">
            <span className="text-6xl block mb-4">📦</span>
            <p className="text-muted-foreground mb-4">
              Enter your order number above to track your order
            </p>
            <Link to="/orders">
              <Button variant="outline">View All Orders</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;

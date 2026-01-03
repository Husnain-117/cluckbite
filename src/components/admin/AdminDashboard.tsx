import React from 'react';
import { DollarSign, ShoppingCart, Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

const AdminDashboard = () => {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-today-stats'],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, order_status')
        .gte('created_at', startOfDay.toISOString());

      if (error) throw error;

      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.order_status === 'completed').length || 0;
      const pendingOrders = orders?.filter(o => o.order_status === 'pending').length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return { totalRevenue, totalOrders, completedOrders, pendingOrders, avgOrderValue };
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, title, stock_quantity, low_stock_threshold')
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, order_status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: ordersByStatus } = useQuery({
    queryKey: ['admin-orders-by-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('order_status');

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      data?.forEach(o => {
        statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: weeklyRevenue } = useQuery({
    queryKey: ['admin-weekly-revenue'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', days[0])
        .eq('order_status', 'completed');

      if (error) throw error;

      const revenueByDay: Record<string, number> = {};
      days.forEach(d => revenueByDay[d] = 0);

      data?.forEach(o => {
        const day = o.created_at.split('T')[0];
        if (revenueByDay[day] !== undefined) {
          revenueByDay[day] += Number(o.total_amount);
        }
      });

      return days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: revenueByDay[date],
      }));
    },
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    approved: 'bg-blue-500/10 text-blue-500',
    preparing: 'bg-purple-500/10 text-purple-500',
    ready: 'bg-green-500/10 text-green-500',
    completed: 'bg-green-500/10 text-green-500',
    rejected: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">+12%</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-3xl font-heading font-bold">${todayStats?.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Today's Revenue</p>
            </>
          )}
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              {todayStats?.pendingOrders} pending
            </span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <p className="text-3xl font-heading font-bold">{todayStats?.totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </>
          )}
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-secondary" />
            </div>
            {lowStockItems && lowStockItems.length > 0 && (
              <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                {lowStockItems.length} low
              </span>
            )}
          </div>
          <p className="text-3xl font-heading font-bold">Active</p>
          <p className="text-sm text-muted-foreground">Inventory Status</p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <p className="text-3xl font-heading font-bold">${todayStats?.avgOrderValue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
            </>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Low Stock Alert</p>
            <p className="text-sm text-muted-foreground">
              {lowStockItems.length} items are running low on stock
            </p>
          </div>
          <div className="flex gap-2">
            {lowStockItems.slice(0, 3).map(item => (
              <span key={item.id} className="text-xs bg-background px-2 py-1 rounded-full">
                {item.title}: {item.stock_quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Weekly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Order Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ordersByStatus?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {ordersByStatus?.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm capitalize">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card-elevated p-6">
        <h3 className="font-heading font-semibold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium text-primary">{order.order_number}</td>
                  <td className="py-3 px-4">{order.customer_name}</td>
                  <td className="py-3 px-4 font-semibold text-secondary">
                    ${Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.order_status]}`}>
                      {order.order_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

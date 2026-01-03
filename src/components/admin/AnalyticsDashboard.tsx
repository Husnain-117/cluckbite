import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Calendar,
  Download,
  CreditCard,
  Truck,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--destructive))', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('7days');

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case '7days':
        start.setDate(start.getDate() - 7);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        break;
      case 'month':
        start.setDate(1);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start, end };
  };

  const { data: overviewStats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter((o) => o.order_status === 'completed').length || 0;
      const cancelledOrders = orders?.filter((o) => o.order_status === 'rejected').length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalRevenue,
        totalOrders,
        completedOrders,
        cancelledOrders,
        avgOrderValue,
      };
    },
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['analytics-revenue-chart', dateRange],
    queryFn: async () => {
      const { start } = getDateRange();
      const days = dateRange === 'today' ? 24 : dateRange === '7days' ? 7 : 30;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', start.toISOString())
        .eq('order_status', 'completed');

      if (error) throw error;

      if (dateRange === 'today') {
        const hourlyData: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyData[i] = 0;

        orders?.forEach((o) => {
          const hour = new Date(o.created_at).getHours();
          hourlyData[hour] += Number(o.total_amount);
        });

        return Object.entries(hourlyData).map(([hour, revenue]) => ({
          label: `${hour}:00`,
          revenue,
        }));
      }

      const dailyData: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyData[date.toISOString().split('T')[0]] = 0;
      }

      orders?.forEach((o) => {
        const date = o.created_at.split('T')[0];
        if (dailyData[date] !== undefined) {
          dailyData[date] += Number(o.total_amount);
        }
      });

      return Object.entries(dailyData)
        .reverse()
        .map(([date, revenue]) => ({
          label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue,
        }));
    },
  });

  const { data: paymentMethodData } = useQuery({
    queryKey: ['analytics-payment-methods', dateRange],
    queryFn: async () => {
      const { start } = getDateRange();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('payment_method, total_amount')
        .gte('created_at', start.toISOString());

      if (error) throw error;

      const methods: Record<string, number> = {};
      orders?.forEach((o) => {
        const method = o.payment_method || 'unknown';
        methods[method] = (methods[method] || 0) + Number(o.total_amount);
      });

      return Object.entries(methods).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value * 100) / 100,
      }));
    },
  });

  const { data: orderTypeData } = useQuery({
    queryKey: ['analytics-order-types', dateRange],
    queryFn: async () => {
      const { start } = getDateRange();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('order_type')
        .gte('created_at', start.toISOString());

      if (error) throw error;

      const types: Record<string, number> = { delivery: 0, collection: 0 };
      orders?.forEach((o) => {
        types[o.order_type] = (types[o.order_type] || 0) + 1;
      });

      return Object.entries(types).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['analytics-top-products', dateRange],
    queryFn: async () => {
      const { start } = getDateRange();

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          item_title,
          quantity,
          total_price,
          orders!inner(created_at, order_status)
        `)
        .gte('orders.created_at', start.toISOString())
        .eq('orders.order_status', 'completed');

      if (error) throw error;

      const products: Record<string, { quantity: number; revenue: number }> = {};
      orderItems?.forEach((item) => {
        if (!products[item.item_title]) {
          products[item.item_title] = { quantity: 0, revenue: 0 };
        }
        products[item.item_title].quantity += item.quantity;
        products[item.item_title].revenue += Number(item.total_price);
      });

      return Object.entries(products)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Business intelligence and performance insights</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48 input-styled">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-heading font-bold">${overviewStats?.totalRevenue.toFixed(2)}</p>
              )}
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-heading font-bold">{overviewStats?.totalOrders}</p>
              )}
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-heading font-bold">${overviewStats?.avgOrderValue.toFixed(2)}</p>
              )}
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-heading font-bold">{overviewStats?.completedOrders}</p>
              )}
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-destructive" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-heading font-bold">{overviewStats?.cancelledOrders}</p>
              )}
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
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

        {/* Top Products */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Top Selling Products</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment & Order Type Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentMethodData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Types */}
        <div className="card-elevated p-6">
          <h3 className="font-heading font-semibold mb-4">Order Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderTypeData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-sm">Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-secondary" />
              <span className="text-sm">Collection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Products Table */}
      <div className="card-elevated p-6">
        <h3 className="font-heading font-semibold mb-4">Product Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">#</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Units Sold</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts?.map((product, index) => (
                <tr key={product.name} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">{index + 1}</td>
                  <td className="py-3 px-4">{product.name}</td>
                  <td className="py-3 px-4">{product.quantity}</td>
                  <td className="py-3 px-4 font-semibold text-secondary">${product.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

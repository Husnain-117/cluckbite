import React, { useState } from 'react';
import { Search, UserPlus, Shield, ShieldCheck, Users, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('manager');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: orderStats } = useQuery({
    queryKey: ['admin-user-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('user_id, total_amount');
      if (error) throw error;

      const stats: Record<string, { orders: number; total: number }> = {};
      data?.forEach((order) => {
        if (order.user_id) {
          if (!stats[order.user_id]) {
            stats[order.user_id] = { orders: 0, total: 0 };
          }
          stats[order.user_id].orders++;
          stats[order.user_id].total += Number(order.total_amount);
        }
      });
      return stats;
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role assigned successfully!');
      setIsAddRoleModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role removed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const getUserRoles = (userId: string) => {
    return userRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];
  };

  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (roleFilter === 'all') return matchesSearch;

    const roles = getUserRoles(profile.user_id);
    if (roleFilter === 'customer') return matchesSearch && roles.length === 0;
    return matchesSearch && roles.includes(roleFilter as any);
  });

  const stats = {
    total: profiles?.length || 0,
    managers: userRoles?.filter((r) => r.role === 'manager').length || 0,
    admins: userRoles?.filter((r) => r.role === 'admin').length || 0,
    customers: (profiles?.length || 0) - (userRoles?.length || 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{stats.customers}</p>
              <p className="text-sm text-muted-foreground">Customers</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{stats.managers}</p>
              <p className="text-sm text-muted-foreground">Managers</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{stats.admins}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="input-styled pl-12"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full lg:w-48 input-styled">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="manager">Managers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
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
                  <th className="text-left py-4 px-4 text-sm font-medium">User</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Roles</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Orders</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Total Spent</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Joined</th>
                  <th className="text-left py-4 px-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles?.map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  const userStats = orderStats?.[profile.user_id] || { orders: 0, total: 0 };

                  return (
                    <tr key={profile.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg">👤</span>
                          </div>
                          <div>
                            <p className="font-medium">{profile.full_name || 'No Name'}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {roles.length === 0 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              Customer
                            </span>
                          ) : (
                            roles.map((role) => (
                              <span
                                key={role}
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  role === 'admin'
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-secondary/10 text-secondary'
                                }`}
                              >
                                {role}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">{userStats.orders}</td>
                      <td className="py-4 px-4 font-semibold text-secondary">
                        ${userStats.total.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {!roles.includes('manager') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(profile.user_id);
                                setSelectedRole('manager');
                                setIsAddRoleModalOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Make Manager
                            </Button>
                          )}
                          {roles.includes('manager') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeRoleMutation.mutate({ userId: profile.user_id, role: 'manager' })}
                            >
                              Remove Manager
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Role Modal */}
      <Dialog open={isAddRoleModalOpen} onOpenChange={setIsAddRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'manager' | 'admin')}>
                <SelectTrigger className="input-styled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsAddRoleModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => addRoleMutation.mutate({ userId: selectedUserId, role: selectedRole })}
                className="flex-1 btn-primary"
              >
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

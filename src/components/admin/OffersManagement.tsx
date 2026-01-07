import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, Clock, Tag, Percent } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  discount_value: number;
  offer_type: 'daily' | 'weekly' | 'special';
  start_date: string;
  end_date: string;
  is_active: boolean;
  minimum_order: number;
  coupon_code: string | null;
  usage_limit: number | null;
  times_used: number;
  created_at: string;
}

const OffersManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
    discount_value: number;
    offer_type: 'daily' | 'weekly' | 'special';
    start_date: string;
    end_date: string;
    is_active: boolean;
    minimum_order: number;
    coupon_code: string;
    usage_limit: string;
  }>({
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    offer_type: 'daily',
    start_date: '',
    end_date: '',
    is_active: true,
    minimum_order: 0,
    coupon_code: '',
    usage_limit: '',
  });

  const { data: offers, isLoading } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('offers').insert({
        title: data.title,
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        offer_type: data.offer_type,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        is_active: data.is_active,
        minimum_order: data.minimum_order,
        coupon_code: data.coupon_code || null,
        usage_limit: data.usage_limit ? parseInt(data.usage_limit) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success('Offer created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create offer');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          title: data.title,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          offer_type: data.offer_type,
          start_date: new Date(data.start_date).toISOString(),
          end_date: new Date(data.end_date).toISOString(),
          is_active: data.is_active,
          minimum_order: data.minimum_order,
          coupon_code: data.coupon_code || null,
          usage_limit: data.usage_limit ? parseInt(data.usage_limit) : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success('Offer updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update offer');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success('Offer deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete offer');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update offer');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      offer_type: 'daily',
      start_date: '',
      end_date: '',
      is_active: true,
      minimum_order: 0,
      coupon_code: '',
      usage_limit: '',
    });
    setEditingOffer(null);
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      offer_type: offer.offer_type,
      start_date: format(new Date(offer.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(offer.end_date), "yyyy-MM-dd'T'HH:mm"),
      is_active: offer.is_active,
      minimum_order: offer.minimum_order,
      coupon_code: offer.coupon_code || '',
      usage_limit: offer.usage_limit?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Offer title is required');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Start and end dates are required');
      return;
    }
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }
    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getDiscountDisplay = (offer: Offer) => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% OFF`;
      case 'fixed':
        return `£${offer.discount_value} OFF`;
      case 'bogo':
        return 'Buy One Get One';
      case 'free_item':
        return 'Free Item';
      default:
        return offer.discount_value;
    }
  };

  const getOfferTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-500/10 text-blue-500';
      case 'weekly':
        return 'bg-purple-500/10 text-purple-500';
      case 'special':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">Offers Management</h2>
          <p className="text-muted-foreground">Create and manage promotional offers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Offer Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekend Special, Happy Hour Deal"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the offer..."
                  className="input-styled"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Offer Type</Label>
                  <Select
                    value={formData.offer_type}
                    onValueChange={(v: 'daily' | 'weekly' | 'special') =>
                      setFormData({ ...formData, offer_type: v })
                    }
                  >
                    <SelectTrigger className="input-styled">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v: 'percentage' | 'fixed' | 'bogo' | 'free_item') =>
                      setFormData({ ...formData, discount_type: v })
                    }
                  >
                    <SelectTrigger className="input-styled">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                      <SelectItem value="bogo">Buy One Get One</SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(formData.discount_type === 'percentage' || formData.discount_type === 'fixed') && (
                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(£)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    min="0"
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="input-styled"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-styled"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum_order">Minimum Order (£)</Label>
                  <Input
                    id="minimum_order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_order}
                    onChange={(e) => setFormData({ ...formData, minimum_order: parseFloat(e.target.value) || 0 })}
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage_limit">Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="0"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="input-styled"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon_code">Coupon Code (Optional)</Label>
                <Input
                  id="coupon_code"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="input-styled"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingOffer ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-elevated p-6">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          ))
        ) : offers?.length === 0 ? (
          <div className="col-span-full card-elevated p-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No offers yet</h3>
            <p className="text-muted-foreground mb-4">Create your first promotional offer</p>
          </div>
        ) : (
          offers?.map((offer) => (
            <div
              key={offer.id}
              className={`card-elevated p-6 space-y-4 ${isExpired(offer.end_date) ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{offer.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getOfferTypeColor(offer.offer_type)}`}>
                    {offer.offer_type.charAt(0).toUpperCase() + offer.offer_type.slice(1)}
                  </span>
                </div>
                <Switch
                  checked={offer.is_active && !isExpired(offer.end_date)}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: offer.id, is_active: checked })
                  }
                  disabled={isExpired(offer.end_date)}
                />
              </div>
              
              {offer.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
              )}
              
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-primary">{getDiscountDisplay(offer)}</span>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(offer.start_date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Ends: {format(new Date(offer.end_date), 'MMM dd, yyyy HH:mm')}
                    {isExpired(offer.end_date) && (
                      <span className="text-destructive ml-2">(Expired)</span>
                    )}
                  </span>
                </div>
                {offer.coupon_code && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="font-mono bg-muted px-2 py-0.5 rounded">{offer.coupon_code}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(offer)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{offer.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(offer.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OffersManagement;

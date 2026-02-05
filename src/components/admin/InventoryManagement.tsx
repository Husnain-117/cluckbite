import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import MealConfigEditor, { MealConfig } from './MealConfigEditor';
import ImageUpload from './ImageUpload';

const InventoryManagement = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    cost_price: '',
    category: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    is_available: true,
    is_featured: false,
    preparation_time: '15',
    allergens: [] as string[],
    meal_config: null as MealConfig | null,
    image_url: null as string | null,
  });

  // Default meal config for new meals
  const defaultMealConfig: MealConfig = {
    components: [
      { category: 'Chicken Burgers', quantity: 1, required: true, label: 'Burger' },
      { category: 'Fries', quantity: 1, required: true, label: 'Side', upgradeable: true },
      { category: 'Drinks', quantity: 1, required: true, label: 'Drink' },
    ],
    upgrades: [
      { from_category: 'Fries', to_categories: ['Tenders & Wings'], price_diff: 2, label: 'Upgrade to Wings/Tenders' }
    ]
  };

  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'purchase',
    quantity: '',
    notes: '',
  });

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['admin-menu-items', categoryFilter, stockFilter],
    queryFn: async () => {
      let query = supabase.from('menu_items').select('*');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query.order('title', { ascending: true });
      if (error) throw error;

      let filtered = data;
      if (stockFilter === 'low') {
        filtered = data.filter(
          (item) => item.stock_quantity <= (item.low_stock_threshold || 10)
        );
      } else if (stockFilter === 'out') {
        filtered = data.filter((item) => item.stock_quantity === 0);
      }

      return filtered;
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('menu_items').insert({
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        cost_price: parseFloat(data.cost_price) || 0,
        category: data.category,
        stock_quantity: parseInt(data.stock_quantity) || 100,
        low_stock_threshold: parseInt(data.low_stock_threshold) || 10,
        is_available: data.is_available,
        is_featured: data.is_featured,
        preparation_time: parseInt(data.preparation_time) || 15,
        allergens: data.allergens,
        meal_config: data.category?.toLowerCase().includes('meal') ? (data.meal_config || defaultMealConfig) : null,
        image_url: data.image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      toast.success('Item created successfully!');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('menu_items')
        .update({
          title: data.title,
          description: data.description,
          price: parseFloat(data.price),
          cost_price: parseFloat(data.cost_price) || 0,
          category: data.category,
          stock_quantity: parseInt(data.stock_quantity) || 100,
          low_stock_threshold: parseInt(data.low_stock_threshold) || 10,
          is_available: data.is_available,
          is_featured: data.is_featured,
          preparation_time: parseInt(data.preparation_time) || 15,
          allergens: data.allergens,
          meal_config: data.category?.toLowerCase().includes('meal') ? data.meal_config : null,
          image_url: data.image_url,
        })
        .eq('id', selectedItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      toast.success('Item updated successfully!');
      setIsAddModalOpen(false);
      setSelectedItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      toast.success('Item deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ itemId, adjustment }: { itemId: string; adjustment: any }) => {
      const item = menuItems?.find((i) => i.id === itemId);
      if (!item) throw new Error('Item not found');

      const quantity = parseInt(adjustment.quantity);
      let newStock = item.stock_quantity;

      if (adjustment.type === 'purchase') {
        newStock += quantity;
      } else {
        newStock -= quantity;
      }

      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ stock_quantity: Math.max(0, newStock) })
        .eq('id', itemId);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase.from('stock_movements').insert({
        menu_item_id: itemId,
        movement_type: adjustment.type,
        quantity: quantity,
        previous_stock: item.stock_quantity,
        new_stock: Math.max(0, newStock),
        notes: adjustment.notes,
      });

      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      toast.success('Stock updated successfully!');
      setIsStockModalOpen(false);
      setSelectedItem(null);
      setStockAdjustment({ type: 'purchase', quantity: '', notes: '' });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { error } = await supabase.from('categories').insert({
        name: data.name,
        description: data.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully!');
      setIsCategoryModalOpen(false);
      setNewCategory({ name: '', description: '' });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      cost_price: '',
      category: '',
      stock_quantity: '',
      low_stock_threshold: '10',
      is_available: true,
      is_featured: false,
      preparation_time: '15',
      allergens: [],
      meal_config: null,
      image_url: null,
    });
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      price: item.price.toString(),
      cost_price: item.cost_price?.toString() || '',
      category: item.category,
      stock_quantity: item.stock_quantity?.toString() || '',
      low_stock_threshold: item.low_stock_threshold?.toString() || '10',
      is_available: item.is_available ?? true,
      is_featured: item.is_featured ?? false,
      preparation_time: item.preparation_time?.toString() || '15',
      allergens: item.allergens || [],
      meal_config: item.meal_config || null,
      image_url: item.image_url || null,
    });
    setIsAddModalOpen(true);
  };

  const handleStockAdjust = (item: any) => {
    setSelectedItem(item);
    setIsStockModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedItem) {
      updateItemMutation.mutate(formData);
    } else {
      createItemMutation.mutate(formData);
    }
  };

  const filteredItems = menuItems?.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (item: any) => {
    if (item.stock_quantity === 0) return { label: 'Out of Stock', color: 'bg-destructive/10 text-destructive' };
    if (item.stock_quantity <= (item.low_stock_threshold || 10))
      return { label: 'Low Stock', color: 'bg-yellow-500/10 text-yellow-500' };
    return { label: 'In Stock', color: 'bg-green-500/10 text-green-500' };
  };

  const categoryEmojis: Record<string, string> = {
    Wings: '🍗',
    Burgers: '🍔',
    Tenders: '🍖',
    Sides: '🍟',
    Beverages: '🥤',
    Desserts: '🍰',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your menu items and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => { resetForm(); setSelectedItem(null); setIsAddModalOpen(true); }} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="input-styled pl-12"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full lg:w-48 input-styled">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full lg:w-48 input-styled">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems?.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <div key={item.id} className="card-elevated overflow-hidden group">
                <div className="relative h-32 bg-gradient-to-br from-muted to-background flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{categoryEmojis[item.category] || '🍽️'}</span>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                      {stockStatus.label}
                    </span>
                  </div>
                  {item.is_featured && (
                    <span className="absolute top-3 left-3 badge-featured">Featured</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-secondary">${Number(item.price).toFixed(2)}</span>
                    <button
                      onClick={() => handleStockAdjust(item)}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Stock: {item.stock_quantity}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this item?')) {
                          deleteItemMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-sm font-medium">Item</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Cost</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems?.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryEmojis[item.category] || '🍽️'}</span>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.is_featured && <span className="text-xs text-secondary">Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4 font-semibold text-secondary">${Number(item.price).toFixed(2)}</td>
                    <td className="py-3 px-4">${Number(item.cost_price || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleStockAdjust(item)} className="hover:text-primary">
                        {item.stock_quantity}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure?')) deleteItemMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Item Image</Label>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                folder="items"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Crispy Wings"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="input-styled">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Delicious crispy wings..."
                className="input-styled"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Selling Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="12.99"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="5.00"
                  className="input-styled"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="100"
                  className="input-styled"
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  placeholder="10"
                  className="input-styled"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preparation Time (minutes)</Label>
              <Input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                placeholder="15"
                className="input-styled"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
                />
                <Label>Available for ordering</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                />
                <Label>Featured item</Label>
              </div>
            </div>

            {/* Meal Configuration - only show for Meal Deals category */}
            {formData.category?.toLowerCase().includes('meal') && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Meal Deal Configuration</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure what items are included in this meal deal and any upgrade options.
                  </p>
                  <MealConfigEditor
                    config={formData.meal_config || defaultMealConfig}
                    onChange={(config) => setFormData({ ...formData, meal_config: config })}
                    categories={categories || []}
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 btn-primary">
                {selectedItem ? 'Update Item' : 'Create Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center p-4 bg-muted rounded-xl">
              <p className="text-muted-foreground">Current Stock</p>
              <p className="text-4xl font-heading font-bold">{selectedItem?.stock_quantity}</p>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={stockAdjustment.type}
                onValueChange={(v) => setStockAdjustment({ ...stockAdjustment, type: v })}
              >
                <SelectTrigger className="input-styled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase (Add Stock)</SelectItem>
                  <SelectItem value="sale">Sale (Remove Stock)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="waste">Waste/Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                placeholder="Enter quantity"
                className="input-styled"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={stockAdjustment.notes}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                placeholder="Reason for adjustment..."
                className="input-styled"
              />
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsStockModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => adjustStockMutation.mutate({ itemId: selectedItem.id, adjustment: stockAdjustment })}
                className="flex-1 btn-primary"
              >
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Salads"
                className="input-styled"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Fresh and healthy salads"
                className="input-styled"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => createCategoryMutation.mutate(newCategory)} className="flex-1 btn-primary">
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;

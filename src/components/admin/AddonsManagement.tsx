import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Tag,
  FolderPlus,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

const AddonsManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('addons');
  
  // Modal states
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Form states
  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    price: '',
    addon_category_id: '',
    max_quantity: '5',
    is_available: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: '0',
    is_active: true,
  });

  const [linkForm, setLinkForm] = useState({
    addonId: '',
    menuItemIds: [] as string[],
  });

  // Queries
  const { data: addonCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['addon-categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ['addons-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addons')
        .select(`
          *,
          addon_categories (name)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: menuItems } = useQuery({
    queryKey: ['menu-items-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, title, category')
        .order('category');
      if (error) throw error;
      return data;
    },
  });

  const { data: existingLinks } = useQuery({
    queryKey: ['menu-item-addons-admin', linkForm.addonId],
    queryFn: async () => {
      if (!linkForm.addonId) return [];
      const { data, error } = await supabase
        .from('menu_item_addons')
        .select('menu_item_id')
        .eq('addon_id', linkForm.addonId);
      if (error) throw error;
      return data.map(d => d.menu_item_id);
    },
    enabled: !!linkForm.addonId,
  });

  // Mutations
  const createAddonMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('addons').insert({
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        addon_category_id: data.addon_category_id || null,
        max_quantity: parseInt(data.max_quantity) || 5,
        is_available: data.is_available,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons-admin'] });
      toast.success('Add-on created!');
      setIsAddonModalOpen(false);
      resetAddonForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateAddonMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('addons')
        .update({
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price) || 0,
          addon_category_id: data.addon_category_id || null,
          max_quantity: parseInt(data.max_quantity) || 5,
          is_available: data.is_available,
        })
        .eq('id', selectedAddon.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons-admin'] });
      toast.success('Add-on updated!');
      setIsAddonModalOpen(false);
      setSelectedAddon(null);
      resetAddonForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons-admin'] });
      toast.success('Add-on deleted!');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('addon_categories').insert({
        name: data.name,
        description: data.description || null,
        display_order: parseInt(data.display_order) || 0,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-categories-admin'] });
      toast.success('Category created!');
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('addon_categories')
        .update({
          name: data.name,
          description: data.description || null,
          display_order: parseInt(data.display_order) || 0,
          is_active: data.is_active,
        })
        .eq('id', selectedCategory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-categories-admin'] });
      toast.success('Category updated!');
      setIsCategoryModalOpen(false);
      setSelectedCategory(null);
      resetCategoryForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addon_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-categories-admin'] });
      toast.success('Category deleted!');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateLinksMutation = useMutation({
    mutationFn: async (data: { addonId: string; menuItemIds: string[] }) => {
      // Delete existing links
      await supabase
        .from('menu_item_addons')
        .delete()
        .eq('addon_id', data.addonId);

      // Create new links
      if (data.menuItemIds.length > 0) {
        const links = data.menuItemIds.map(menuItemId => ({
          addon_id: data.addonId,
          menu_item_id: menuItemId,
        }));
        const { error } = await supabase.from('menu_item_addons').insert(links);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-item-addons-admin'] });
      toast.success('Links updated!');
      setIsLinkModalOpen(false);
      setLinkForm({ addonId: '', menuItemIds: [] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetAddonForm = () => {
    setAddonForm({
      name: '',
      description: '',
      price: '',
      addon_category_id: '',
      max_quantity: '5',
      is_available: true,
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: '0',
      is_active: true,
    });
  };

  const handleEditAddon = (addon: any) => {
    setSelectedAddon(addon);
    setAddonForm({
      name: addon.name,
      description: addon.description || '',
      price: addon.price.toString(),
      addon_category_id: addon.addon_category_id || '',
      max_quantity: addon.max_quantity?.toString() || '5',
      is_available: addon.is_available ?? true,
    });
    setIsAddonModalOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order?.toString() || '0',
      is_active: category.is_active ?? true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleLinkAddon = (addon: any) => {
    setLinkForm({
      addonId: addon.id,
      menuItemIds: [],
    });
    setIsLinkModalOpen(true);
  };

  const handleSubmitAddon = () => {
    if (!addonForm.name || !addonForm.price) {
      toast.error('Please fill in required fields');
      return;
    }
    if (selectedAddon) {
      updateAddonMutation.mutate(addonForm);
    } else {
      createAddonMutation.mutate(addonForm);
    }
  };

  const handleSubmitCategory = () => {
    if (!categoryForm.name) {
      toast.error('Please enter a category name');
      return;
    }
    if (selectedCategory) {
      updateCategoryMutation.mutate(categoryForm);
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleSubmitLinks = () => {
    updateLinksMutation.mutate(linkForm);
  };

  const toggleMenuItemLink = (menuItemId: string) => {
    setLinkForm(prev => ({
      ...prev,
      menuItemIds: prev.menuItemIds.includes(menuItemId)
        ? prev.menuItemIds.filter(id => id !== menuItemId)
        : [...prev.menuItemIds, menuItemId],
    }));
  };

  // Initialize link form with existing links when data loads
  React.useEffect(() => {
    if (existingLinks && linkForm.addonId) {
      setLinkForm(prev => ({
        ...prev,
        menuItemIds: existingLinks,
      }));
    }
  }, [existingLinks]);

  const filteredAddons = addons?.filter(addon =>
    addon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Add-ons Management</h1>
          <p className="text-muted-foreground">Manage menu add-ons and extras</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Add-ons Tab */}
        <TabsContent value="addons" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search add-ons..."
                className="input-styled pl-12"
              />
            </div>
            <Button
              onClick={() => {
                resetAddonForm();
                setSelectedAddon(null);
                setIsAddonModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>

          {addonsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAddons?.map((addon) => (
                <div key={addon.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{addon.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {addon.addon_categories?.name || 'No category'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      addon.is_available 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {addon.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  {addon.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {addon.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-secondary">
                      +${Number(addon.price).toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleLinkAddon(addon)}
                        title="Link to menu items"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditAddon(addon)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm('Delete this add-on?')) {
                            deleteAddonMutation.mutate(addon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetCategoryForm();
                setSelectedCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="btn-primary"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {categoriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {addonCategories?.map((category) => (
                <div key={category.id} className="card-elevated p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Order: {category.display_order}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.is_active 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm('Delete this category?')) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add-on Modal */}
      <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{selectedAddon ? 'Edit Add-on' : 'Add New Add-on'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={addonForm.name}
                onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                placeholder="e.g., Extra Cheese"
                className="input-styled"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={addonForm.description}
                onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                placeholder="Short description..."
                className="input-styled"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    placeholder="0.00"
                    className="input-styled pl-8"
                  />
                </div>
              </div>
              <div>
                <Label>Max Qty</Label>
                <Input
                  type="number"
                  value={addonForm.max_quantity}
                  onChange={(e) => setAddonForm({ ...addonForm, max_quantity: e.target.value })}
                  className="input-styled"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={addonForm.addon_category_id}
                onValueChange={(v) => setAddonForm({ ...addonForm, addon_category_id: v })}
              >
                <SelectTrigger className="input-styled">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {addonCategories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Available</Label>
              <Switch
                checked={addonForm.is_available}
                onCheckedChange={(v) => setAddonForm({ ...addonForm, is_available: v })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAddonModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={handleSubmitAddon}
                disabled={createAddonMutation.isPending || updateAddonMutation.isPending}
              >
                {selectedAddon ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Sauces"
                className="input-styled"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Short description..."
                className="input-styled"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
                className="input-styled"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={handleSubmitCategory}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {selectedCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-lg bg-card max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Add-on to Menu Items</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {menuItems?.reduce((acc: any[], item: any) => {
              const lastCategory = acc[acc.length - 1];
              if (!lastCategory || lastCategory.category !== item.category) {
                acc.push({ type: 'header', category: item.category });
              }
              acc.push({ type: 'item', ...item });
              return acc;
            }, []).map((row: any, i: number) => {
              if (row.type === 'header') {
                return (
                  <div key={`header-${row.category}`} className="pt-4 pb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">{row.category}</h4>
                  </div>
                );
              }
              return (
                <label
                  key={row.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    linkForm.menuItemIds.includes(row.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    checked={linkForm.menuItemIds.includes(row.id)}
                    onCheckedChange={() => toggleMenuItemLink(row.id)}
                  />
                  <span className="font-medium">{row.title}</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsLinkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 btn-primary"
              onClick={handleSubmitLinks}
              disabled={updateLinksMutation.isPending}
            >
              Save Links ({linkForm.menuItemIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddonsManagement;

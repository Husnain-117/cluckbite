import React from 'react';
import { Plus, Trash2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MealComponent {
  category: string;
  quantity: number;
  required: boolean;
  label: string;
  upgradeable?: boolean;
}

export interface MealUpgrade {
  from_category: string;
  to_categories: string[];
  price_diff: number;
  label: string;
}

export interface MealConfig {
  components: MealComponent[];
  upgrades: MealUpgrade[];
  extras?: { item: string; included: boolean }[];
}

interface MealConfigEditorProps {
  config: MealConfig;
  onChange: (config: MealConfig) => void;
  categories: { id: string; name: string }[];
}

const MealConfigEditor = ({ config, onChange, categories: propCategories }: MealConfigEditorProps) => {
  // Fetch categories from database
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['meal-config-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Also fetch addon categories (for sauces, etc.)
  const { data: addonCategories = [] } = useQuery({
    queryKey: ['meal-config-addon-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Combine menu categories and addon categories for component selection
  const allCategories = React.useMemo(() => {
    const menuCats = dbCategories.map(c => ({ id: c.id, name: c.name, type: 'menu' as const }));
    const addonCats = addonCategories.map(c => ({ id: c.id, name: c.name, type: 'addon' as const }));
    return [...menuCats, ...addonCats];
  }, [dbCategories, addonCategories]);

  // Get categories that are used as components (for "From Category" in upgrades)
  const componentCategories = React.useMemo(() => {
    return config.components
      .filter(c => c.category && c.upgradeable)
      .map(c => c.category);
  }, [config.components]);

  // Get categories available as upgrade targets (all categories except "Meals" itself)
  const upgradeTargetCategories = React.useMemo(() => {
    return allCategories.filter(c => c.name.toLowerCase() !== 'meals');
  }, [allCategories]);

  const addComponent = () => {
    onChange({
      ...config,
      components: [
        ...config.components,
        { category: '', quantity: 1, required: true, label: '' },
      ],
    });
  };

  const updateComponent = (index: number, updates: Partial<MealComponent>) => {
    const newComponents = [...config.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    onChange({ ...config, components: newComponents });
  };

  const removeComponent = (index: number) => {
    const removedCategory = config.components[index]?.category;
    const newComponents = config.components.filter((_, i) => i !== index);
    // Also clean up any upgrades referencing this component
    const newUpgrades = config.upgrades.filter(u => u.from_category !== removedCategory);
    onChange({ ...config, components: newComponents, upgrades: newUpgrades });
  };

  const addUpgrade = () => {
    onChange({
      ...config,
      upgrades: [
        ...config.upgrades,
        { from_category: '', to_categories: [], price_diff: 2, label: 'Upgrade' },
      ],
    });
  };

  const updateUpgrade = (index: number, updates: Partial<MealUpgrade>) => {
    const newUpgrades = [...config.upgrades];
    newUpgrades[index] = { ...newUpgrades[index], ...updates };
    onChange({ ...config, upgrades: newUpgrades });
  };

  const removeUpgrade = (index: number) => {
    const newUpgrades = config.upgrades.filter((_, i) => i !== index);
    onChange({ ...config, upgrades: newUpgrades });
  };

  const toggleToCategory = (upgradeIndex: number, category: string) => {
    const upgrade = config.upgrades[upgradeIndex];
    const toCategories = upgrade.to_categories.includes(category)
      ? upgrade.to_categories.filter(c => c !== category)
      : [...upgrade.to_categories, category];
    updateUpgrade(upgradeIndex, { to_categories: toCategories });
  };

  return (
    <div className="space-y-6 p-4 bg-muted/50 rounded-xl">
      {/* Components Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Meal Components</Label>
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus className="h-4 w-4 mr-1" />
            Add Component
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Define what items are included in this meal. Each component becomes a selection step when ordering.
        </p>
        
        <div className="space-y-3">
          {config.components.map((component, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={component.category}
                  onValueChange={(value) => {
                    const updates: Partial<MealComponent> = { category: value };
                    if (!component.label) updates.label = value;
                    updateComponent(index, updates);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.length > 0 ? (
                      <>
                        {dbCategories.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Menu Categories</div>
                            {dbCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </>
                        )}
                        {addonCategories.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Add-on Categories</div>
                            {addonCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={component.quantity}
                  onChange={(e) => updateComponent(index, { quantity: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              
              <div className="flex-1 min-w-[120px]">
                <Label className="text-xs text-muted-foreground">Label (shown to user)</Label>
                <Input
                  value={component.label}
                  onChange={(e) => updateComponent(index, { label: e.target.value })}
                  placeholder="e.g., Burger, Drink, Sauce"
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={component.required}
                    onCheckedChange={(v) => updateComponent(index, { required: v })}
                  />
                  <Label className="text-xs">Required</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={component.upgradeable || false}
                    onCheckedChange={(v) => updateComponent(index, { upgradeable: v })}
                  />
                  <Label className="text-xs">Upgradeable</Label>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeComponent(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {config.components.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No components added. Click "Add Component" to start building this meal.
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Upgrades Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-primary" />
            <Label className="text-base font-semibold">Upgrade Options</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUpgrade}
            disabled={componentCategories.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Upgrade
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Allow customers to upgrade items (e.g., Sides → Wings for extra £2). 
          {componentCategories.length === 0 && (
            <span className="text-yellow-500 block mt-1">
              ⚠️ Mark at least one component as "Upgradeable" to create upgrade options.
            </span>
          )}
        </p>
        
        <div className="space-y-3">
          {config.upgrades.map((upgrade, index) => (
            <div key={index} className="p-4 bg-background rounded-lg border border-border space-y-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">From (Upgradeable Component)</Label>
                  <Select
                    value={upgrade.from_category}
                    onValueChange={(v) => {
                      // Auto-fill label when selecting
                      const autoLabel = `Upgrade from ${v}`;
                      updateUpgrade(index, { 
                        from_category: v, 
                        label: upgrade.label === 'Upgrade' ? autoLabel : upgrade.label 
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select component..." />
                    </SelectTrigger>
                    <SelectContent>
                      {componentCategories.length > 0 ? (
                        componentCategories.map(catName => (
                          <SelectItem key={catName} value={catName}>{catName}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No upgradeable components</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Extra Cost (£)</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={upgrade.price_diff}
                    onChange={(e) => updateUpgrade(index, { price_diff: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input
                    value={upgrade.label}
                    onChange={(e) => updateUpgrade(index, { label: e.target.value })}
                    placeholder="e.g., Upgrade to Wings"
                    className="mt-1"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUpgrade(index)}
                  className="text-destructive hover:text-destructive mt-5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Upgrade To (select target categories):
                </Label>
                <div className="flex flex-wrap gap-2">
                  {upgradeTargetCategories
                    .filter(c => c.name !== upgrade.from_category)
                    .map(cat => (
                      <Badge
                        key={cat.id}
                        variant={upgrade.to_categories.includes(cat.name) ? 'default' : 'outline'}
                        className="cursor-pointer select-none transition-colors"
                        onClick={() => toggleToCategory(index, cat.name)}
                      >
                        {cat.name}
                        {cat.type === 'addon' && <span className="ml-1 opacity-60 text-[10px]">(addon)</span>}
                      </Badge>
                    ))}
                  {upgradeTargetCategories.filter(c => c.name !== upgrade.from_category).length === 0 && (
                    <span className="text-xs text-muted-foreground">No target categories available</span>
                  )}
                </div>
                {upgrade.to_categories.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Customer can upgrade <strong>{upgrade.from_category || '...'}</strong> to{' '}
                    <strong>{upgrade.to_categories.join(', ')}</strong> for +£{upgrade.price_diff.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {config.upgrades.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No upgrade options. Customers will only see the base options.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealConfigEditor;

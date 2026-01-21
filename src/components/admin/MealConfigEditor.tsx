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

const availableCategories = [
  'Chicken Burgers',
  'Smash Burgers',
  'Wrap',
  'Fries',
  'Drinks',
  'Tenders & Wings',
  'Sides',
  'Doner',
  'Rice Bowl',
  'Dessert',
];

const MealConfigEditor = ({ config, onChange, categories }: MealConfigEditorProps) => {
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
    const newComponents = config.components.filter((_, i) => i !== index);
    onChange({ ...config, components: newComponents });
  };

  const addUpgrade = () => {
    onChange({
      ...config,
      upgrades: [
        ...config.upgrades,
        { from_category: 'Fries', to_categories: ['Tenders & Wings'], price_diff: 2, label: 'Upgrade' },
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
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Meal Components</Label>
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus className="h-4 w-4 mr-1" />
            Add Component
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Define what items are included in this meal deal. For multiple categories, separate with comma (e.g., "Chicken Burgers,Smash Burgers")
        </p>
        
        <div className="space-y-3">
          {config.components.map((component, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Categories (comma-separated)</Label>
                <Input
                  value={component.category}
                  onChange={(e) => updateComponent(index, { category: e.target.value })}
                  placeholder="e.g., Chicken Burgers,Smash Burgers"
                  className="mt-1"
                />
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
                  placeholder="e.g., Burger, Drink"
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-primary" />
            <Label className="text-base font-semibold">Upgrade Options</Label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addUpgrade}>
            <Plus className="h-4 w-4 mr-1" />
            Add Upgrade
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Allow customers to upgrade items (e.g., Fries → Wings for extra £2)
        </p>
        
        <div className="space-y-3">
          {config.upgrades.map((upgrade, index) => (
            <div key={index} className="p-3 bg-background rounded-lg border border-border space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <Label className="text-xs text-muted-foreground">From Category</Label>
                  <Select
                    value={upgrade.from_category}
                    onValueChange={(v) => updateUpgrade(index, { from_category: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
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
                  className="text-destructive hover:text-destructive self-end"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Upgrade To (select categories):</Label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.filter(c => c !== upgrade.from_category).map(cat => (
                    <Badge
                      key={cat}
                      variant={upgrade.to_categories.includes(cat) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleToCategory(index, cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
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

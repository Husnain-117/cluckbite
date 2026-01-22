import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronRight, ChevronLeft, Sparkles, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Updated to support multiple selections per component
export interface MealSelection {
  // Key is component index, value is array of selected items
  selections: Record<number, any[]>;
  upgrades: { componentIndex: number; item: any; priceDiff: number }[];
}

interface MealComponent {
  category: string;
  quantity: number;
  required: boolean;
  label: string;
  upgradeable?: boolean;
}

interface MealUpgrade {
  from_category: string;
  to_categories: string[];
  price_diff: number;
  label: string;
}

interface MealConfig {
  components: MealComponent[];
  upgrades: MealUpgrade[];
  extras?: { item: string; included: boolean }[];
}

interface MealBuilderModalProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (meal: any, selections: MealSelection, totalPrice: number) => void;
}

const categoryEmojis: Record<string, string> = {
  'Chicken Burgers': '🍔',
  'Smash Burgers': '🍔',
  'Fries': '🍟',
  'Drinks': '🥤',
  'Tenders & Wings': '🍗',
  'Sides': '🍟',
  'Wrap': '🌯',
  'Doner': '🥙',
  'Rice Bowl': '🍚',
  'Dessert': '🍰',
};

const MealBuilderModal = ({ meal, isOpen, onClose, onAddToCart }: MealBuilderModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('0');
  const [showUpgradePanel, setShowUpgradePanel] = useState<number | null>(null);
  const [selection, setSelection] = useState<MealSelection>({
    selections: {},
    upgrades: [],
  });

  // Parse meal config from database
  const mealConfig: MealConfig | null = useMemo(() => {
    if (!meal?.meal_config) {
      // Fallback for meals without config
      return {
        components: [
          { category: 'Chicken Burgers', quantity: 1, required: true, label: 'Burger' },
          { category: 'Fries', quantity: 1, required: true, label: 'Side', upgradeable: true },
          { category: 'Drinks', quantity: 1, required: true, label: 'Drink' },
        ],
        upgrades: [
          { from_category: 'Fries', to_categories: ['Tenders & Wings'], price_diff: 2, label: 'Upgrade to Wings/Tenders' }
        ]
      };
    }
    return meal.meal_config as MealConfig;
  }, [meal?.meal_config]);

  // Fetch menu items for building meals
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items-for-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .neq('category', 'Meals')
        .order('title', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    menuItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [menuItems]);

  // Get items for a component (supports comma-separated categories)
  const getItemsForComponent = (component: MealComponent) => {
    const categories = component.category.split(',').map(c => c.trim());
    const items: any[] = [];
    categories.forEach(cat => {
      if (itemsByCategory[cat]) {
        items.push(...itemsByCategory[cat]);
      }
    });
    return items;
  };

  // Get upgrade items for a component
  const getUpgradeItems = (componentIndex: number) => {
    if (!mealConfig) return [];
    const component = mealConfig.components[componentIndex];
    const upgrade = mealConfig.upgrades.find(u => 
      component.category.split(',').map(c => c.trim()).includes(u.from_category)
    );
    if (!upgrade) return [];
    
    const items: any[] = [];
    upgrade.to_categories.forEach(cat => {
      if (itemsByCategory[cat]) {
        items.push(...itemsByCategory[cat]);
      }
    });
    return { items, priceDiff: upgrade.price_diff };
  };

  // Calculate total price
  const calculateTotal = () => {
    let total = Number(meal?.price || 0);
    selection.upgrades.forEach(u => {
      total += u.priceDiff;
    });
    return total * quantity;
  };

  // Handle item selection
  const handleSelectItem = (componentIndex: number, item: any, isUpgrade: boolean = false, priceDiff: number = 0) => {
    const component = mealConfig?.components[componentIndex];
    if (!component) return;

    const currentSelections = selection.selections[componentIndex] || [];
    const isAlreadySelected = currentSelections.some(s => s.id === item.id);

    if (isAlreadySelected) {
      // Remove the item
      const newSelections = currentSelections.filter(s => s.id !== item.id);
      setSelection(prev => ({
        ...prev,
        selections: { ...prev.selections, [componentIndex]: newSelections },
        upgrades: isUpgrade ? prev.upgrades.filter(u => u.item.id !== item.id) : prev.upgrades,
      }));
    } else {
      // Add the item (if we haven't reached max quantity)
      if (currentSelections.length < component.quantity) {
        const newSelections = [...currentSelections, item];
        setSelection(prev => ({
          ...prev,
          selections: { ...prev.selections, [componentIndex]: newSelections },
          upgrades: isUpgrade 
            ? [...prev.upgrades, { componentIndex, item, priceDiff }]
            : prev.upgrades,
        }));
      } else if (component.quantity === 1) {
        // Replace single selection
        setSelection(prev => ({
          ...prev,
          selections: { ...prev.selections, [componentIndex]: [item] },
          upgrades: isUpgrade 
            ? [...prev.upgrades.filter(u => u.componentIndex !== componentIndex), { componentIndex, item, priceDiff }]
            : prev.upgrades.filter(u => u.componentIndex !== componentIndex),
        }));
      }
    }
  };

  // Check if component is complete
  const isComponentComplete = (componentIndex: number) => {
    const component = mealConfig?.components[componentIndex];
    if (!component) return false;
    const selections = selection.selections[componentIndex] || [];
    return selections.length >= component.quantity || !component.required;
  };

  // Check if all required components are complete
  const canAddToCart = () => {
    if (!mealConfig) return false;
    return mealConfig.components.every((component, index) => {
      if (!component.required) return true;
      const selections = selection.selections[index] || [];
      return selections.length >= component.quantity;
    });
  };

  // Handle add to cart
  const handleAddToCart = () => {
    onAddToCart(meal, selection, calculateTotal());
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setQuantity(1);
    setActiveTab('0');
    setShowUpgradePanel(null);
    setSelection({ selections: {}, upgrades: [] });
    onClose();
  };

  // Reset when meal changes
  useEffect(() => {
    if (isOpen && meal) {
      setActiveTab('0');
      setShowUpgradePanel(null);
      setSelection({ selections: {}, upgrades: [] });
    }
  }, [isOpen, meal?.id]);

  if (!meal || !mealConfig) return null;

  const getSelectionCount = (componentIndex: number) => {
    return (selection.selections[componentIndex] || []).length;
  };

  const getRequiredCount = (componentIndex: number) => {
    return mealConfig.components[componentIndex]?.quantity || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-heading flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {meal.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Build your {meal.title} meal by selecting items from each category
              </DialogDescription>
              <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              £{Number(meal.price).toFixed(2)}
            </Badge>
          </div>

          {/* Extras included */}
          {mealConfig.extras && mealConfig.extras.length > 0 && (
            <div className="flex gap-2 mt-2">
              {mealConfig.extras.filter(e => e.included).map((extra, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  ✓ {extra.item} included
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Tabs for each component */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2">
            <TabsList className="w-full flex gap-1 bg-muted/50 p-1 h-auto flex-wrap">
              {mealConfig.components.map((component, index) => {
                const count = getSelectionCount(index);
                const required = getRequiredCount(index);
                const isComplete = count >= required;
                
                return (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    className={`flex-1 min-w-[100px] py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
                      isComplete ? 'border-green-500' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-medium">{component.label}</span>
                      <span className={`text-xs ${isComplete ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {count}/{required} selected
                      </span>
                    </div>
                  </TabsTrigger>
                );
              })}
              
              {/* Upgrade Tab */}
              {mealConfig.upgrades.length > 0 && (
                <TabsTrigger
                  value="upgrades"
                  className="flex-1 min-w-[100px] py-2 px-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs">Upgrades</span>
                  </div>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Component Content */}
          {mealConfig.components.map((component, index) => {
            const items = getItemsForComponent(component);
            const selectedItems = selection.selections[index] || [];
            const required = component.quantity;

            return (
              <TabsContent
                key={index}
                value={String(index)}
                className="flex-1 overflow-hidden m-0 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    Choose {required} {component.label}{required > 1 ? 's' : ''}
                  </h3>
                  {!component.required && (
                    <Badge variant="outline">Optional</Badge>
                  )}
                </div>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map((item) => {
                      const isSelected = selectedItems.some(s => s.id === item.id);

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(index, item)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{categoryEmojis[item.category] || '🍽️'}</span>
                            {isSelected && (
                              <div className="ml-auto bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.description}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}

          {/* Upgrades Tab */}
          <TabsContent value="upgrades" className="flex-1 overflow-hidden m-0 p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-primary" />
              Upgrade Your Meal
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Want to swap your fries for wings or tenders? Select an upgrade below!
            </p>

            <ScrollArea className="h-[300px] pr-4">
              {mealConfig.upgrades.map((upgrade, upgradeIndex) => {
                const upgradeItems: any[] = [];
                upgrade.to_categories.forEach(cat => {
                  if (itemsByCategory[cat]) {
                    upgradeItems.push(...itemsByCategory[cat]);
                  }
                });

                const hasUpgradeSelected = selection.upgrades.some(
                  u => upgrade.to_categories.some(cat => 
                    u.item.category === cat
                  )
                );

                return (
                  <div key={upgradeIndex} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">
                        {upgrade.from_category} → {upgrade.to_categories.join(' / ')}
                      </Badge>
                      <Badge variant="outline" className="text-secondary">
                        +£{upgrade.price_diff.toFixed(2)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {upgradeItems.map((item) => {
                        const isSelected = selection.upgrades.some(u => u.item.id === item.id);
                        const componentIndex = mealConfig.components.findIndex(c => 
                          c.category.split(',').map(cat => cat.trim()).includes(upgrade.from_category)
                        );

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(componentIndex, item, true, upgrade.price_diff)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-secondary bg-secondary/10'
                                : 'border-border hover:border-secondary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{categoryEmojis[item.category] || '🍽️'}</span>
                              {isSelected && (
                                <div className="ml-auto bg-secondary text-secondary-foreground rounded-full p-1">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                            <p className="text-xs text-secondary font-medium mt-1">
                              +£{upgrade.price_diff.toFixed(2)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {mealConfig.upgrades.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upgrades available for this meal.
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Selection Summary */}
          <div className="flex flex-wrap gap-2">
            {mealConfig.components.map((component, index) => {
              const selections = selection.selections[index] || [];
              return selections.map((item, itemIndex) => {
                const isUpgrade = selection.upgrades.some(u => u.item.id === item.id);
                return (
                  <Badge key={`${index}-${itemIndex}`} variant="outline" className="gap-1">
                    {categoryEmojis[item.category] || '🍽️'} {item.title}
                    {isUpgrade && <span className="text-secondary ml-1">+£2</span>}
                  </Badge>
                );
              });
            })}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Quantity</span>
            <div className="flex items-center gap-3 bg-muted rounded-full p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Incomplete warning */}
          {!canAddToCart() && (
            <p className="text-sm text-destructive text-center">
              Please complete all required selections
            </p>
          )}

          {/* Add to Cart */}
          <Button
            onClick={handleAddToCart}
            disabled={!canAddToCart()}
            className="w-full btn-primary py-6 text-lg"
          >
            Add to Cart • £{calculateTotal().toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MealBuilderModal;

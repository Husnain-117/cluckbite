import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Info, AlertTriangle, Flame, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ItemDetailsModalProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any, addons: SelectedAddon[], totalPrice: number) => void;
}

// Categories that should show sauces
const SAUCE_CATEGORIES = ['Doner'];

// Addon category display config
const ADDON_TAB_CONFIG = {
  'Sauces': { emoji: '🥫', showFor: ['Doner'] },
  'Extra Toppings': { emoji: '🧅', showFor: 'all' },
  'Cheese Options': { emoji: '🧀', showFor: 'all' },
  'Protein Add-ons': { emoji: '🍖', showFor: 'all' },
  'Drinks Upgrades': { emoji: '🥤', showFor: 'all' },
};

const ItemDetailsModal = ({ item, isOpen, onClose, onAddToCart }: ItemDetailsModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('info');

  // Check if this item should show sauces
  const shouldShowSauces = useMemo(() => {
    if (!item?.category) return false;
    return SAUCE_CATEGORIES.includes(item.category);
  }, [item?.category]);

  // Fetch add-ons for this menu item
  const { data: addonsData, isLoading: addonsLoading } = useQuery({
    queryKey: ['menu-item-addons', item?.id],
    queryFn: async () => {
      if (!item?.id) return { addons: [], categories: [] };
      
      // Get all addons linked to this menu item
      const { data: menuItemAddons, error: linkError } = await supabase
        .from('menu_item_addons')
        .select(`
          addon_id,
          is_default,
          addons (
            id,
            name,
            description,
            price,
            max_quantity,
            addon_category_id,
            addon_categories (
              id,
              name,
              display_order
            )
          )
        `)
        .eq('menu_item_id', item.id);

      if (linkError) throw linkError;

      // Get unique categories from the addons
      const categories: { id: string; name: string; display_order: number }[] = [];
      const addons: any[] = [];

      menuItemAddons?.forEach((mia: any) => {
        if (mia.addons) {
          addons.push({
            ...mia.addons,
            is_default: mia.is_default,
          });
          
          if (mia.addons.addon_categories) {
            const cat = mia.addons.addon_categories;
            if (!categories.find(c => c.id === cat.id)) {
              categories.push({
                id: cat.id,
                name: cat.name,
                display_order: cat.display_order,
              });
            }
          }
        }
      });

      // Sort categories by display_order
      categories.sort((a, b) => a.display_order - b.display_order);

      return { addons, categories };
    },
    enabled: !!item?.id && isOpen,
  });

  // Group addons by category and filter based on item category
  const addonsByCategory = useMemo(() => {
    if (!addonsData?.addons || !addonsData?.categories) return {};
    
    const grouped: Record<string, any[]> = {};
    addonsData.categories.forEach(cat => {
      // Check if this category should be shown for this item
      const config = ADDON_TAB_CONFIG[cat.name as keyof typeof ADDON_TAB_CONFIG];
      if (config) {
        // If it's Sauces, only show for Doner items
        if (cat.name === 'Sauces' && !shouldShowSauces) {
          return;
        }
      }
      
      const categoryAddons = addonsData.addons.filter(
        addon => addon.addon_category_id === cat.id
      );
      
      if (categoryAddons.length > 0) {
        grouped[cat.name] = categoryAddons;
      }
    });
    return grouped;
  }, [addonsData, shouldShowSauces]);

  // Get available tabs
  const availableTabs = useMemo(() => {
    const tabs = Object.keys(addonsByCategory);
    return tabs;
  }, [addonsByCategory]);

  // Calculate totals
  const addonsTotal = useMemo(() => {
    return Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
      const addon = addonsData?.addons?.find(a => a.id === addonId);
      return sum + (addon?.price || 0) * qty;
    }, 0);
  }, [selectedAddons, addonsData]);

  const itemTotal = (Number(item?.price) * quantity) + (addonsTotal * quantity);

  const handleAddonQuantity = (addonId: string, change: number, maxQty: number) => {
    setSelectedAddons(prev => {
      const current = prev[addonId] || 0;
      const newQty = Math.max(0, Math.min(maxQty, current + change));
      
      if (newQty === 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [addonId]: newQty };
    });
  };

  const handleAddToCart = () => {
    const addons: SelectedAddon[] = Object.entries(selectedAddons).map(([addonId, qty]) => {
      const addon = addonsData?.addons?.find(a => a.id === addonId);
      return {
        id: addonId,
        name: addon?.name || '',
        price: addon?.price || 0,
        quantity: qty,
      };
    });

    onAddToCart(
      { ...item, quantity },
      addons,
      itemTotal
    );
    
    // Reset state
    setQuantity(1);
    setSelectedAddons({});
    setActiveTab('info');
    onClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setSelectedAddons({});
    setActiveTab('info');
    onClose();
  };

  const handleSkipAddons = () => {
    // Skip directly to add to cart with no addons
    onAddToCart(
      { ...item, quantity },
      [],
      Number(item?.price) * quantity
    );
    
    setQuantity(1);
    setSelectedAddons({});
    setActiveTab('info');
    onClose();
  };

  if (!item) return null;

  // Parse nutritional info
  const nutritionalInfo = item.nutritional_info || {};
  const ingredients = item.ingredients || [];
  const allergens = item.allergens || [];

  const hasAddons = availableTabs.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-card">
        <DialogHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-heading">{item.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Customize your {item.title} with add-ons and extras
              </DialogDescription>
              <p className="text-secondary font-bold text-lg mt-1">
                £{Number(item.price).toFixed(2)}
              </p>
            </div>
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {/* Ingredients & Allergens Section */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="info" className="border-b-0">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-medium">Ingredients and allergens</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-2">
                  {/* Allergens */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-sm">Allergens</span>
                    </div>
                    {allergens.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allergens.map((allergen: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Ask a staff member</p>
                    )}
                  </div>

                  {/* Ingredients */}
                  <div>
                    <p className="font-medium text-sm mb-2">Ingredients</p>
                    {ingredients.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {ingredients.join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Ask a staff member</p>
                    )}
                  </div>

                  {/* Calories / Nutritional Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">Calories</span>
                    </div>
                    {nutritionalInfo.calories ? (
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-full">
                          {nutritionalInfo.calories} kcal
                        </span>
                        {nutritionalInfo.protein && (
                          <span className="px-2 py-1 bg-muted rounded-full">
                            Protein: {nutritionalInfo.protein}
                          </span>
                        )}
                        {nutritionalInfo.carbs && (
                          <span className="px-2 py-1 bg-muted rounded-full">
                            Carbs: {nutritionalInfo.carbs}
                          </span>
                        )}
                        {nutritionalInfo.fat && (
                          <span className="px-2 py-1 bg-muted rounded-full">
                            Fat: {nutritionalInfo.fat}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Ask a staff member</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Add-ons Section - Tabbed */}
          {addonsLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : hasAddons ? (
            <div className="py-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                  {availableTabs.map((tabName) => {
                    const config = ADDON_TAB_CONFIG[tabName as keyof typeof ADDON_TAB_CONFIG];
                    const emoji = config?.emoji || '➕';
                    const count = Object.entries(selectedAddons).filter(([id, qty]) => 
                      addonsByCategory[tabName]?.some(a => a.id === id && qty > 0)
                    ).length;
                    
                    return (
                      <TabsTrigger 
                        key={tabName} 
                        value={tabName}
                        className="flex-1 min-w-fit text-xs px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {emoji} {tabName.replace(' Add-ons', '').replace(' Options', '')}
                        {count > 0 && (
                          <span className="ml-1 bg-secondary text-secondary-foreground rounded-full px-1.5 text-[10px]">
                            {count}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                {availableTabs.map((tabName) => (
                  <TabsContent key={tabName} value={tabName} className="mt-3">
                    <div className="space-y-2">
                      {addonsByCategory[tabName]?.map((addon: any) => {
                        const currentQty = selectedAddons[addon.id] || 0;
                        
                        return (
                          <div
                            key={addon.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              currentQty > 0 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{addon.name}</p>
                              {addon.description && (
                                <p className="text-xs text-muted-foreground">{addon.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-secondary">
                                +£{Number(addon.price).toFixed(2)}
                              </span>
                              
                              {currentQty === 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  onClick={() => handleAddonQuantity(addon.id, 1, addon.max_quantity)}
                                >
                                  Add
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => handleAddonQuantity(addon.id, -1, addon.max_quantity)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-5 text-center text-sm font-semibold">
                                    {currentQty}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => handleAddonQuantity(addon.id, 1, addon.max_quantity)}
                                    disabled={currentQty >= addon.max_quantity}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
              {/* Skip button */}
              <Button
                variant="ghost"
                className="w-full mt-3 text-muted-foreground"
                onClick={handleSkipAddons}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip extras & add to cart
              </Button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 mt-2">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-4">
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

          {/* Add-ons Summary */}
          {addonsTotal > 0 && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Add-ons</span>
              <span>+£{(addonsTotal * quantity).toFixed(2)}</span>
            </div>
          )}

          {/* Add to Cart Button */}
          <Button 
            onClick={handleAddToCart} 
            className="w-full btn-primary py-6 text-lg"
          >
            Add to Cart • £{itemTotal.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailsModal;

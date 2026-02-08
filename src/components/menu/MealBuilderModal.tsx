import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronRight, ChevronLeft, Sparkles, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MealSelection {
  burgers: { item: any; quantity: number }[];
  drinks: { item: any; quantity: number }[];
  sides: { item: any; quantity: number }[];
  upgrades: { category: string; item: any; priceDiff: number; quantity: number }[];
  // New: generic selections by step index
  selections: Record<number, { item: any; quantity: number }[]>;
}

interface MealBuilderModalProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (meal: any, selections: MealSelection, totalPrice: number) => void;
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

interface DynamicStep {
  index: number;
  category: string;
  label: string;
  quantity: number;
  required: boolean;
  upgradeable: boolean;
}

interface DynamicMealConfig {
  steps: DynamicStep[];
  upgrades: MealUpgrade[];
}

// Parse meal config from database
const getMealConfig = (meal: any): DynamicMealConfig => {
  const components = meal?.meal_config?.components as MealComponent[] | undefined;
  const upgrades = (meal?.meal_config?.upgrades as MealUpgrade[]) || [];

  // If we have database-defined components, use them
  if (components && components.length > 0) {
    const steps: DynamicStep[] = components.map((comp, idx) => ({
      index: idx,
      category: comp.category || '',
      label: comp.label || comp.category || `Item ${idx + 1}`,
      quantity: comp.quantity || 1,
      required: comp.required !== false,
      upgradeable: comp.upgradeable || false,
    }));

    return { steps, upgrades };
  }

  // Fallback: Create default steps based on title
  const title = (meal?.title || '').toLowerCase();
  
  let burgerCount = 1, sideCount = 1, drinkCount = 1;
  
  if (title.includes('meal for two') || title.includes('for two')) {
    burgerCount = 2; sideCount = 2; drinkCount = 2;
  } else if (title.includes('family')) {
    burgerCount = 4; sideCount = 4; drinkCount = 4;
  }

  const defaultSteps: DynamicStep[] = [
    { index: 0, category: 'Chicken Burgers', label: 'Burger', quantity: burgerCount, required: true, upgradeable: false },
    { index: 1, category: 'Fries', label: 'Side', quantity: sideCount, required: false, upgradeable: true },
    { index: 2, category: 'Drinks', label: 'Drink', quantity: drinkCount, required: false, upgradeable: false },
  ];

  return { steps: defaultSteps, upgrades };
};

const MealBuilderModal = ({ meal, isOpen, onClose, onAddToCart }: MealBuilderModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  // Selection per step index: { stepIndex: { itemId: { item, quantity } } }
  const [selections, setSelections] = useState<Record<number, Record<string, { item: any; quantity: number }>>>({});
  const [upgradeSelections, setUpgradeSelections] = useState<{ stepIndex: number; item: any; priceDiff: number; quantity: number }[]>([]);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);

  const config = useMemo(() => (meal ? getMealConfig(meal) : null), [meal]);

  // Fetch menu items
  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menu-items-for-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('title');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch addons (for addon categories like Sauces)
  const { data: addons = [], isLoading: loadingAddons } = useQuery({
    queryKey: ['addons-for-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addons')
        .select('*, addon_categories(name)')
        .eq('is_available', true);
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const isLoading = loadingMenu || loadingAddons;

  // Group menu items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    menuItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [menuItems]);

  // Group addons by their category name
  const addonsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    addons.forEach(addon => {
      const catName = addon.addon_categories?.name || 'Other';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push({ ...addon, title: addon.name, isAddon: true });
    });
    return grouped;
  }, [addons]);

  // Get items for a specific step based on its category
  const getStepItems = (step: DynamicStep): any[] => {
    const category = step.category;
    if (!category) return [];

    // Check menu items first
    if (itemsByCategory[category]) {
      return itemsByCategory[category];
    }

    // Check addon categories (e.g., "Sauces")
    if (addonsByCategory[category]) {
      return addonsByCategory[category];
    }

    // Fuzzy match - try to find similar category names
    const lowerCat = category.toLowerCase();
    
    // Search in menu items
    for (const [cat, items] of Object.entries(itemsByCategory)) {
      if (cat.toLowerCase().includes(lowerCat) || lowerCat.includes(cat.toLowerCase())) {
        return items;
      }
    }
    
    // Search in addon categories
    for (const [cat, items] of Object.entries(addonsByCategory)) {
      if (cat.toLowerCase().includes(lowerCat) || lowerCat.includes(cat.toLowerCase())) {
        return items;
      }
    }

    return [];
  };

  // Get upgrade items for a step (if upgradeable)
  const getUpgradeItemsForStep = (step: DynamicStep): any[] => {
    if (!step.upgradeable || !config) return [];
    
    // Find upgrade rules that match this step's category
    const upgrade = config.upgrades.find(u => u.from_category === step.category);
    if (!upgrade) {
      // Default: allow upgrade to Tenders & Wings
      return itemsByCategory['Tenders & Wings'] || itemsByCategory['Wings'] || [];
    }

    const items: any[] = [];
    upgrade.to_categories.forEach(toCat => {
      if (itemsByCategory[toCat]) items.push(...itemsByCategory[toCat]);
      if (addonsByCategory[toCat]) items.push(...addonsByCategory[toCat]);
    });
    return items;
  };

  const getSelectedCount = (stepIndex: number): number => {
    const stepSelections = selections[stepIndex] || {};
    return Object.values(stepSelections).reduce((sum, e) => sum + e.quantity, 0);
  };

  const handleAdjustSelection = (stepIndex: number, item: any, delta: number) => {
    const step = config?.steps[stepIndex];
    if (!step) return;

    setSelections(prev => {
      const stepData = prev[stepIndex] || {};
      const currentCount = Object.values(stepData).reduce((sum, e) => sum + e.quantity, 0);
      const limit = step.quantity;

      // Prevent exceeding limit when adding
      if (delta > 0 && currentCount >= limit) return prev;

      const currentQty = stepData[item.id]?.quantity || 0;
      const nextQty = Math.max(0, currentQty + delta);

      const newStepData = { ...stepData };
      if (nextQty === 0) {
        delete newStepData[item.id];
      } else {
        newStepData[item.id] = { item, quantity: nextQty };
      }

      return { ...prev, [stepIndex]: newStepData };
    });
  };

  const handleUpgradeSelection = (stepIndex: number, item: any, priceDiff: number) => {
    const step = config?.steps[stepIndex];
    if (!step) return;

    // Add to selections
    handleAdjustSelection(stepIndex, item, 1);

    // Track upgrade price
    setUpgradeSelections(prev => {
      const existing = prev.findIndex(u => u.stepIndex === stepIndex && u.item?.id === item.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [...prev, { stepIndex, item, priceDiff, quantity: 1 }];
    });

    setShowUpgradePanel(false);
  };

  const calculateTotal = (): number => {
    let total = Number(meal?.price || 0);
    
    // Add upgrade costs
    upgradeSelections.forEach(u => {
      total += u.priceDiff * u.quantity;
    });

    return total * quantity;
  };

  const isStepComplete = (stepIndex: number): boolean => {
    if (!config) return false;
    const step = config.steps[stepIndex];
    if (!step.required) return true;
    return getSelectedCount(stepIndex) >= step.quantity;
  };

  const canProceed = (): boolean => {
    if (!config) return false;
    const step = config.steps[activeStep];
    if (!step.required) return true;
    return getSelectedCount(activeStep) >= step.quantity;
  };

  const isLastStep = (): boolean => {
    if (!config) return false;
    return activeStep === config.steps.length - 1;
  };

  const handleNext = () => {
    if (!config) return;
    if (activeStep < config.steps.length - 1) {
      setActiveStep(activeStep + 1);
      setShowUpgradePanel(false);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setShowUpgradePanel(false);
    }
  };

  const handleSkip = () => {
    if (!config) return;
    setSelections(prev => ({ ...prev, [activeStep]: {} }));
    handleNext();
  };

  const handleAddToCart = () => {
    if (!config) return;

    // Build selection output
    const burgers: { item: any; quantity: number }[] = [];
    const sides: { item: any; quantity: number }[] = [];
    const drinks: { item: any; quantity: number }[] = [];
    const genericSelections: Record<number, { item: any; quantity: number }[]> = {};

    config.steps.forEach((step, idx) => {
      const stepData = selections[idx] || {};
      const items = Object.values(stepData);
      genericSelections[idx] = items;

      // Categorize for backward compatibility
      const lowerLabel = step.label.toLowerCase();
      const lowerCat = step.category.toLowerCase();
      
      if (lowerLabel.includes('burger') || lowerCat.includes('burger') || lowerCat.includes('wrap')) {
        burgers.push(...items);
      } else if (lowerLabel.includes('drink') || lowerCat.includes('drink') || lowerCat.includes('beverage')) {
        drinks.push(...items);
      } else {
        sides.push(...items);
      }
    });

    const normalized: MealSelection = {
      burgers,
      sides,
      drinks,
      upgrades: upgradeSelections.map(u => ({
        category: config.steps[u.stepIndex]?.category || '',
        item: u.item,
        priceDiff: u.priceDiff,
        quantity: u.quantity,
      })),
      selections: genericSelections,
    };

    onAddToCart(meal, normalized, calculateTotal());
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setActiveStep(0);
    setSelections({});
    setUpgradeSelections([]);
    setShowUpgradePanel(false);
    onClose();
  };

  // Reset on meal change
  useEffect(() => {
    if (isOpen && meal) {
      setActiveStep(0);
      setSelections({});
      setUpgradeSelections([]);
      setShowUpgradePanel(false);
    }
  }, [isOpen, meal?.id]);

  if (!meal || !config) return null;

  const currentStep = config.steps[activeStep];
  const currentItems = currentStep ? getStepItems(currentStep) : [];
  const upgradeItems = currentStep ? getUpgradeItemsForStep(currentStep) : [];
  const currentSelected = getSelectedCount(activeStep);

  // Emoji mapping
  const getCategoryEmoji = (category: string, label: string): string => {
    const lower = (category + ' ' + label).toLowerCase();
    if (lower.includes('burger')) return '🍔';
    if (lower.includes('wrap')) return '🌯';
    if (lower.includes('drink') || lower.includes('beverage')) return '🥤';
    if (lower.includes('fries')) return '🍟';
    if (lower.includes('sauce')) return '🫙';
    if (lower.includes('wing') || lower.includes('tender')) return '🍗';
    if (lower.includes('side')) return '🍟';
    if (lower.includes('dessert')) return '🍰';
    return '🍽️';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-card p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-heading flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {meal.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              £{Number(meal.price).toFixed(2)}
            </Badge>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {config.steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <button
                  onClick={() => { setActiveStep(idx); setShowUpgradePanel(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    idx === activeStep
                      ? 'bg-primary text-primary-foreground'
                      : isStepComplete(idx)
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isStepComplete(idx) && idx !== activeStep && <Check className="h-3 w-3" />}
                  <span>{getCategoryEmoji(step.category, step.label)}</span>
                  <span>{step.label}</span>
                  {step.required && <span className="text-xs">*</span>}
                </button>
                {idx < config.steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">
              {getCategoryEmoji(currentStep.category, currentStep.label)} Choose Your {currentStep.label}
              {currentStep.required && <span className="text-destructive ml-1">*</span>}
            </h3>
            <Badge variant="outline" className="text-xs">
              {currentSelected}/{currentStep.quantity} selected
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items found for "{currentStep.category}"</p>
              <p className="text-sm mt-2">Please add items to this category in the admin panel.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 pb-24">
              {/* Regular items */}
              {!showUpgradePanel && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentItems.map((item) => {
                    const currentQty = selections[activeStep]?.[item.id]?.quantity || 0;
                    const canAddMore = currentSelected < currentStep.quantity;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          currentQty > 0
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <span className="text-2xl flex-shrink-0">{getCategoryEmoji(item.category || currentStep.category, '')}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                            )}
                            {item.isAddon && item.price > 0 && (
                              <p className="text-xs text-primary font-medium">+£{Number(item.price).toFixed(2)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleAdjustSelection(activeStep, item, -1)}
                              disabled={currentQty <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-sm font-semibold">{currentQty}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleAdjustSelection(activeStep, item, 1)}
                              disabled={!canAddMore}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upgrade options */}
              {currentStep.upgradeable && showUpgradePanel && upgradeItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <ArrowUp className="h-4 w-4" />
                    <span className="font-medium">Upgrade Options (+£2.00)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {upgradeItems.map((item) => {
                      const isSelected = (selections[activeStep]?.[item.id]?.quantity || 0) > 0;
                      const upgradePrice = config.upgrades.find(u => u.from_category === currentStep.category)?.price_diff || 2;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleUpgradeSelection(activeStep, item, upgradePrice)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <span className="text-xl">{getCategoryEmoji(item.category || '', '')}</span>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.title}</p>
                              <p className="text-xs text-primary font-medium">+£{upgradePrice.toFixed(2)}</p>
                            </div>
                            {isSelected && (
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upgrade toggle button */}
              {currentStep.upgradeable && upgradeItems.length > 0 && !showUpgradePanel && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setShowUpgradePanel(true)}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Want to upgrade? (Wings, Tenders, etc.)
                </Button>
              )}

              {showUpgradePanel && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setShowUpgradePanel(false)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to regular options
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Selection Summary */}
          <div className="flex flex-wrap gap-2">
            {config.steps.map((step, idx) => {
              const stepSelections = selections[idx] || {};
              return Object.values(stepSelections).map((s) => {
                const upgrade = upgradeSelections.find(u => u.stepIndex === idx && u.item?.id === s.item.id);
                return (
                  <Badge key={`${idx}-${s.item.id}`} variant="outline" className="gap-1">
                    {getCategoryEmoji(step.category, step.label)} {s.quantity}x {s.item.title}
                    {upgrade && <span className="text-primary ml-1">+£{(upgrade.priceDiff * upgrade.quantity).toFixed(0)}</span>}
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

          {/* Navigation & Add to Cart */}
          <div className="flex gap-2">
            {activeStep > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            {!isLastStep() ? (
              <>
                {!currentStep.required && (
                  <Button variant="ghost" onClick={handleSkip} className="flex-1">
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 bg-primary"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleAddToCart}
                className="flex-1 btn-primary py-6 text-lg"
              >
                Add to Cart • £{calculateTotal().toFixed(2)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MealBuilderModal;

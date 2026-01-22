import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronRight, ChevronLeft, Sparkles, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
}

interface MealBuilderModalProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (meal: any, selections: MealSelection, totalPrice: number) => void;
}

type MealStep = 'burger' | 'side' | 'drink';

type MealConfig = {
  steps: MealStep[];
  burgerCategories: string[];
  counts: Record<MealStep, number>;
};

const parseMealCountsFromText = (text: string) => {
  const result: Partial<Record<MealStep, number>> = {};
  const lower = (text || '').toLowerCase();

  const matches = lower.matchAll(/\b(\d+)\s+(chicken\s+)?(burger|burgers|drink|drinks|side|sides|fries)\b/g);
  for (const m of matches) {
    const count = Number(m[1]);
    const noun = m[3];
    if (Number.isNaN(count) || count <= 0) continue;

    if (noun.startsWith('burger')) result.burger = Math.max(result.burger ?? 0, count);
    if (noun.startsWith('drink')) result.drink = Math.max(result.drink ?? 0, count);
    if (noun.startsWith('side') || noun.startsWith('fries')) result.side = Math.max(result.side ?? 0, count);
  }
  return result;
};

// Define what categories are available for selection based on meal type
const getMealConfig = (mealTitle: string, mealDescription?: string): MealConfig => {
  const title = (mealTitle || '').toLowerCase();
  const countsFromDesc = parseMealCountsFromText(mealDescription || '');

  const defaultCounts: Record<MealStep, number> = {
    burger: 1,
    side: 1,
    drink: 1,
  };

  // Common named deals
  if (title.includes('meal for two') || title.includes('for two')) {
    defaultCounts.burger = 2;
    defaultCounts.side = 2;
    defaultCounts.drink = 2;
  }

  if (title.includes('family')) {
    defaultCounts.burger = 4;
    defaultCounts.side = 4;
    defaultCounts.drink = 4;
  }

  if (title.includes('meal for one') || title.includes('for one')) {
    defaultCounts.burger = 1;
    defaultCounts.side = 1;
    defaultCounts.drink = 1;
  }

  // Override from description if we can infer counts
  const counts: Record<MealStep, number> = {
    burger: countsFromDesc.burger ?? defaultCounts.burger,
    side: countsFromDesc.side ?? defaultCounts.side,
    drink: countsFromDesc.drink ?? defaultCounts.drink,
  };

  if (title.includes('kids')) {
    return {
      steps: ['side', 'drink'],
      burgerCategories: [],
      counts: {
        burger: 0,
        side: counts.side || 1,
        drink: counts.drink || 1,
      },
    };
  }

  if (title.includes('wrap')) {
    return {
      steps: ['burger', 'side', 'drink'],
      burgerCategories: ['Wrap'],
      counts,
    };
  }

  if (title.includes('smash') || title.includes('solo smash') || title.includes('knockout')) {
    return {
      steps: ['burger', 'side', 'drink'],
      burgerCategories: ['Smash Burgers'],
      counts,
    };
  }

  // Default - chicken burgers
  return {
    steps: ['burger', 'side', 'drink'],
    burgerCategories: ['Chicken Burgers', 'Smash Burgers'],
    counts,
  };
};

// Define upgrade options (e.g., fries -> wings)
const upgradeOptions: Record<string, { to: string[]; priceIncrease: number }> = {
  'Fries': { to: ['Tenders & Wings', 'Sides'], priceIncrease: 2.00 },
};

const MealBuilderModal = ({ meal, isOpen, onClose, onAddToCart }: MealBuilderModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const [selection, setSelection] = useState<{
    burger: Record<string, { item: any; quantity: number }>;
    side: Record<string, { item: any; quantity: number }>;
    drink: Record<string, { item: any; quantity: number }>;
    upgrades: { category: string; item: any; priceDiff: number; quantity: number }[];
  }>({
    burger: {},
    side: {},
    drink: {},
    upgrades: [],
  });
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);

  const config = useMemo(() => (meal ? getMealConfig(meal.title, meal.description) : null), [meal?.title, meal?.description]);

  // Fetch menu items for building meals
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items-for-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

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

  // Get items for current step
  const getCurrentStepItems = () => {
    if (!config) return [];
    const step = config.steps[activeStep];

    if (step === 'burger') {
      const items: any[] = [];
      config.burgerCategories.forEach(cat => {
        if (itemsByCategory[cat]) items.push(...itemsByCategory[cat]);
      });
      return items;
    }

    if (step === 'drink') {
      return itemsByCategory['Drinks'] || [];
    }

    if (step === 'side') {
      // Default sides (include Fries + Sides)
      const fries = itemsByCategory['Fries'] || [];
      const sides = itemsByCategory['Sides'] || [];
      const merged = [...fries, ...sides];
      const seen = new Set<string>();
      return merged.filter((i) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
    }

    return [];
  };

  const getUpgradeItems = () => {
    // Items that can be upgraded to (wings, tenders, etc.)
    const upgradeItems: any[] = [];
    const tendersAndWings = itemsByCategory['Tenders & Wings'] || [];
    const sides = itemsByCategory['Sides'] || [];
    upgradeItems.push(...tendersAndWings, ...sides);
    return upgradeItems;
  };

  const getSelectedCount = (step: MealStep) => {
    const entries = Object.values(selection[step]);
    return entries.reduce((sum, e) => sum + e.quantity, 0);
  };

  const getStepLimit = (step: MealStep) => {
    return config?.counts?.[step] ?? 0;
  };

  // Calculate total price
  const calculateTotal = () => {
    let totalAmount = Number(meal?.price || 0);
    selection.upgrades.forEach((u) => {
      totalAmount += u.priceDiff * u.quantity;
    });
    return totalAmount * quantity;
  };

  const handleAdjustSelection = (item: any, type: MealStep, delta: number) => {
    setSelection((prev) => {
      const limit = getStepLimit(type);
      const currentCount = Object.values(prev[type]).reduce((sum, e) => sum + e.quantity, 0);

      // Prevent exceeding limits when incrementing
      if (delta > 0 && currentCount >= limit) {
        return prev;
      }

      const current = prev[type][item.id]?.quantity || 0;
      const nextQty = Math.max(0, current + delta);
      const nextMap = { ...prev[type] };
      const nextUpgrades = [...prev.upgrades];

      const isUpgradeSide = type === 'side' && item.category === 'Tenders & Wings';
      const upgradePrice = 2.0;

      if (nextQty === 0) {
        delete nextMap[item.id];
      } else {
        nextMap[item.id] = { item, quantity: nextQty };
      }

      if (type === 'side') {
        // Track upgrades for upgraded side categories
        const existingUpgradeIndex = nextUpgrades.findIndex((u) => u.category === 'side' && u.item?.id === item.id);

        if (isUpgradeSide && nextQty > 0) {
          if (existingUpgradeIndex >= 0) {
            nextUpgrades[existingUpgradeIndex] = {
              ...nextUpgrades[existingUpgradeIndex],
              quantity: nextQty,
              priceDiff: upgradePrice,
            };
          } else {
            nextUpgrades.push({ category: 'side', item, priceDiff: upgradePrice, quantity: nextQty });
          }
        } else if (existingUpgradeIndex >= 0) {
          nextUpgrades.splice(existingUpgradeIndex, 1);
        }
      }

      return {
        ...prev,
        [type]: nextMap,
        upgrades: nextUpgrades,
      };
    });
  };

  const handleUpgrade = (item: any, upgradePrice: number) => {
    // Upgrades are treated as side selections with an extra cost
    handleAdjustSelection(item, 'side', 1);
    setSelection((prev) => {
      const existingIndex = prev.upgrades.findIndex((u) => u.category === 'side' && u.item?.id === item.id);
      if (existingIndex >= 0) {
        const next = [...prev.upgrades];
        next[existingIndex] = { ...next[existingIndex], priceDiff: upgradePrice };
        return { ...prev, upgrades: next };
      }
      return { ...prev, upgrades: [...prev.upgrades, { category: 'side', item, priceDiff: upgradePrice, quantity: 1 }] };
    });
    setShowUpgradeOptions(false);
  };

  const handleNext = () => {
    if (!config) return;
    if (activeStep < config.steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSkip = () => {
    if (!config) return;
    const step = config.steps[activeStep];
    setSelection((prev) => ({ ...prev, [step]: {} }));
    handleNext();
  };

  const isStepComplete = (stepIndex: number) => {
    if (!config) return false;
    const step = config.steps[stepIndex];
    return getSelectedCount(step) >= (config.counts[step] || 0);
  };

  const canProceed = () => {
    if (!config) return false;
    const step = config.steps[activeStep];
    const limit = config.counts[step] || 0;
    if (limit <= 0) return true;
    return getSelectedCount(step) >= limit;
  };

  const isLastStep = () => {
    if (!config) return false;
    return activeStep === config.steps.length - 1;
  };

  const handleAddToCart = () => {
    const toArray = (map: Record<string, { item: any; quantity: number }>) =>
      Object.values(map).map((v) => ({ item: v.item, quantity: v.quantity }));

    const normalized: MealSelection = {
      burgers: toArray(selection.burger),
      sides: toArray(selection.side),
      drinks: toArray(selection.drink),
      upgrades: selection.upgrades.map((u) => ({
        category: u.category,
        item: u.item,
        priceDiff: u.priceDiff,
        quantity: u.quantity,
      })),
    };

    onAddToCart(meal, normalized, calculateTotal());
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setActiveStep(0);
    setSelection({ burger: {}, drink: {}, side: {}, upgrades: [] });
    setShowUpgradeOptions(false);
    onClose();
  };

  // Reset when meal changes
  useEffect(() => {
    if (isOpen && meal) {
      setActiveStep(0);
      setSelection({ burger: {}, drink: {}, side: {}, upgrades: [] });
      setShowUpgradeOptions(false);
    }
  }, [isOpen, meal?.id]);

  if (!meal || !config) return null;

  const currentStep = config.steps[activeStep];
  const currentItems = getCurrentStepItems();
  const upgradeItems = getUpgradeItems();

  const currentLimit = config.counts[currentStep] || 0;
  const currentSelected = getSelectedCount(currentStep);

  const stepLabels: Record<string, string> = {
    burger: '🍔 Choose Your Burger',
    drink: '🥤 Choose Your Drink',
    side: '🍟 Choose Your Side',
  };

  const categoryEmojis: Record<string, string> = {
    'Chicken Burgers': '🍔',
    'Smash Burgers': '🍔',
    'Fries': '🍟',
    'Drinks': '🥤',
    'Tenders & Wings': '🍗',
    'Sides': '🍟',
    'Wrap': '🌯',
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
          <div className="flex items-center gap-2 mt-4">
            {config.steps.map((step, idx) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${idx === activeStep
                    ? 'bg-primary text-primary-foreground'
                    : isStepComplete(idx)
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {isStepComplete(idx) && idx !== activeStep && <Check className="h-3 w-3" />}
                  {step === 'burger' && '🍔'}
                  {step === 'drink' && '🥤'}
                  {step === 'side' && '🍟'}
                  <span className="capitalize">{step}</span>
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
            <h3 className="text-lg font-semibold">{stepLabels[currentStep]}</h3>
            {currentLimit > 0 && (
              <Badge variant="outline" className="text-xs">
                {currentSelected}/{currentLimit} selected
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 pb-24">
              {/* Regular items */}
              {!showUpgradeOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentItems.map((item) => {
                    const currentQty = selection[currentStep]?.[item.id]?.quantity || 0;
                    const canAddMore = currentSelected < currentLimit;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAdjustSelection(item, currentStep, 1)}
                        className={`p-2 rounded-xl border text-left transition-all min-w-0 ${currentQty > 0
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                          }`}
                        disabled={currentQty === 0 && currentLimit > 0 && !canAddMore}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{categoryEmojis[item.category] || '🍽️'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAdjustSelection(item, currentStep, -1);
                              }}
                              disabled={currentQty <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-sm font-semibold">{currentQty}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAdjustSelection(item, currentStep, 1);
                              }}
                              disabled={currentLimit > 0 && currentSelected >= currentLimit}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Upgrade options for sides */}
              {currentStep === 'side' && showUpgradeOptions && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <ArrowUp className="h-4 w-4" />
                    <span className="font-medium">Upgrade your side (+£2.00)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {upgradeItems.map((item) => {
                      const isSelected = (selection.side?.[item.id]?.quantity || 0) > 0;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleUpgrade(item, 2.00)}
                          className={`p-2 rounded-xl border text-left transition-all ${isSelected
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
                          <p className="text-xs text-secondary font-medium mt-1">+£2.00</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upgrade toggle for sides */}
              {currentStep === 'side' && !showUpgradeOptions && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setShowUpgradeOptions(true)}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Want to upgrade? (Wings, Tenders, etc.)
                </Button>
              )}

              {showUpgradeOptions && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setShowUpgradeOptions(false)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to regular sides
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Selection Summary */}
          <div className="flex flex-wrap gap-2">
            {Object.values(selection.burger).map((s) => (
              <Badge key={s.item.id} variant="outline" className="gap-1">
                🍔 {s.quantity}x {s.item.title}
              </Badge>
            ))}
            {Object.values(selection.side).map((s) => {
              const upgraded = selection.upgrades.find((u) => u.category === 'side' && u.item?.id === s.item.id);
              return (
                <Badge key={s.item.id} variant="outline" className="gap-1">
                  🍟 {s.quantity}x {s.item.title}
                  {upgraded && <span className="text-secondary ml-1">+£{(upgraded.priceDiff * upgraded.quantity).toFixed(0)}</span>}
                </Badge>
              );
            })}
            {Object.values(selection.drink).map((s) => (
              <Badge key={s.item.id} variant="outline" className="gap-1">
                🥤 {s.quantity}x {s.item.title}
              </Badge>
            ))}
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
                {currentStep !== 'burger' && (
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

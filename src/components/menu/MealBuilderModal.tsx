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
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MealSelection {
  burger: any | null;
  drink: any | null;
  side: any | null;
  upgrades: { category: string; item: any; priceDiff: number }[];
}

interface MealBuilderModalProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (meal: any, selections: MealSelection, totalPrice: number) => void;
}

// Define what categories are available for selection based on meal type
const getMealConfig = (mealTitle: string) => {
  const title = mealTitle.toLowerCase();
  
  if (title.includes('kids')) {
    return {
      steps: ['side', 'drink'],
      burgerCategories: [],
      drinkRequired: true,
      sideRequired: true,
    };
  }
  
  if (title.includes('wrap')) {
    return {
      steps: ['burger', 'side', 'drink'],
      burgerCategories: ['Wrap'],
      drinkRequired: true,
      sideRequired: true,
    };
  }
  
  if (title.includes('smash') || title.includes('solo smash') || title.includes('knockout')) {
    return {
      steps: ['burger', 'side', 'drink'],
      burgerCategories: ['Smash Burgers'],
      drinkRequired: true,
      sideRequired: true,
    };
  }
  
  // Default - chicken burgers
  return {
    steps: ['burger', 'side', 'drink'],
    burgerCategories: ['Chicken Burgers', 'Smash Burgers'],
    drinkRequired: true,
    sideRequired: true,
  };
};

// Define upgrade options (e.g., fries -> wings)
const upgradeOptions: Record<string, { to: string[]; priceIncrease: number }> = {
  'Fries': { to: ['Tenders & Wings', 'Sides'], priceIncrease: 2.00 },
};

const MealBuilderModal = ({ meal, isOpen, onClose, onAddToCart }: MealBuilderModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const [selection, setSelection] = useState<MealSelection>({
    burger: null,
    drink: null,
    side: null,
    upgrades: [],
  });
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);

  const config = useMemo(() => meal ? getMealConfig(meal.title) : null, [meal?.title]);

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
      // Default sides, but can upgrade
      return itemsByCategory['Fries'] || [];
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

  // Calculate total price
  const calculateTotal = () => {
    let total = Number(meal?.price || 0);
    selection.upgrades.forEach(u => {
      total += u.priceDiff;
    });
    return total * quantity;
  };

  const handleSelectItem = (item: any, type: 'burger' | 'drink' | 'side') => {
    setSelection(prev => ({ ...prev, [type]: item }));
  };

  const handleUpgrade = (item: any, upgradePrice: number) => {
    setSelection(prev => ({
      ...prev,
      side: item,
      upgrades: [...prev.upgrades.filter(u => u.category !== 'side'), { category: 'side', item, priceDiff: upgradePrice }],
    }));
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
    setSelection(prev => ({ ...prev, [step]: null }));
    handleNext();
  };

  const isStepComplete = (stepIndex: number) => {
    if (!config) return false;
    const step = config.steps[stepIndex];
    return selection[step as keyof typeof selection] !== null;
  };

  const canProceed = () => {
    if (!config) return false;
    const step = config.steps[activeStep];
    // Burger is required for most meals, drink and side can be skipped
    if (step === 'burger' && config.burgerCategories.length > 0) {
      return selection.burger !== null;
    }
    return true; // Other steps can be skipped
  };

  const isLastStep = () => {
    if (!config) return false;
    return activeStep === config.steps.length - 1;
  };

  const handleAddToCart = () => {
    onAddToCart(meal, selection, calculateTotal());
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setActiveStep(0);
    setSelection({ burger: null, drink: null, side: null, upgrades: [] });
    setShowUpgradeOptions(false);
    onClose();
  };

  // Reset when meal changes
  useEffect(() => {
    if (isOpen && meal) {
      setActiveStep(0);
      setSelection({ burger: null, drink: null, side: null, upgrades: [] });
      setShowUpgradeOptions(false);
    }
  }, [isOpen, meal?.id]);

  if (!meal || !config) return null;

  const currentStep = config.steps[activeStep];
  const currentItems = getCurrentStepItems();
  const upgradeItems = getUpgradeItems();

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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    idx === activeStep
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
          <h3 className="text-lg font-semibold mb-3">{stepLabels[currentStep]}</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <ScrollArea className="flex-1">
              {/* Regular items */}
              {!showUpgradeOptions && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentItems.map((item) => {
                    const isSelected = selection[currentStep as keyof typeof selection]?.id === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item, currentStep as any)}
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
              )}

              {/* Upgrade options for sides */}
              {currentStep === 'side' && showUpgradeOptions && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <ArrowUp className="h-4 w-4" />
                    <span className="font-medium">Upgrade your side (+£2.00)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {upgradeItems.map((item) => {
                      const isSelected = selection.side?.id === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleUpgrade(item, 2.00)}
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
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Selection Summary */}
          <div className="flex flex-wrap gap-2">
            {selection.burger && (
              <Badge variant="outline" className="gap-1">
                🍔 {selection.burger.title}
              </Badge>
            )}
            {selection.side && (
              <Badge variant="outline" className="gap-1">
                🍟 {selection.side.title}
                {selection.upgrades.find(u => u.category === 'side') && (
                  <span className="text-secondary ml-1">+£2</span>
                )}
              </Badge>
            )}
            {selection.drink && (
              <Badge variant="outline" className="gap-1">
                🥤 {selection.drink.title}
              </Badge>
            )}
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

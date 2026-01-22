import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Minus, ChevronLeft, ShoppingCart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart, SelectedAddon } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ItemDetailsModal from '@/components/menu/ItemDetailsModal';
import MealBuilderModal, { MealSelection } from '@/components/menu/MealBuilderModal';

const Menu = () => {
  const { items, addItem, addItemWithAddons, updateQuantity, removeItem, subtotal, deliveryCharges, total, itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    if (!menuItems) return [];
    const cats = [...new Set(menuItems.map(item => item.category))];
    return ['all', ...cats];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    let filtered = menuItems;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [menuItems, selectedCategory, searchQuery, sortBy]);

  const categoryEmojis: Record<string, string> = {
    'Wings': '🍗',
    'Burgers': '🍔',
    'Sides': '🍟',
    'Tenders': '🍖',
    'Beverages': '🥤',
    'Desserts': '🍰',
    'Chicken Burgers': '🍔',
    'Smash Burgers': '🍔',
    'Fries': '🍟',
    'Tenders & Wings': '🍗',
    'Doner': '🥙',
    'Rice Bowl': '🍚',
    'Dessert': '🍰',
    'Wrap': '🌯',
    'Drinks': '🥤',
    'Meals': '🍱',
  };

  const getItemQuantity = (id: string) => {
    const item = items.find(i => i.id === id);
    return item?.quantity || 0;
  };

  const handleItemClick = (item: any) => {
    // Check if it's a Meal - use MealBuilderModal
    if (item.category === 'Meals') {
      setSelectedMeal(item);
      setIsMealModalOpen(true);
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const handleMealAddToCart = (meal: any, selections: MealSelection, totalPrice: number) => {
    // Build description from selections
    const parts: string[] = [];
    selections.burgers.forEach((s) => parts.push(`${s.quantity}x ${s.item.title}`));
    selections.sides.forEach((s) => parts.push(`${s.quantity}x ${s.item.title}`));
    selections.drinks.forEach((s) => parts.push(`${s.quantity}x ${s.item.title}`));
    
    const upgradeCost = selections.upgrades.reduce((sum, u) => sum + u.priceDiff * u.quantity, 0);
    
    addItemWithAddons({
      id: meal.id,
      title: `${meal.title}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`,
      price: Number(meal.price) + upgradeCost,
      image_url: meal.image_url,
    }, 1);
    
    toast.success(`${meal.title} added to cart!`);
  };

  const handleAddToCart = (item: any, addons: SelectedAddon[], totalPrice: number) => {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
    
    addItemWithAddons({
      id: item.id,
      title: item.title,
      price: Number(item.price),
      image_url: item.image_url,
      addons: addons.length > 0 ? addons : undefined,
      addonsTotal: addonsTotal > 0 ? addonsTotal : undefined,
    }, item.quantity || 1);
    
    const addonNames = addons.length > 0 
      ? ` with ${addons.map(a => a.name).join(', ')}`
      : '';
    toast.success(`${item.title}${addonNames} added to cart!`);
  };

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
    } else {
      updateQuantity(cartItemId, newQuantity);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-heading font-bold">Menu</h1>
          </div>
          
          {/* Cart Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="font-heading">Your Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
                {items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-6xl block mb-4">🛒</span>
                      <p className="text-muted-foreground">Your cart is empty</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {items.map((item) => (
                        <div key={item.cartItemId || item.id} className="flex items-start gap-4 bg-muted/50 rounded-xl p-4">
                          <div className="w-16 h-16 rounded-lg bg-card flex items-center justify-center text-2xl shrink-0">
                            🍗
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{item.title}</p>
                            {item.addons && item.addons.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                + {item.addons.map(a => `${a.quantity}x ${a.name}`).join(', ')}
                              </p>
                            )}
                            <p className="text-secondary font-bold mt-1">
                              ${((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleQuantityChange(item.cartItemId || item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleQuantityChange(item.cartItemId || item.id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4 mt-4 space-y-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {deliveryCharges > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery</span>
                          <span>${deliveryCharges.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-heading font-bold">
                        <span>Total</span>
                        <span className="text-secondary">${total.toFixed(2)}</span>
                      </div>
                      <Link to="/checkout" className="block">
                        <Button className="w-full btn-primary">
                          Proceed to Checkout
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="input-styled pl-12"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full lg:w-48 input-styled">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-48 input-styled">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat === 'all' ? '🍽️ All' : `${categoryEmojis[cat] || '🍽️'} ${cat}`}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-menu">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <span className="text-6xl block mb-4">😕</span>
              <p className="text-xl font-heading font-semibold mb-2">No items found</p>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLowStock = item.stock_quantity !== null && item.stock_quantity < 10;

              return (
                <div 
                  key={item.id} 
                  className="card-menu group cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gradient-to-br from-muted to-background overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {categoryEmojis[item.category] || '🍽️'}
                      </span>
                    </div>
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="badge-featured">{item.category}</span>
                      {isLowStock && (
                        <span className="badge-spicy">Only {item.stock_quantity} left!</span>
                      )}
                    </div>

                    {/* Info Icon */}
                    <div className="absolute top-3 right-3">
                      <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-heading font-semibold mb-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-heading font-bold text-secondary">
                        ${Number(item.price).toFixed(2)}
                      </span>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 rounded-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Cart Summary */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Link to="/checkout">
            <Button className="btn-primary shadow-glow px-8 py-6 text-lg">
              <ShoppingCart className="mr-2 h-5 w-5" />
              View Cart ({itemCount}) • ${total.toFixed(2)}
            </Button>
          </Link>
        </div>
      )}

      {/* Item Details Modal */}
      <ItemDetailsModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onAddToCart={handleAddToCart}
      />

      {/* Meal Builder Modal */}
      <MealBuilderModal
        meal={selectedMeal}
        isOpen={isMealModalOpen}
        onClose={() => {
          setIsMealModalOpen(false);
          setSelectedMeal(null);
        }}
        onAddToCart={handleMealAddToCart}
      />
    </div>
  );
};

export default Menu;

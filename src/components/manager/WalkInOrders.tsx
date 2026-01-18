import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Calculator, Printer, ShoppingBag, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import ItemDetailsModal, { SelectedAddon } from '@/components/menu/ItemDetailsModal';
import RestaurantStatusBanner from '@/components/RestaurantStatusBanner';
import { useRestaurantSettings, generateDailyOrderNumber } from '@/hooks/useRestaurantSettings';
import { Switch } from '@/components/ui/switch';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  category: string;
  cartItemId: string;
  addons?: SelectedAddon[];
  addonsTotal?: number;
}

type PaymentMethod = 'cash' | 'card' | 'split';

const WalkInOrders = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [splitCardAmount, setSplitCardAmount] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  
  // Discount
  const [discount, setDiscount] = useState('');
  const [isPercentageDiscount, setIsPercentageDiscount] = useState(false);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  
  // Item details modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Restaurant settings
  const { data: settings } = useRestaurantSettings();

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category');
      
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((item) => item.category))];
    return ['all', ...cats];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => item.title.toLowerCase().includes(query));
    }
    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  const categoryEmojis: Record<string, string> = {
    'Wings': '🍗', 'Burgers': '🍔', 'Sides': '🍟', 'Tenders': '🍖', 'Beverages': '🥤', 'Desserts': '🍰',
    'Chicken Burgers': '🍔', 'Smash Burgers': '🍔', 'Fries': '🍟', 'Tenders & Wings': '🍗',
    'Doner': '🥙', 'Rice Bowl': '🍚', 'Dessert': '🍰', 'Wrap': '🌯', 'Drinks': '🥤', 'Meals': '🍱',
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => (item.price + (item.addonsTotal || 0)) * item.quantity + sum, 0);
  
  // Calculate discount (supports both percentage and fixed)
  const discountValue = parseFloat(discount) || 0;
  const discountAmount = isPercentageDiscount ? (subtotal * discountValue / 100) : discountValue;
  const total = Math.max(0, subtotal - discountAmount);
  
  const changeToReturn = paymentMethod === 'cash' && amountReceived ? parseFloat(amountReceived) - total : 0;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCartWithAddons = (item: any, addons: SelectedAddon[], totalPrice: number) => {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
    setCart((prev) => [...prev, { id: item.id, title: item.title, price: Number(item.price), quantity: item.quantity || 1, category: item.category, cartItemId: crypto.randomUUID(), addons, addonsTotal }]);
    setIsItemModalOpen(false);
    setSelectedItem(null);
    toast.success(`${item.title} added with extras`);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    else setCart((prev) => prev.map((i) => i.cartItemId === cartItemId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMethod('cash');
    setAmountReceived('');
    setSplitCardAmount('');
    setSplitCashAmount('');
    setDiscount('');
    setIsPercentageDiscount(false);
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) { toast.error('Enter customer name'); return; }
    if (!customerPhone.trim()) { toast.error('Enter phone'); return; }
    if (cart.length === 0) { toast.error('Cart is empty'); return; }

    setIsSubmitting(true);
    try {
      const orderNumber = await generateDailyOrderNumber('WLK');
      
      const cardAmount = paymentMethod === 'card' ? total : paymentMethod === 'split' ? (parseFloat(splitCardAmount) || 0) : 0;
      const cashAmount = paymentMethod === 'cash' ? total : paymentMethod === 'split' ? (parseFloat(splitCashAmount) || 0) : 0;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_email: `${customerPhone}@walkin.local`,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: 'collection',
          order_source: 'walk-in',
          subtotal,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: 'completed',
          amount_paid_online: cardAmount,
          amount_due_cod: cashAmount,
          order_status: 'approved',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: (item.price + (item.addonsTotal || 0)) * item.quantity,
        selected_addons: item.addons?.length ? JSON.parse(JSON.stringify(item.addons)) : null,
        addons_total: item.addonsTotal || 0,
      }));

      await supabase.from('order_items').insert(orderItems);
      await supabase.from('order_status_history').insert({ order_id: order.id, status: 'approved', changed_by: user?.id, notes: 'Walk-in order' });
      await supabase.from('notifications').insert({ recipient_role: 'admin', order_id: order.id, message: `Walk-in #${orderNumber} - £${total.toFixed(2)}`, notification_type: 'new_order' });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!completedOrder) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto}h1{text-align:center;font-size:20px}.header{text-align:center;margin-bottom:15px}.divider{border-top:1px dashed #000;margin:8px 0}.item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold}</style></head><body><div class="header"><h1>Cluck Bite</h1><p>Walk-In Order</p></div><div class="divider"></div><p><b>Order:</b> ${completedOrder.order_number}</p><p><b>Date:</b> ${format(new Date(), 'PPpp')}</p><p><b>Customer:</b> ${customerName}</p><div class="divider"></div>${cart.map(item => `<div class="item"><span>${item.quantity}x ${item.title}</span><span>£${((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</span></div>${item.addons?.map(a => `<div style="font-size:0.8em;margin-left:10px;color:#666">+ ${a.name} x${a.quantity}</div>`).join('') || ''}`).join('')}<div class="divider"></div>${discountAmount > 0 ? `<div class="item"><span>Discount${isPercentageDiscount ? ` (${discountValue}%)` : ''}</span><span>-£${discountAmount.toFixed(2)}</span></div>` : ''}<div class="item total"><span>Total</span><span>£${total.toFixed(2)}</span></div><div class="divider"></div><p style="text-align:center">Payment: ${paymentMethod.toUpperCase()}</p>${changeToReturn > 0 ? `<p style="text-align:center">Change: £${changeToReturn.toFixed(2)}</p>` : ''}<div class="divider"></div><p style="text-align:center;margin-top:20px">Thank you!</p></body></html>`);
      w.document.close();
      w.print();
    }
  };

  const handleNewOrder = () => { clearCart(); setShowSuccessModal(false); setCompletedOrder(null); };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Status Banner */}
      <RestaurantStatusBanner className="mb-2 rounded-lg flex-shrink-0" />

      {/* Main Layout - Fixed Side by Side */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Left: Menu Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Categories - Horizontal Scroll */}
          <div className="flex gap-1.5 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {cat === 'all' ? '🍽️ All' : `${categoryEmojis[cat] || '🍽️'} ${cat}`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-2 flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input-styled pl-8 h-8 text-sm"
            />
          </div>

          {/* Menu Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                {filteredItems.map((item) => {
                  const inCart = cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }}
                      className="card-elevated p-2 text-left hover:border-primary/50 transition-all relative active:scale-95"
                    >
                      {inCart > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{inCart}</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{categoryEmojis[item.category] || '🍽️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-xs">{item.title}</p>
                          <p className="text-secondary font-bold text-xs">£{Number(item.price).toFixed(2)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Checkout Panel - Fixed Width */}
        <div className="w-72 xl:w-80 flex flex-col card-elevated p-3 overflow-hidden flex-shrink-0">
          {/* Cart Header */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Cart ({cartItemCount})
            </h3>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-6 text-xs px-2">
                <Trash2 className="h-3 w-3 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-2">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-xs">Tap items to add</p>
            ) : (
              <div className="space-y-1.5">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="flex items-center justify-between bg-muted/50 rounded-lg p-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{item.title}</p>
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">+{item.addons.map(a => a.name).join(', ')}</p>
                      )}
                      <p className="text-xs text-secondary font-semibold">£{((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-4 text-center text-xs font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-1.5 mb-2 pb-2 border-b border-border flex-shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[10px]">Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name" className="input-styled h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Phone *</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XXX" className="input-styled h-7 text-xs" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-1.5 mb-2 flex-shrink-0">
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'cash', icon: Banknote, color: 'text-green-500', label: 'Cash' },
                { id: 'card', icon: CreditCard, color: 'text-blue-500', label: 'Card' },
                { id: 'split', icon: Calculator, color: 'text-purple-500', label: 'Split' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                  className={`p-1.5 rounded-lg border text-center transition-all ${paymentMethod === p.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                >
                  <p.icon className={`h-3.5 w-3.5 mx-auto ${p.color}`} />
                  <span className="text-[9px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label className="text-[10px]">Received (£)</Label>
                  <Input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0" className="input-styled h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Change</Label>
                  <div className="h-7 px-2 rounded-lg bg-muted flex items-center font-bold text-green-500 text-xs">
                    £{changeToReturn > 0 ? changeToReturn.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'split' && (
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label className="text-[10px] flex items-center gap-1"><CreditCard className="h-2.5 w-2.5" /> Card (£)</Label>
                  <Input 
                    type="number" 
                    value={splitCardAmount} 
                    onChange={(e) => {
                      setSplitCardAmount(e.target.value);
                      setSplitCashAmount((total - (parseFloat(e.target.value) || 0)).toFixed(2));
                    }} 
                    placeholder="0" 
                    className="input-styled h-7 text-xs" 
                  />
                </div>
                <div>
                  <Label className="text-[10px] flex items-center gap-1"><Banknote className="h-2.5 w-2.5" /> Cash (£)</Label>
                  <Input 
                    type="number" 
                    value={splitCashAmount} 
                    onChange={(e) => {
                      setSplitCashAmount(e.target.value);
                      setSplitCardAmount((total - (parseFloat(e.target.value) || 0)).toFixed(2));
                    }} 
                    placeholder="0" 
                    className="input-styled h-7 text-xs" 
                  />
                </div>
              </div>
            )}

            {/* Discount with toggle */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <Label className="text-[10px]">Discount {isPercentageDiscount ? '(%)' : '(£)'}</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="input-styled h-7 text-xs" />
              </div>
              <div className="flex flex-col items-center pt-3">
                <Switch 
                  checked={isPercentageDiscount} 
                  onCheckedChange={setIsPercentageDiscount}
                  className="h-4 w-7"
                />
                <span className="text-[8px] text-muted-foreground mt-0.5">{isPercentageDiscount ? '%' : '£'}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-border pt-2 space-y-1 flex-shrink-0">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-500">
                <span>Discount{isPercentageDiscount ? ` (${discountValue}%)` : ''}</span>
                <span>-£{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-heading font-bold">
              <span>Total</span>
              <span className="text-primary">£{total.toFixed(2)}</span>
            </div>
            <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0} className="w-full btn-primary h-9 text-sm">
              {isSubmitting ? 'Processing...' : `Place Order • £${total.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetailsModal
          isOpen={isItemModalOpen}
          onClose={() => { setIsItemModalOpen(false); setSelectedItem(null); }}
          item={selectedItem}
          onAddToCart={handleAddToCartWithAddons}
        />
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">🎉 Order Placed!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg font-mono font-bold text-primary mb-2">{completedOrder?.order_number}</p>
            <p className="text-muted-foreground">Walk-in order created</p>
            <p className="text-2xl font-heading font-bold text-secondary mt-3">£{total.toFixed(2)}</p>
            {paymentMethod === 'cash' && changeToReturn > 0 && (
              <p className="text-green-500 font-medium mt-2">Change: £{changeToReturn.toFixed(2)}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={printReceipt} className="flex-1"><Printer className="h-4 w-4 mr-2" />Print</Button>
            <Button onClick={handleNewOrder} className="flex-1 btn-primary">New Order</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalkInOrders;

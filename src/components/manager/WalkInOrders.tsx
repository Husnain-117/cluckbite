import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, User, Phone, Mail, CreditCard, Banknote, Calculator, Printer, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import ItemDetailsModal, { SelectedAddon } from '@/components/menu/ItemDetailsModal';

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
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [splitAmount, setSplitAmount] = useState('');
  const [discount, setDiscount] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);
  
  // Item details modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

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
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

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

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = (item.price + (item.addonsTotal || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);
  const discountAmount = discount ? parseFloat(discount) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const changeToReturn = paymentMethod === 'cash' && amountReceived 
    ? parseFloat(amountReceived) - total 
    : 0;

  const addToCart = (item: any) => {
    const cartItemId = crypto.randomUUID();
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && !i.addons?.length);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && !i.addons?.length ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { 
        id: item.id, 
        title: item.title, 
        price: Number(item.price), 
        quantity: 1, 
        category: item.category,
        cartItemId,
        addons: [],
        addonsTotal: 0
      }];
    });
    toast.success(`${item.title} added`);
  };

  const handleAddToCartWithAddons = (item: any, addons: SelectedAddon[], totalPrice: number) => {
    const cartItemId = crypto.randomUUID();
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
    setCart((prev) => [...prev, {
      id: item.id,
      title: item.title,
      price: Number(item.price),
      quantity: item.quantity || 1,
      category: item.category,
      cartItemId,
      addons,
      addonsTotal,
    }]);
    setIsItemModalOpen(false);
    setSelectedItem(null);
    toast.success(`${item.title} added with extras`);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setCart((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)));
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setSpecialInstructions('');
    setPaymentMethod('cash');
    setAmountReceived('');
    setSplitAmount('');
    setDiscount('');
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WLK-${dateStr}-${random}`;
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter customer phone');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const amountPaidOnline = paymentMethod === 'card' ? total : 
                               paymentMethod === 'split' ? parseFloat(splitAmount) || 0 : 0;
      const amountDueCod = paymentMethod === 'cash' ? total :
                           paymentMethod === 'split' ? total - amountPaidOnline : 0;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_email: customerEmail || `${customerPhone}@walkin.local`,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: 'collection',
          order_source: 'walk-in',
          subtotal,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'completed' : 
                          paymentMethod === 'card' ? 'completed' : 'partial',
          amount_paid_online: amountPaidOnline,
          amount_due_cod: amountDueCod,
          order_status: 'approved',
          special_instructions: specialInstructions || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with addons
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: (item.price + (item.addonsTotal || 0)) * item.quantity,
        selected_addons: item.addons && item.addons.length > 0 ? JSON.parse(JSON.stringify(item.addons)) : null,
        addons_total: item.addonsTotal || 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Add status history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'approved',
        changed_by: user?.id,
        notes: 'Walk-in order created',
      });

      // Create notification for admin
      await supabase.from('notifications').insert({
        recipient_role: 'admin',
        order_id: order.id,
        message: `Walk-in order #${orderNumber} placed - £${total.toFixed(2)}`,
        notification_type: 'new_order',
      });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
      setShowCheckoutSheet(false);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!completedOrder) return;

    const receiptContent = `
      <html>
        <head>
          <title>Receipt - ${completedOrder.order_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            h1 { text-align: center; font-size: 24px; }
            .header { text-align: center; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cluck Bite</h1>
            <p>Walk-In Order Receipt</p>
          </div>
          <div class="divider"></div>
          <p><strong>Order:</strong> ${completedOrder.order_number}</p>
          <p><strong>Date:</strong> ${format(new Date(), 'PPpp')}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <div class="divider"></div>
          ${cart.map((item) => `
            <div class="item">
              <span>${item.quantity}x ${item.title}</span>
              <span>£${((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</span>
            </div>
            ${item.addons?.map(addon => `
              <div style="font-size: 0.8em; margin-left: 10px; color: #666;">
                + ${addon.name} x${addon.quantity}
              </div>
            `).join('') || ''}
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>Subtotal</span>
            <span>£${subtotal.toFixed(2)}</span>
          </div>
          ${discountAmount > 0 ? `
            <div class="item">
              <span>Discount</span>
              <span>-£${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item total">
            <span>Total</span>
            <span>£${total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <p style="text-align: center;">Payment: ${paymentMethod.toUpperCase()}</p>
          ${paymentMethod === 'cash' && changeToReturn > 0 ? `
            <p style="text-align: center;">Change: £${changeToReturn.toFixed(2)}</p>
          ` : ''}
          <div class="divider"></div>
          <p style="text-align: center; margin-top: 20px;">Thank you for visiting!</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleNewOrder = () => {
    clearCart();
    setShowSuccessModal(false);
    setCompletedOrder(null);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout Sheet Content
  const CheckoutContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Cart Items */}
        <div>
          <h3 className="font-heading font-semibold mb-3 flex items-center justify-between">
            <span>Cart ({cartItemCount} items)</span>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-8">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </h3>
          
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Add items to start</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.cartItemId} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.title}</p>
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        +{item.addons.map(a => a.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-secondary font-semibold">
                      £{((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="space-y-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Customer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="input-styled h-9"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Phone *</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07XXX XXX XXX"
                className="input-styled h-9"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <h3 className="font-heading font-semibold">Payment</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <Banknote className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <span className="text-xs font-medium">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <CreditCard className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <span className="text-xs font-medium">Card</span>
            </button>
            <button
              onClick={() => setPaymentMethod('split')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentMethod === 'split' ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <Calculator className="h-5 w-5 mx-auto text-purple-500 mb-1" />
              <span className="text-xs font-medium">Split</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Received (£)</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="input-styled h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Change</Label>
                <div className="h-9 px-3 rounded-lg bg-muted flex items-center font-bold text-green-500">
                  £{changeToReturn > 0 ? changeToReturn.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'split' && (
            <div>
              <Label className="text-xs">Card Amount (£)</Label>
              <Input
                type="number"
                value={splitAmount}
                onChange={(e) => setSplitAmount(e.target.value)}
                placeholder="0.00"
                className="input-styled h-9"
              />
              {splitAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cash: £{(total - (parseFloat(splitAmount) || 0)).toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Discount */}
        <div>
          <Label className="text-xs">Discount (£)</Label>
          <Input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
            className="input-styled h-9"
          />
        </div>
      </div>

      {/* Summary & Place Order */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>£{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-500">
            <span>Discount</span>
            <span>-£{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-heading font-bold text-xl">
          <span>Total</span>
          <span className="text-primary">£{total.toFixed(2)}</span>
        </div>
        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full btn-primary h-12 text-lg"
        >
          {isSubmitting ? 'Processing...' : `Place Order • £${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category Tabs - Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {cat === 'all' ? '🍽️ All' : `${categoryEmojis[cat] || '🍽️'} ${cat}`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input-styled pl-10 h-10"
          />
        </div>

        {/* Menu Grid - Responsive */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredItems.map((item) => {
                const inCart = cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedItem(item);
                      setIsItemModalOpen(true);
                    }}
                    className="card-elevated p-3 text-left hover:border-primary/50 transition-all relative active:scale-95"
                  >
                    {inCart > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {inCart}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryEmojis[item.category] || '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{item.title}</p>
                        <p className="text-secondary font-bold text-sm">£{Number(item.price).toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Checkout Panel */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col">
        <div className="card-elevated p-4 flex-1 overflow-hidden flex flex-col">
          <CheckoutContent />
        </div>
      </div>

      {/* Mobile/Tablet Floating Cart Button & Sheet */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Sheet open={showCheckoutSheet} onOpenChange={setShowCheckoutSheet}>
          <SheetTrigger asChild>
            <Button className="btn-primary h-14 px-6 shadow-lg relative">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span className="font-bold">£{total.toFixed(2)}</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="font-heading text-xl">Checkout</SheetTitle>
            </SheetHeader>
            <CheckoutContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetailsModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onAddToCart={handleAddToCartWithAddons}
        />
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              🎉 Order Placed!
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-4">
            <p className="text-lg font-mono font-bold text-primary mb-2">
              {completedOrder?.order_number}
            </p>
            <p className="text-muted-foreground">
              Walk-in order has been created successfully
            </p>
            <p className="text-2xl font-heading font-bold text-secondary mt-4">
              £{total.toFixed(2)}
            </p>
            {paymentMethod === 'cash' && changeToReturn > 0 && (
              <p className="text-green-500 font-medium mt-2">
                Change: £{changeToReturn.toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={printReceipt} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleNewOrder} className="flex-1 btn-primary">
              New Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalkInOrders;
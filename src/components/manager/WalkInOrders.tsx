import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, User, Phone, Mail, CreditCard, Banknote, Calculator, Printer, Info } from 'lucide-react';
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
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = discount ? parseFloat(discount) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const changeToReturn = paymentMethod === 'cash' && amountReceived 
    ? parseFloat(amountReceived) - total 
    : 0;

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { id: item.id, title: item.title, price: Number(item.price), quantity: 1, category: item.category }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
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
          order_status: 'approved', // Skip pending for walk-in
          special_instructions: specialInstructions || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        item_title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
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
        message: `Walk-in order #${orderNumber} placed - $${total.toFixed(2)}`,
        notification_type: 'new_order',
      });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
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
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${discountAmount > 0 ? `
            <div class="item">
              <span>Discount</span>
              <span>-$${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item total">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <p style="text-align: center;">Payment: ${paymentMethod.toUpperCase()}</p>
          ${paymentMethod === 'cash' && changeToReturn > 0 ? `
            <p style="text-align: center;">Change: $${changeToReturn.toFixed(2)}</p>
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

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel - Menu & Cart */}
      <div className="flex-1 flex flex-col">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="input-styled pl-12"
          />
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="card-elevated p-4 text-left hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{categoryEmojis[item.category] || '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.title}</p>
                        <p className="text-secondary font-bold">${Number(item.price).toFixed(2)}</p>
                      </div>
                      {inCart && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold">Cart ({cart.length} items)</h3>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Add items to start an order</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.title}</p>
                    <p className="text-sm text-secondary">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Customer & Checkout */}
      <div className="w-96 flex flex-col">
        <div className="card-elevated p-6 flex-1 overflow-y-auto space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="input-styled"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="input-styled"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="For receipt"
                  className="input-styled"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Payment Method</h3>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="h-5 w-5 text-green-500" />
                <label htmlFor="cash" className="flex-1 cursor-pointer">Cash</label>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="h-5 w-5 text-primary" />
                <label htmlFor="card" className="flex-1 cursor-pointer">Card</label>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                paymentMethod === 'split' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="split" id="split" />
                <Calculator className="h-5 w-5 text-secondary" />
                <label htmlFor="split" className="flex-1 cursor-pointer">Split</label>
              </div>
            </RadioGroup>

            {paymentMethod === 'cash' && (
              <div className="mt-4 space-y-3">
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="input-styled text-lg"
                />
                <div className="flex gap-2">
                  {[10, 20, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountReceived(amount.toString())}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="bg-green-500/10 text-green-500 p-3 rounded-xl text-center">
                    <p className="text-sm">Change to Return</p>
                    <p className="text-2xl font-heading font-bold">${changeToReturn.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'split' && (
              <div className="mt-4 space-y-3">
                <Label>Card Amount</Label>
                <Input
                  type="number"
                  value={splitAmount}
                  onChange={(e) => setSplitAmount(e.target.value)}
                  placeholder="0.00"
                  max={total}
                  className="input-styled"
                />
                <div className="bg-muted p-3 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span>Cash Amount:</span>
                    <span>${(total - (parseFloat(splitAmount) || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Discount */}
          <div>
            <Label>Discount ($)</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
              className="input-styled"
            />
          </div>

          {/* Special Instructions */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Special instructions..."
              className="input-styled"
            />
          </div>
        </div>

        {/* Order Summary & Actions */}
        <div className="card-elevated p-6 mt-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-heading font-bold text-2xl pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-secondary">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full btn-primary py-6 text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground" />
                Processing...
              </span>
            ) : (
              `Place Order • $${total.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-center">
              <span className="text-6xl block mb-4">✅</span>
              <span className="text-2xl font-heading">Order Placed!</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-2xl font-heading font-bold text-primary">
                {completedOrder?.order_number}
              </p>
            </div>
            
            <p className="text-muted-foreground">
              Total: <span className="font-bold text-secondary">${total.toFixed(2)}</span>
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={printReceipt} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={handleNewOrder} className="flex-1 btn-primary">
                New Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalkInOrders;

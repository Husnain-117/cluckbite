import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, User, Phone, MapPin, Truck, CreditCard, Banknote, Calculator, Printer, History, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from 'date-fns';
import ItemDetailsModal, { SelectedAddon } from '@/components/menu/ItemDetailsModal';
import { Badge } from '@/components/ui/badge';

// UK postcodes for distance calculation
const cardiffPostcodeDistances: Record<string, number> = {
  'CF5': 1.5, 'CF11': 2.5, 'CF14': 3.5, 'CF10': 3, 'CF24': 3.5,
  'CF23': 4.5, 'CF3': 5, 'CF15': 5, 'CF64': 6, 'CF62': 7,
  'CF63': 7.5, 'CF71': 8, 'CF83': 7, 'CF82': 8, 'CF37': 10,
  'CF38': 9, 'CF72': 6, 'CF35': 12, 'CF31': 15, 'CF32': 14,
  'CF33': 16, 'CF34': 17, 'CF39': 12, 'CF40': 11, 'CF41': 13,
  'CF42': 14, 'CF43': 15, 'CF44': 16, 'CF45': 17, 'CF46': 10,
  'CF47': 14, 'CF48': 15, 'NP10': 8, 'NP20': 12, 'NP19': 11,
  'NP18': 9, 'NP44': 10,
};

const getDeliveryCharge = (miles: number): number => {
  if (miles <= 3) return 1.50;
  if (miles <= 4) return 2.50;
  return 2.50 + Math.ceil(miles - 4);
};

const getDistanceFromPostcode = (postcode: string): number | null => {
  const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
  const outwardMatch = cleanPostcode.match(/^([A-Z]{1,2}\d{1,2})/);
  if (!outwardMatch) return null;
  return cardiffPostcodeDistances[outwardMatch[1]] || null;
};

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

const PhoneOrders = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Delivery calculation
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Customer history
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [splitAmount, setSplitAmount] = useState('');
  
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

  // Customer lookup
  const lookupCustomer = async (phone: string) => {
    if (phone.length < 10) return;
    setIsLoadingHistory(true);
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (orders && orders.length > 0) {
        setCustomerHistory(orders);
        setFoundCustomer({
          name: orders[0].customer_name,
          email: orders[0].customer_email,
          address: orders[0].delivery_address,
          totalOrders: orders.length,
        });
        if (!customerName) setCustomerName(orders[0].customer_name || '');
        if (!customerEmail && !orders[0].customer_email?.includes('@')) {
          setCustomerEmail(orders[0].customer_email || '');
        }
        if (!deliveryAddress && orders[0].delivery_address) {
          setDeliveryAddress(orders[0].delivery_address);
        }
        setShowHistory(true);
        toast.success(`Found ${orders.length} previous order(s)`);
      } else {
        setCustomerHistory([]);
        setFoundCustomer(null);
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerPhone.length >= 10) lookupCustomer(customerPhone);
    }, 500);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  const handleCalculateDistance = () => {
    if (!postalCode.trim()) {
      toast.error('Enter postal code');
      return;
    }
    setIsCalculating(true);
    setTimeout(() => {
      const d = getDistanceFromPostcode(postalCode);
      if (d === null) {
        toast.error('Invalid postcode');
        setIsCalculating(false);
        return;
      }
      setDistance(d);
      setDeliveryCharges(getDeliveryCharge(d));
      setIsCalculating(false);
      toast.success(`Delivery: £${getDeliveryCharge(d).toFixed(2)}`);
    }, 500);
  };

  const categories = useMemo(() => ['all', ...new Set(menuItems.map((item) => item.category))], [menuItems]);

  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    if (selectedCategory !== 'all') filtered = filtered.filter((item) => item.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => item.title.toLowerCase().includes(q));
    }
    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  const categoryEmojis: Record<string, string> = {
    'Wings': '🍗', 'Burgers': '🍔', 'Sides': '🍟', 'Tenders': '🍖', 'Beverages': '🥤', 'Desserts': '🍰',
    'Chicken Burgers': '🍔', 'Smash Burgers': '🍔', 'Fries': '🍟', 'Tenders & Wings': '🍗',
    'Doner': '🥙', 'Rice Bowl': '🍚', 'Dessert': '🍰', 'Wrap': '🌯', 'Drinks': '🥤', 'Meals': '🍱',
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price + (item.addonsTotal || 0)) * item.quantity, 0);
  const total = subtotal + deliveryCharges;
  const amountPaidOnline = paymentMethod === 'card' ? total : paymentMethod === 'split' ? parseFloat(splitAmount) || 0 : 0;
  const amountDueCod = paymentMethod === 'cash' ? total : paymentMethod === 'split' ? total - amountPaidOnline : 0;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: any) => {
    const cartItemId = crypto.randomUUID();
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && !i.addons?.length);
      if (existing) {
        return prev.map((i) => i.id === item.id && !i.addons?.length ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, title: item.title, price: Number(item.price), quantity: 1, category: item.category, cartItemId, addons: [], addonsTotal: 0 }];
    });
    toast.success(`${item.title} added`);
  };

  const handleAddToCartWithAddons = (item: any, addons: SelectedAddon[], totalPrice: number) => {
    const cartItemId = crypto.randomUUID();
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
    setCart((prev) => [...prev, { id: item.id, title: item.title, price: Number(item.price), quantity: item.quantity || 1, category: item.category, cartItemId, addons, addonsTotal }]);
    setIsItemModalOpen(false);
    setSelectedItem(null);
    toast.success(`${item.title} added`);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    else setCart((prev) => prev.map((i) => i.cartItemId === cartItemId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setPostalCode('');
    setSpecialInstructions('');
    setPaymentMethod('cash');
    setSplitAmount('');
    setDistance(null);
    setDeliveryCharges(0);
    setCustomerHistory([]);
    setFoundCustomer(null);
    setShowHistory(false);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PHN-${dateStr}-${random}`;
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) { toast.error('Enter customer name'); return; }
    if (!customerPhone.trim()) { toast.error('Enter phone'); return; }
    if (!deliveryAddress.trim()) { toast.error('Enter address'); return; }
    if (distance === null) { toast.error('Calculate delivery'); return; }
    if (cart.length === 0) { toast.error('Cart empty'); return; }

    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_email: customerEmail || `${customerPhone}@phone.local`,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: 'delivery',
          order_source: 'phone',
          delivery_address: deliveryAddress,
          pin_location: postalCode,
          distance_km: distance,
          delivery_charges: deliveryCharges,
          subtotal,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'pending' : paymentMethod === 'card' ? 'completed' : 'partial',
          amount_paid_online: amountPaidOnline,
          amount_due_cod: amountDueCod,
          order_status: 'approved',
          special_instructions: specialInstructions || null,
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
        selected_addons: item.addons && item.addons.length > 0 ? JSON.parse(JSON.stringify(item.addons)) : null,
        addons_total: item.addonsTotal || 0,
      }));

      await supabase.from('order_items').insert(orderItems);
      await supabase.from('order_status_history').insert({ order_id: order.id, status: 'approved', changed_by: user?.id, notes: 'Phone order' });
      await supabase.from('notifications').insert({ recipient_role: 'admin', order_id: order.id, message: `Phone #${orderNumber} - £${total.toFixed(2)}`, notification_type: 'new_order' });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
      setShowCheckoutSheet(false);
      toast.success('Order placed!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!completedOrder) return;
    const receiptContent = `<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto}h1{text-align:center;font-size:20px}.header{text-align:center;margin-bottom:15px}.divider{border-top:1px dashed #000;margin:8px 0}.item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold}</style></head><body><div class="header"><h1>Cluck Bite</h1><p>Phone Order - DELIVERY</p></div><div class="divider"></div><p><b>Order:</b> ${completedOrder.order_number}</p><p><b>Date:</b> ${format(new Date(), 'PPpp')}</p><p><b>Customer:</b> ${customerName}</p><p><b>Phone:</b> ${customerPhone}</p><p><b>Address:</b><br/>${deliveryAddress}, ${postalCode}</p><div class="divider"></div>${cart.map(item => `<div class="item"><span>${item.quantity}x ${item.title}</span><span>£${((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</span></div>`).join('')}<div class="divider"></div><div class="item"><span>Subtotal</span><span>£${subtotal.toFixed(2)}</span></div><div class="item"><span>Delivery</span><span>£${deliveryCharges.toFixed(2)}</span></div><div class="item total"><span>Total</span><span>£${total.toFixed(2)}</span></div><div class="divider"></div><p style="text-align:center">Payment: ${paymentMethod.toUpperCase()}</p>${amountDueCod > 0 ? `<p style="text-align:center;font-weight:bold">Collect: £${amountDueCod.toFixed(2)}</p>` : ''}</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(receiptContent); w.document.close(); w.print(); }
  };

  const handleNewOrder = () => { clearCart(); setShowSuccessModal(false); setCompletedOrder(null); };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500', approved: 'bg-blue-500/10 text-blue-500',
    preparing: 'bg-purple-500/10 text-purple-500', ready: 'bg-green-500/10 text-green-500',
    completed: 'bg-gray-500/10 text-gray-500', rejected: 'bg-red-500/10 text-red-500',
  };

  // Checkout Panel Content
  const CheckoutContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Cart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-semibold text-sm">Cart ({cartItemCount})</h3>
            {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-7 text-xs"><Trash2 className="h-3 w-3 mr-1" />Clear</Button>}
          </div>
          {cart.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">Add items</p> : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.cartItemId} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-xs">{item.title}</p>
                    <p className="text-xs text-secondary">£{((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="space-y-2">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-1"><Phone className="h-4 w-4 text-primary" />Customer</h3>
          <div className="relative">
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XXX XXX XXX" className="input-styled h-9 text-sm" />
            {isLoadingHistory && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-3 w-3 border-t-2 border-primary" /></div>}
          </div>
          
          {foundCustomer && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-left">
                  <div className="flex items-center gap-1.5"><History className="h-3 w-3 text-green-500" /><span className="text-xs font-medium text-green-500">{foundCustomer.totalOrders} orders</span></div>
                  {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5">
                <div className="p-2 bg-muted/50 rounded-lg space-y-1.5 text-xs">
                  <p><span className="text-muted-foreground">Name:</span> {foundCustomer.name}</p>
                  {foundCustomer.address && <p><span className="text-muted-foreground">Last Address:</span> {foundCustomer.address}</p>}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name *" className="input-styled h-9 text-sm" />
        </div>

        {/* Delivery */}
        <div className="space-y-2">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-1"><Truck className="h-4 w-4 text-primary" />Delivery</h3>
          <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Address *" className="input-styled min-h-[50px] text-sm" />
          <div className="flex gap-2">
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postcode" className="input-styled h-9 text-sm flex-1" />
            <Button onClick={handleCalculateDistance} disabled={isCalculating} variant="secondary" size="sm" className="h-9 px-3">{isCalculating ? '...' : 'Calc'}</Button>
          </div>
          {distance !== null && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Distance:</span><span className="font-semibold">{distance} mi</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Charge:</span><span className="font-semibold text-primary">£{deliveryCharges.toFixed(2)}</span></div>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="space-y-2">
          <h3 className="font-heading font-semibold text-sm">Payment</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {[{ id: 'cash', icon: Banknote, color: 'text-green-500', label: 'Cash' }, { id: 'card', icon: CreditCard, color: 'text-blue-500', label: 'Card' }, { id: 'split', icon: Calculator, color: 'text-purple-500', label: 'Split' }].map(p => (
              <button key={p.id} onClick={() => setPaymentMethod(p.id as PaymentMethod)} className={`p-2 rounded-lg border text-center transition-all ${paymentMethod === p.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <p.icon className={`h-4 w-4 mx-auto ${p.color} mb-0.5`} /><span className="text-[10px] font-medium">{p.label}</span>
              </button>
            ))}
          </div>
          {paymentMethod === 'split' && (
            <div>
              <Label className="text-xs">Card (£)</Label>
              <Input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="0" className="input-styled h-9 text-sm" />
              {splitAmount && <p className="text-xs text-muted-foreground mt-1">Cash: £{(total - (parseFloat(splitAmount) || 0)).toFixed(2)}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Delivery</span><span>£{deliveryCharges.toFixed(2)}</span></div>
        <div className="flex justify-between font-heading font-bold text-lg"><span>Total</span><span className="text-primary">£{total.toFixed(2)}</span></div>
        {amountDueCod > 0 && <div className="flex justify-between text-xs bg-yellow-500/10 p-1.5 rounded"><span className="text-yellow-600">Collect</span><span className="font-semibold text-yellow-600">£{amountDueCod.toFixed(2)}</span></div>}
        <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0 || distance === null} className="w-full btn-primary h-11">
          {isSubmitting ? 'Processing...' : `Place Delivery • £${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4">
      {/* Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {cat === 'all' ? '🍽️ All' : `${categoryEmojis[cat] || '🍽️'} ${cat}`}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="input-styled pl-10 h-10" />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredItems.map((item) => {
                const inCart = cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
                return (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }} className="card-elevated p-3 text-left hover:border-primary/50 transition-all relative active:scale-95">
                    {inCart > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{inCart}</span>}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryEmojis[item.category] || '🍽️'}</span>
                      <div className="flex-1 min-w-0"><p className="font-medium truncate text-sm">{item.title}</p><p className="text-secondary font-bold text-sm">£{Number(item.price).toFixed(2)}</p></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Panel */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col">
        <div className="card-elevated p-4 flex-1 overflow-hidden flex flex-col">
          <CheckoutContent />
        </div>
      </div>

      {/* Mobile Sheet */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Sheet open={showCheckoutSheet} onOpenChange={setShowCheckoutSheet}>
          <SheetTrigger asChild>
            <Button className="btn-primary h-14 px-6 shadow-lg relative">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span className="font-bold">£{total.toFixed(2)}</span>
              {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">{cartItemCount}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
            <SheetHeader className="pb-3"><SheetTitle className="font-heading text-xl">Phone Order</SheetTitle></SheetHeader>
            <CheckoutContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Modals */}
      {selectedItem && <ItemDetailsModal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setSelectedItem(null); }} item={selectedItem} onAddToCart={handleAddToCartWithAddons} />}

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader><DialogTitle className="text-center text-2xl">🎉 Order Placed!</DialogTitle></DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg font-mono font-bold text-primary mb-2">{completedOrder?.order_number}</p>
            <p className="text-muted-foreground text-sm">Delivery to {deliveryAddress}</p>
            <p className="text-2xl font-heading font-bold text-secondary mt-3">£{total.toFixed(2)}</p>
            {amountDueCod > 0 && <p className="text-yellow-600 font-medium mt-1">Collect: £{amountDueCod.toFixed(2)}</p>}
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

export default PhoneOrders;
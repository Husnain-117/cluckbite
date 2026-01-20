import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Phone, Truck, CreditCard, Banknote, Calculator, Printer, History, ChevronDown, ChevronUp, ShoppingBag, AlertCircle } from 'lucide-react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from 'date-fns';
import ItemDetailsModal, { SelectedAddon } from '@/components/menu/ItemDetailsModal';
import MealBuilderModal, { MealSelection } from '@/components/menu/MealBuilderModal';
import { Badge } from '@/components/ui/badge';
import RestaurantStatusBanner from '@/components/RestaurantStatusBanner';
import { 
  useRestaurantSettings, 
  getDeliveryCharge, 
  isPostcodeInRange,
  generateDailyOrderNumber
} from '@/hooks/useRestaurantSettings';

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
  
  // Customer info - Phone first, then Postcode
  const [customerPhone, setCustomerPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Delivery calculation
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  
  // Customer history
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [splitCardAmount, setSplitCardAmount] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  
  // Item details modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);

  // Restaurant settings
  const { data: settings } = useRestaurantSettings();
  const maxDistance = settings?.deliverySettings?.max_distance_miles || 15;

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
          address: orders[0].delivery_address,
          postcode: orders[0].pin_location,
          totalOrders: orders.length,
        });
        if (!customerName) setCustomerName(orders[0].customer_name || '');
        if (!deliveryAddress && orders[0].delivery_address) {
          setDeliveryAddress(orders[0].delivery_address);
        }
        if (!postalCode && orders[0].pin_location) {
          setPostalCode(orders[0].pin_location);
          handleCalculateDistance(orders[0].pin_location);
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

  // Auto-calculate delivery when postcode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (postalCode.length >= 3) {
        handleCalculateDistance(postalCode);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [postalCode, maxDistance]);

  const handleCalculateDistance = (code?: string) => {
    const pc = code || postalCode;
    if (!pc.trim()) {
      setPostcodeError('Enter postcode');
      return;
    }

    const result = isPostcodeInRange(pc, maxDistance);
    
    if (!result.inRange) {
      setPostcodeError(result.error || 'Invalid postcode');
      setDistance(null);
      setDeliveryCharges(0);
      return;
    }
    
    setPostcodeError(null);
    setDistance(result.distance);
    setDeliveryCharges(getDeliveryCharge(result.distance!));
    toast.success(`Delivery: £${getDeliveryCharge(result.distance!).toFixed(2)} (${result.distance} miles)`);
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
  
  const cardAmount = paymentMethod === 'card' ? total : paymentMethod === 'split' ? (parseFloat(splitCardAmount) || 0) : 0;
  const cashAmount = paymentMethod === 'cash' ? total : paymentMethod === 'split' ? (parseFloat(splitCashAmount) || 0) : 0;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCartWithAddons = (item: any, addons: SelectedAddon[], totalPrice: number) => {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
    setCart((prev) => [...prev, { id: item.id, title: item.title, price: Number(item.price), quantity: item.quantity || 1, category: item.category, cartItemId: crypto.randomUUID(), addons, addonsTotal }]);
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
    setDeliveryAddress('');
    setPostalCode('');
    setSpecialInstructions('');
    setPaymentMethod('cash');
    setSplitCardAmount('');
    setSplitCashAmount('');
    setDistance(null);
    setDeliveryCharges(0);
    setPostcodeError(null);
    setCustomerHistory([]);
    setFoundCustomer(null);
    setShowHistory(false);
  };

  const handlePlaceOrder = async () => {
    if (!customerPhone.trim()) { toast.error('Enter phone number'); return; }
    if (!postalCode.trim()) { toast.error('Enter postcode'); return; }
    if (postcodeError) { toast.error(postcodeError); return; }
    if (!customerName.trim()) { toast.error('Enter customer name'); return; }
    if (!deliveryAddress.trim()) { toast.error('Enter address'); return; }
    if (distance === null) { toast.error('Calculate delivery first'); return; }
    if (cart.length === 0) { toast.error('Cart empty'); return; }

    setIsSubmitting(true);
    try {
      const orderNumber = await generateDailyOrderNumber('PHN');
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_email: `${customerPhone}@phone.local`,
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
          amount_paid_online: cardAmount,
          amount_due_cod: cashAmount,
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
        selected_addons: item.addons?.length ? JSON.parse(JSON.stringify(item.addons)) : null,
        addons_total: item.addonsTotal || 0,
      }));

      await supabase.from('order_items').insert(orderItems);
      await supabase.from('order_status_history').insert({ order_id: order.id, status: 'approved', changed_by: user?.id, notes: 'Phone order' });
      await supabase.from('notifications').insert({ recipient_role: 'admin', order_id: order.id, message: `Phone #${orderNumber} - £${total.toFixed(2)}`, notification_type: 'new_order' });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
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
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto}h1{text-align:center;font-size:20px}.header{text-align:center;margin-bottom:15px}.divider{border-top:1px dashed #000;margin:8px 0}.item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold}</style></head><body><div class="header"><h1>Cluck Bite</h1><p>Phone Order - DELIVERY</p></div><div class="divider"></div><p><b>Order:</b> ${completedOrder.order_number}</p><p><b>Date:</b> ${format(new Date(), 'PPpp')}</p><p><b>Customer:</b> ${customerName}</p><p><b>Phone:</b> ${customerPhone}</p><p><b>Address:</b><br/>${deliveryAddress}<br/>${postalCode}</p><div class="divider"></div>${cart.map(item => `<div class="item"><span>${item.quantity}x ${item.title}</span><span>£${((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</span></div>`).join('')}<div class="divider"></div><div class="item"><span>Subtotal</span><span>£${subtotal.toFixed(2)}</span></div><div class="item"><span>Delivery (${distance} mi)</span><span>£${deliveryCharges.toFixed(2)}</span></div><div class="item total"><span>Total</span><span>£${total.toFixed(2)}</span></div><div class="divider"></div><p style="text-align:center">Payment: ${paymentMethod.toUpperCase()}</p>${cashAmount > 0 ? `<p style="text-align:center;font-weight:bold;color:red">COLLECT: £${cashAmount.toFixed(2)}</p>` : ''}</body></html>`);
      w.document.close();
      w.print();
    }
  };

  const handleNewOrder = () => { clearCart(); setShowSuccessModal(false); setCompletedOrder(null); };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500', approved: 'bg-blue-500/10 text-blue-500',
    preparing: 'bg-purple-500/10 text-purple-500', ready: 'bg-green-500/10 text-green-500',
    completed: 'bg-gray-500/10 text-gray-500', rejected: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Status Banner */}
      <RestaurantStatusBanner className="mb-2 rounded-lg flex-shrink-0" />

      {/* Main Layout - Fixed Side by Side */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Left: Menu Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Categories */}
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
                      onClick={() => {
                        if (item.category === 'Meals') {
                          setSelectedMeal(item);
                          setIsMealModalOpen(true);
                        } else {
                          setSelectedItem(item);
                          setIsItemModalOpen(true);
                        }
                      }}
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
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {/* Cart Header */}
            <div className="flex items-center justify-between">
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

            {/* Cart Items */}
            <div className="max-h-24 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-3 text-xs">Tap items to add</p>
              ) : (
                <div className="space-y-1">
                  {cart.map((item) => (
                    <div key={item.cartItemId} className="flex items-center justify-between bg-muted/50 rounded-lg p-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-[11px]">{item.title}</p>
                        <p className="text-[10px] text-secondary">£{((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}><Minus className="h-2.5 w-2.5" /></Button>
                        <span className="w-4 text-center text-[10px] font-medium">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><Plus className="h-2.5 w-2.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Section */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <h4 className="font-heading font-semibold text-xs flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" />
                Customer
              </h4>
              
              {/* Phone Number */}
              <div className="relative">
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07XXX XXX XXX *"
                  className="input-styled h-7 text-xs"
                />
                {isLoadingHistory && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-primary" />
                  </div>
                )}
              </div>

              {/* Postal Code */}
              <div>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  placeholder="Postcode (e.g., CF5 1AA) *"
                  className={`input-styled h-7 text-xs ${postcodeError ? 'border-destructive' : distance !== null ? 'border-green-500' : ''}`}
                />
                {postcodeError && (
                  <div className="flex items-center gap-1 mt-1 text-destructive text-[10px]">
                    <AlertCircle className="h-2.5 w-2.5" />
                    <span>{postcodeError}</span>
                  </div>
                )}
                {distance !== null && !postcodeError && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-1.5 mt-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-semibold">{distance} miles</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Delivery:</span>
                      <span className="font-semibold text-primary">£{deliveryCharges.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer History */}
              {foundCustomer && (
                <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-left">
                      <div className="flex items-center gap-1">
                        <History className="h-2.5 w-2.5 text-green-500" />
                        <span className="text-[10px] font-medium text-green-500">{foundCustomer.totalOrders} orders</span>
                      </div>
                      {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <div className="p-1.5 bg-muted/50 rounded-lg space-y-1 text-[10px] max-h-16 overflow-y-auto">
                      {customerHistory.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{format(new Date(order.created_at), 'dd/MM')}</span>
                          <Badge className={`${statusColors[order.order_status]} text-[8px] px-1 py-0`}>{order.order_status}</Badge>
                          <span className="font-medium">£{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Name */}
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name *"
                className="input-styled h-7 text-xs"
              />
            </div>

            {/* Delivery Address */}
            <div className="space-y-1.5">
              <h4 className="font-heading font-semibold text-xs flex items-center gap-1">
                <Truck className="h-3 w-3 text-primary" />
                Delivery
              </h4>
              <Textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Full delivery address *"
                className="input-styled min-h-[50px] text-xs"
              />
            </div>

            {/* Payment */}
            <div className="space-y-1.5">
              <h4 className="font-heading font-semibold text-xs">Payment</h4>
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
            </div>
          </div>

          {/* Summary - Fixed at bottom */}
          <div className="border-t border-border pt-2 mt-2 space-y-1 flex-shrink-0">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Delivery ({distance || 0} mi)</span>
              <span>£{deliveryCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-heading font-bold">
              <span>Total</span>
              <span className="text-primary">£{total.toFixed(2)}</span>
            </div>
            {cashAmount > 0 && (
              <div className="flex justify-between text-[10px] bg-yellow-500/10 p-1 rounded">
                <span className="text-yellow-600">Collect on Delivery</span>
                <span className="font-semibold text-yellow-600">£{cashAmount.toFixed(2)}</span>
              </div>
            )}
            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || cart.length === 0 || distance === null || !!postcodeError}
              className="w-full btn-primary h-9 text-sm"
            >
              {isSubmitting ? 'Processing...' : `Place Delivery • £${total.toFixed(2)}`}
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
            <p className="text-muted-foreground text-sm">Delivery to {postalCode}</p>
            <p className="text-2xl font-heading font-bold text-secondary mt-3">£{total.toFixed(2)}</p>
            {cashAmount > 0 && <p className="text-yellow-600 font-medium mt-1">Collect: £{cashAmount.toFixed(2)}</p>}
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

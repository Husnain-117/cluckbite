import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, User, Phone, Mail, MapPin, Truck, CreditCard, Banknote, Calculator, Printer, History, ChevronDown, ChevronUp } from 'lucide-react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from 'date-fns';
import ItemDetailsModal, { SelectedAddon } from '@/components/menu/ItemDetailsModal';
import { Badge } from '@/components/ui/badge';

// UK postcodes for distance calculation (approximate miles from Cardiff Ely)
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
  const outwardCode = outwardMatch[1];
  return cardiffPostcodeDistances[outwardCode] || null;
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

  // Look up customer by phone number
  const lookupCustomer = async (phone: string) => {
    if (phone.length < 10) return;
    
    setIsLoadingHistory(true);
    try {
      // Get orders by phone number
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
        
        // Auto-fill customer info from most recent order
        if (!customerName && orders[0].customer_name) {
          setCustomerName(orders[0].customer_name);
        }
        if (!customerEmail && orders[0].customer_email && !orders[0].customer_email.includes('@walkin.local')) {
          setCustomerEmail(orders[0].customer_email);
        }
        if (!deliveryAddress && orders[0].delivery_address) {
          setDeliveryAddress(orders[0].delivery_address);
        }
        
        setShowHistory(true);
        toast.success(`Found ${orders.length} previous order(s) for this customer`);
      } else {
        setCustomerHistory([]);
        setFoundCustomer(null);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Debounced phone lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerPhone.length >= 10) {
        lookupCustomer(customerPhone);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [customerPhone]);

  const handleCalculateDistance = () => {
    if (!postalCode.trim()) {
      toast.error('Please enter the postal code');
      return;
    }

    setIsCalculating(true);
    
    setTimeout(() => {
      const calculatedDistance = getDistanceFromPostcode(postalCode);
      
      if (calculatedDistance === null) {
        toast.error('Unable to calculate distance for this postcode. Please check and try again.');
        setIsCalculating(false);
        return;
      }
      
      const charges = getDeliveryCharge(calculatedDistance);
      
      setDistance(calculatedDistance);
      setDeliveryCharges(charges);
      setIsCalculating(false);
      
      if (calculatedDistance > 15) {
        toast.warning('Delivery to this location may take longer than usual.');
      } else {
        toast.success(`Delivery charge: £${charges.toFixed(2)}`);
      }
    }, 500);
  };

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
    'Wings': '🍗', 'Burgers': '🍔', 'Sides': '🍟',
    'Tenders': '🍖', 'Beverages': '🥤', 'Desserts': '🍰',
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = (item.price + (item.addonsTotal || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);
  const total = subtotal + deliveryCharges;
  
  const amountPaidOnline = paymentMethod === 'card' ? total : 
                           paymentMethod === 'split' ? parseFloat(splitAmount) || 0 : 0;
  const amountDueCod = paymentMethod === 'cash' ? total :
                       paymentMethod === 'split' ? total - amountPaidOnline : 0;

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
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter customer phone');
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }
    if (distance === null) {
      toast.error('Please calculate delivery distance first');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();

      // Create order
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
          payment_status: paymentMethod === 'cash' ? 'pending' : 
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
        notes: 'Phone order created',
      });

      // Create notification for admin
      await supabase.from('notifications').insert({
        recipient_role: 'admin',
        order_id: order.id,
        message: `Phone order #${orderNumber} - £${total.toFixed(2)} delivery to ${deliveryAddress}`,
        notification_type: 'new_order',
      });

      setCompletedOrder({ ...order, order_items: orderItems });
      setShowSuccessModal(true);
      toast.success('Order placed successfully!');
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
            .address { margin: 10px 0; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cluck Bite</h1>
            <p>Phone Order - DELIVERY</p>
          </div>
          <div class="divider"></div>
          <p><strong>Order:</strong> ${completedOrder.order_number}</p>
          <p><strong>Date:</strong> ${format(new Date(), 'PPpp')}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Phone:</strong> ${customerPhone}</p>
          <div class="address">
            <strong>Deliver to:</strong><br/>
            ${deliveryAddress}<br/>
            ${postalCode}
          </div>
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
          <div class="item">
            <span>Delivery (${distance} miles)</span>
            <span>£${deliveryCharges.toFixed(2)}</span>
          </div>
          <div class="item total">
            <span>Total</span>
            <span>£${total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <p style="text-align: center;">Payment: ${paymentMethod.toUpperCase()}</p>
          ${paymentMethod === 'cash' || paymentMethod === 'split' ? `
            <p style="text-align: center; font-weight: bold;">Collect on Delivery: £${amountDueCod.toFixed(2)}</p>
          ` : ''}
          <div class="divider"></div>
          <p style="text-align: center; margin-top: 20px;">Thank you!</p>
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

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    approved: 'bg-blue-500/10 text-blue-500',
    preparing: 'bg-purple-500/10 text-purple-500',
    ready: 'bg-green-500/10 text-green-500',
    completed: 'bg-gray-500/10 text-gray-500',
    rejected: 'bg-red-500/10 text-red-500',
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
                const inCart = cart.filter((c) => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsItemModalOpen(true);
                    }}
                    className="card-elevated p-4 text-left hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{categoryEmojis[item.category] || '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.title}</p>
                        <p className="text-secondary font-bold">£{Number(item.price).toFixed(2)}</p>
                      </div>
                      {inCart > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                          {inCart}
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
                <div key={item.cartItemId} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.title}</p>
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        +{item.addons.map(a => a.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-secondary">£{((item.price + (item.addonsTotal || 0)) * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
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
      <div className="w-[420px] flex flex-col">
        <div className="card-elevated p-6 flex-1 overflow-y-auto space-y-5">
          {/* Customer Info */}
          <div>
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07XXX XXX XXX"
                    className="input-styled"
                  />
                  {isLoadingHistory && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Customer History Panel */}
              {foundCustomer && (
                <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-left">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">
                          Returning Customer • {foundCustomer.totalOrders} orders
                        </span>
                      </div>
                      {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{foundCustomer.name}</p>
                      </div>
                      {foundCustomer.email && !foundCustomer.email.includes('@walkin.local') && !foundCustomer.email.includes('@phone.local') && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{foundCustomer.email}</p>
                        </div>
                      )}
                      {foundCustomer.address && (
                        <div>
                          <p className="text-xs text-muted-foreground">Last Address</p>
                          <p className="font-medium text-sm">{foundCustomer.address}</p>
                        </div>
                      )}
                      
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-2">Recent Orders</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {customerHistory.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-mono text-xs">{order.order_number}</span>
                                <Badge className={`ml-2 text-xs ${statusColors[order.order_status]}`}>
                                  {order.order_status}
                                </Badge>
                              </div>
                              <span className="text-muted-foreground">£{Number(order.total_amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
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

          {/* Delivery Address */}
          <div>
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Delivery Details
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="123 Street Name, City"
                  className="input-styled min-h-[60px]"
                />
              </div>
              <div>
                <Label htmlFor="postalCode" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Postal Code *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="CF5 1XX"
                    className="input-styled flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleCalculateDistance}
                    disabled={isCalculating}
                    variant="secondary"
                    size="sm"
                  >
                    {isCalculating ? '...' : 'Calculate'}
                  </Button>
                </div>
              </div>
              
              {/* Distance & Charges */}
              {distance !== null && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-semibold">{distance} miles</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery charge:</span>
                    <span className="font-semibold text-primary">£{deliveryCharges.toFixed(2)}</span>
                  </div>
                </div>
              )}
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
                <Label htmlFor="cash" className="flex-1 cursor-pointer">Pay on Delivery</Label>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="h-5 w-5 text-blue-500" />
                <Label htmlFor="card" className="flex-1 cursor-pointer">Card (Pre-paid)</Label>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                paymentMethod === 'split' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <RadioGroupItem value="split" id="split" />
                <Calculator className="h-5 w-5 text-purple-500" />
                <Label htmlFor="split" className="flex-1 cursor-pointer">Split Payment</Label>
              </div>
            </RadioGroup>

            {paymentMethod === 'split' && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                <div>
                  <Label htmlFor="splitAmount" className="text-sm">Card Amount (£)</Label>
                  <Input
                    id="splitAmount"
                    type="number"
                    step="0.01"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-styled"
                  />
                </div>
                {splitAmount && (
                  <p className="text-sm text-muted-foreground">
                    Collect on delivery: <span className="font-semibold text-primary">£{amountDueCod.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests..."
              className="input-styled min-h-[60px]"
            />
          </div>

          {/* Order Summary */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span>£{deliveryCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-heading font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">£{total.toFixed(2)}</span>
            </div>
            {(paymentMethod === 'cash' || paymentMethod === 'split') && (
              <div className="flex justify-between text-sm bg-yellow-500/10 p-2 rounded-lg">
                <span className="text-yellow-600">Collect on Delivery</span>
                <span className="font-semibold text-yellow-600">£{amountDueCod.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || cart.length === 0 || distance === null}
          className="mt-4 btn-primary h-14 text-lg"
        >
          {isSubmitting ? 'Processing...' : `Place Delivery Order • £${total.toFixed(2)}`}
        </Button>
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
              Delivery order has been created successfully
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-left">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Phone:</strong> {customerPhone}</p>
              <p><strong>Address:</strong> {deliveryAddress}</p>
              <p><strong>Total:</strong> £{total.toFixed(2)}</p>
              {amountDueCod > 0 && (
                <p className="text-yellow-600 font-semibold">Collect: £{amountDueCod.toFixed(2)}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={printReceipt} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
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

export default PhoneOrders;
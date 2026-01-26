import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Banknote, Split, Check, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { generateDailyOrderNumber } from '@/hooks/useRestaurantSettings';

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number is required'),
});

type PaymentMethod = 'card' | 'cod' | 'split';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, deliveryInfo, subtotal, deliveryCharges, total, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customer Info
  const [customerName, setCustomerName] = useState(user?.user_metadata?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(deliveryInfo?.phone || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitCardAmount, setSplitCardAmount] = useState('');

  const validateCustomerInfo = () => {
    try {
      customerSchema.parse({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
      setErrors({});
      return true;
    } catch (e: any) {
      const newErrors: Record<string, string> = {};
      e.errors.forEach((err: any) => {
        newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleNextStep = () => {
    if (step === 2 && !validateCustomerInfo()) {
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const calculatePaymentAmounts = () => {
    let amountPaidOnline = 0;
    let amountDueCod = 0;

    if (paymentMethod === 'card') {
      amountPaidOnline = total;
    } else if (paymentMethod === 'cod') {
      amountDueCod = total;
    } else if (paymentMethod === 'split') {
      const cashValue = parseFloat(splitCashAmount) || 0;
      const cardValue = parseFloat(splitCardAmount) || 0;
      amountPaidOnline = Math.min(cardValue, total);
      amountDueCod = Math.min(cashValue, total - amountPaidOnline);
    }

    return { amountPaidOnline, amountDueCod };
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    try {
      const { amountPaidOnline, amountDueCod } = calculatePaymentAmounts();
      
      // Retry mechanism for order number collision
      let order = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!order && attempts < maxAttempts) {
        attempts++;
        const orderNumber = await generateDailyOrderNumber('ORD');
        
        const { data, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: user?.id || null,
            customer_email: customerEmail,
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_address: deliveryInfo?.type === 'delivery' ? deliveryInfo.address : null,
            pin_location: deliveryInfo?.pinLocation || null,
            order_type: deliveryInfo?.type || 'collection',
            delivery_charges: deliveryCharges,
            distance_km: deliveryInfo?.distance || null,
            subtotal,
            total_amount: total,
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'cod' ? 'pending' : 'pending', // Set to pending until Stripe confirms
            amount_paid_online: 0, // Will be updated after payment
            amount_due_cod: paymentMethod === 'cod' ? total : amountDueCod,
            special_instructions: specialInstructions || null,
          })
          .select()
          .single();
        
        if (orderError) {
          // If it's a duplicate key error, retry with new number
          if (orderError.code === '23505' && attempts < maxAttempts) {
            console.log(`Order number collision, retrying... (attempt ${attempts})`);
            continue;
          }
          throw orderError;
        }
        
        order = data;
      }
      
      if (!order) {
        throw new Error('Failed to create order after multiple attempts');
      }

      // Create order items
      const orderItems = items.map((item) => ({
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

      // Create notifications for manager and admin
      await supabase.from('notifications').insert([
        {
          recipient_role: 'manager',
          order_id: order.id,
          message: `New order #${order.order_number} received from ${customerName}`,
        },
        {
          recipient_role: 'admin',
          order_id: order.id,
          message: `New order #${order.order_number} - Total: £${total.toFixed(2)}`,
        },
      ]);

      // If payment method is card or split with card portion, redirect to Stripe
      if (paymentMethod === 'card' || (paymentMethod === 'split' && amountPaidOnline > 0)) {
        const paymentAmount = paymentMethod === 'card' ? total : amountPaidOnline;
        
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
          body: {
            amount: Math.round(paymentAmount * 100), // Convert to pennies
            orderId: order.id,
            customerEmail,
            customerName,
            orderNumber: order.order_number,
          },
        });

        if (checkoutError || !checkoutData?.url) {
          throw new Error(checkoutError?.message || 'Failed to create payment session');
        }

        // Redirect to Stripe Checkout
        window.location.href = checkoutData.url;
        return;
      }

      // For cash on delivery, go directly to success page
      clearCart();
      navigate(`/order-success?order=${order.order_number}`);
    } catch (error: any) {
      console.error('Order submission error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && step !== 4) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-8xl block mb-6">🛒</span>
          <h1 className="text-2xl font-heading font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Link to="/menu">
            <Button className="btn-primary">Browse Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { amountPaidOnline, amountDueCod } = calculatePaymentAmounts();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" size="icon" onClick={step === 1 ? () => navigate(-1) : handlePrevStep}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-heading font-bold ml-4">Checkout</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                <span className={`ml-2 hidden sm:block ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Review' : s === 2 ? 'Details' : 'Payment'}
                </span>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-4 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Order Review */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold">Review Your Order</h2>
            
            {/* Order Type */}
            <div className="card-elevated p-4 flex items-center gap-4">
              {deliveryInfo?.type === 'delivery' ? (
                <Truck className="h-6 w-6 text-primary" />
              ) : (
                <Store className="h-6 w-6 text-secondary" />
              )}
              <div>
                <p className="font-semibold capitalize">{deliveryInfo?.type || 'Collection'}</p>
                {deliveryInfo?.type === 'delivery' && deliveryInfo.address && (
                  <p className="text-sm text-muted-foreground">{deliveryInfo.address}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="card-elevated p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl">
                    🍗
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-secondary">
                    £{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card-elevated p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {deliveryCharges > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Charges</span>
                  <span>£{deliveryCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-heading font-bold text-lg">Total</span>
                <span className="font-heading font-bold text-lg text-secondary">
                  £{total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button onClick={handleNextStep} className="w-full btn-primary py-6 text-lg">
              Continue to Details
            </Button>
          </div>
        )}

        {/* Step 2: Customer Information */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold">Your Details</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="input-styled"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-styled"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07XXX XXX XXX"
                  className="input-styled"
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any allergies or special requests?"
                  className="input-styled min-h-[100px]"
                />
              </div>
            </div>

            <Button onClick={handleNextStep} className="w-full btn-primary py-6 text-lg">
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-heading font-bold">Payment Method</h2>

            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              {/* Card Payment */}
              <div
                className={`card-elevated p-4 cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                <label className="flex items-center gap-4 cursor-pointer">
                  <RadioGroupItem value="card" id="card" />
                  <CreditCard className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold">Pay by Card</p>
                    <p className="text-sm text-muted-foreground">Pay full amount online</p>
                  </div>
                  <span className="font-bold text-secondary">£{total.toFixed(2)}</span>
                </label>
              </div>

              {/* Pay Later */}
              <div
                className={`card-elevated p-4 cursor-pointer transition-all ${
                  paymentMethod === 'cod' ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                <label className="flex items-center gap-4 cursor-pointer">
                  <RadioGroupItem value="cod" id="cod" />
                  <Banknote className="h-6 w-6 text-green-500" />
                  <div className="flex-1">
                    <p className="font-semibold">Pay Later</p>
                    <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                  </div>
                  <span className="font-bold text-secondary">£{total.toFixed(2)}</span>
                </label>
              </div>

              {/* Split Payment */}
              <div
                className={`card-elevated p-4 cursor-pointer transition-all ${
                  paymentMethod === 'split' ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                <label className="flex items-start gap-4 cursor-pointer">
                  <RadioGroupItem value="split" id="split" className="mt-1" />
                  <Split className="h-6 w-6 text-secondary mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold">Split Payment</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pay part by card, part in cash
                    </p>
                    {paymentMethod === 'split' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="splitCardAmount" className="text-sm flex items-center gap-1">
                              <CreditCard className="h-3 w-3" /> Card (£)
                            </Label>
                            <Input
                              id="splitCardAmount"
                              type="number"
                              min="0"
                              max={total}
                              step="0.01"
                              value={splitCardAmount}
                              onChange={(e) => {
                                const cardVal = parseFloat(e.target.value) || 0;
                                setSplitCardAmount(e.target.value);
                                setSplitCashAmount((total - cardVal).toFixed(2));
                              }}
                              placeholder="0.00"
                              className="input-styled mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="splitCashAmount" className="text-sm flex items-center gap-1">
                              <Banknote className="h-3 w-3" /> Cash (£)
                            </Label>
                            <Input
                              id="splitCashAmount"
                              type="number"
                              min="0"
                              max={total}
                              step="0.01"
                              value={splitCashAmount}
                              onChange={(e) => {
                                const cashVal = parseFloat(e.target.value) || 0;
                                setSplitCashAmount(e.target.value);
                                setSplitCardAmount((total - cashVal).toFixed(2));
                              }}
                              placeholder="0.00"
                              className="input-styled mt-1"
                            />
                          </div>
                        </div>
                        <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pay Online:</span>
                            <span className="font-semibold text-blue-500">£{(parseFloat(splitCardAmount) || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pay on Delivery:</span>
                            <span className="font-semibold text-green-500">£{(parseFloat(splitCashAmount) || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </RadioGroup>

            {/* Summary */}
            <div className="card-elevated p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {deliveryCharges > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>£{deliveryCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-heading font-bold text-lg">Total</span>
                <span className="font-heading font-bold text-lg text-secondary">
                  £{total.toFixed(2)}
                </span>
              </div>
              {paymentMethod === 'split' && (
                <>
                  <div className="flex justify-between text-sm text-blue-500">
                    <span>Pay now (Card)</span>
                    <span>£{amountPaidOnline.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Pay on delivery (Cash)</span>
                    <span>£{amountDueCod.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full btn-primary py-6 text-lg"
            >
              {isSubmitting ? 'Processing...' : `Place Order • £${total.toFixed(2)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;

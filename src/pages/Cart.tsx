import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, Trash2, ArrowRight, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

const Cart = () => {
  const { items, updateQuantity, removeItem, subtotal, deliveryCharges, total, deliveryInfo, itemCount } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <span className="text-8xl block mb-6">🛒</span>
          <h1 className="text-2xl font-heading font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some delicious items from our menu to get started
          </p>
          <Link to="/menu">
            <Button className="btn-primary">Browse Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/menu">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-heading font-bold">Your Cart</h1>
          </div>
          <span className="text-muted-foreground">{itemCount} items</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Order Type Info */}
        {deliveryInfo && (
          <div className="card-elevated p-4 mb-6 flex items-center gap-4">
            {deliveryInfo.type === 'delivery' ? (
              <>
                <Truck className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold">Delivery</p>
                  {deliveryInfo.address && (
                    <p className="text-sm text-muted-foreground">{deliveryInfo.address}</p>
                  )}
                </div>
                {deliveryInfo.distance && (
                  <span className="text-sm text-muted-foreground">{deliveryInfo.distance} km</span>
                )}
              </>
            ) : (
              <>
                <Store className="h-6 w-6 text-secondary" />
                <div>
                  <p className="font-semibold">Collection</p>
                  <p className="text-sm text-muted-foreground">Pick up from our store</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <div key={item.id} className="card-elevated p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-3xl flex-shrink-0">
                🍗
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.title}</h3>
                <p className="text-secondary font-bold">${item.price.toFixed(2)} each</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Items */}
        <Link to="/menu" className="block mb-8">
          <Button variant="outline" className="w-full btn-outline">
            <Plus className="h-4 w-4 mr-2" />
            Add More Items
          </Button>
        </Link>

        {/* Order Summary */}
        <div className="card-elevated p-6 space-y-4">
          <h3 className="font-heading font-semibold">Order Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {deliveryCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charges</span>
                <span>${deliveryCharges.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-heading font-bold text-lg">Total</span>
              <span className="font-heading font-bold text-lg text-secondary">${total.toFixed(2)}</span>
            </div>
          </div>

          <Link to="/checkout">
            <Button className="w-full btn-primary py-6 text-lg group">
              Proceed to Checkout
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;

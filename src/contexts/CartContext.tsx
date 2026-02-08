import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppliedCoupon } from '@/hooks/useCoupon';

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string;
  addons?: SelectedAddon[];
  addonsTotal?: number;
  cartItemId?: string;
}

export interface DeliveryInfo {
  type: 'delivery' | 'collection';
  phone?: string;
  address?: string;
  pinLocation?: string;
  distance?: number;
  deliveryCharges?: number;
}

interface CartContextType {
  items: CartItem[];
  deliveryInfo: DeliveryInfo | null;
  appliedCoupon: AppliedCoupon | null;
  discount: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  addItemWithAddons: (item: Omit<CartItem, 'quantity' | 'cartItemId'>, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  setDiscount: (amount: number) => void;
  subtotal: number;
  deliveryCharges: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const generateCartItemId = () => {
  return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discount, setDiscount] = useState(0);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.id === item.id && (!i.addons || i.addons.length === 0) && (!item.addons || item.addons.length === 0)
      );
      if (existing) {
        return prev.map((i) =>
          i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, cartItemId: generateCartItemId() }];
    });
  }, []);

  const addItemWithAddons = useCallback((item: Omit<CartItem, 'quantity' | 'cartItemId'>, quantity: number) => {
    setItems((prev) => {
      const cartItemId = generateCartItemId();
      return [...prev, { ...item, quantity, cartItemId }];
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId && i.id !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId && i.id !== cartItemId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          (i.cartItemId === cartItemId || i.id === cartItemId) ? { ...i, quantity } : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDeliveryInfo(null);
    setAppliedCoupon(null);
    setDiscount(0);
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price * item.quantity;
    const addonsPrice = (item.addonsTotal || 0) * item.quantity;
    return sum + itemPrice + addonsPrice;
  }, 0);

  const deliveryCharges = deliveryInfo?.deliveryCharges || 0;
  const total = Math.max(0, subtotal + deliveryCharges - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryInfo,
        appliedCoupon,
        discount,
        addItem,
        addItemWithAddons,
        removeItem,
        updateQuantity,
        clearCart,
        setDeliveryInfo,
        setAppliedCoupon,
        setDiscount,
        subtotal,
        deliveryCharges,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

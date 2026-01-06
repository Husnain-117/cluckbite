import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string;
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
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  subtotal: number;
  deliveryCharges: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDeliveryInfo(null);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharges = deliveryInfo?.deliveryCharges || 0;
  const total = subtotal + deliveryCharges;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryInfo,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setDeliveryInfo,
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

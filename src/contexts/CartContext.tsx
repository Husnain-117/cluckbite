import React, { createContext, useContext, useState, useCallback } from 'react';

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
  cartItemId?: string; // Unique identifier for cart items with different addons
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
  addItemWithAddons: (item: Omit<CartItem, 'quantity' | 'cartItemId'>, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  subtotal: number;
  deliveryCharges: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Generate unique cart item ID
const generateCartItemId = () => {
  return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  // Original addItem for backward compatibility (without addons)
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      // Find existing item with same id AND no addons
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

  // New addItem with addons support
  const addItemWithAddons = useCallback((item: Omit<CartItem, 'quantity' | 'cartItemId'>, quantity: number) => {
    setItems((prev) => {
      // For items with addons, always create a new cart entry
      // This is because different addon combinations should be separate line items
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
  }, []);

  // Calculate subtotal including addons
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price * item.quantity;
    const addonsPrice = (item.addonsTotal || 0) * item.quantity;
    return sum + itemPrice + addonsPrice;
  }, 0);

  const deliveryCharges = deliveryInfo?.deliveryCharges || 0;
  const total = subtotal + deliveryCharges;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryInfo,
        addItem,
        addItemWithAddons,
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

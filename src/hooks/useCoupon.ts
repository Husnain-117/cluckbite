import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppliedCoupon {
  id: string;
  title: string;
  coupon_code: string;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  discount_value: number;
  minimum_order: number;
}

export const useCoupon = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateCoupon = async (
    code: string,
    subtotal: number
  ): Promise<AppliedCoupon | null> => {
    if (!code.trim()) {
      toast.error('Please enter a coupon code');
      return null;
    }

    setIsValidating(true);

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .eq('coupon_code', code.toUpperCase().trim())
        .gte('end_date', now)
        .lte('start_date', now)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Invalid or expired coupon code');
        return null;
      }

      const offer = data[0];

      // Check minimum order
      const minOrder = offer.minimum_order || 0;
      if (subtotal < minOrder) {
        toast.error(`Minimum order of £${minOrder.toFixed(2)} required for this coupon`);
        return null;
      }

      // Check usage limit
      if (offer.usage_limit && (offer.times_used || 0) >= offer.usage_limit) {
        toast.error('This coupon has reached its usage limit');
        return null;
      }

      toast.success(`Coupon "${offer.title}" applied!`);

      return {
        id: offer.id,
        title: offer.title,
        coupon_code: offer.coupon_code!,
        discount_type: offer.discount_type as AppliedCoupon['discount_type'],
        discount_value: offer.discount_value,
        minimum_order: minOrder,
      };
    } catch (err) {
      console.error('Coupon validation error:', err);
      toast.error('Failed to validate coupon. Please try again.');
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const calculateDiscount = (
    coupon: AppliedCoupon | null,
    subtotal: number
  ): number => {
    if (!coupon) return 0;

    switch (coupon.discount_type) {
      case 'percentage':
        return Math.min((subtotal * coupon.discount_value) / 100, subtotal);
      case 'fixed':
        return Math.min(coupon.discount_value, subtotal);
      case 'bogo':
      case 'free_item':
        // These are item-level discounts, not order-level
        return 0;
      default:
        return 0;
    }
  };

  return { validateCoupon, calculateDiscount, isValidating };
};

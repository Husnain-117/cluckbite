import React, { useState } from 'react';
import { Tag, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useCoupon } from '@/hooks/useCoupon';

const CouponInput = () => {
  const { subtotal, appliedCoupon, setAppliedCoupon, setDiscount } = useCart();
  const { validateCoupon, calculateDiscount, isValidating } = useCoupon();
  const [couponCode, setCouponCode] = useState('');

  const handleApply = async () => {
    const coupon = await validateCoupon(couponCode, subtotal);
    if (coupon) {
      setAppliedCoupon(coupon);
      setDiscount(calculateDiscount(coupon, subtotal));
      setCouponCode('');
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">{appliedCoupon.coupon_code}</p>
            <p className="text-xs text-muted-foreground">{appliedCoupon.title}</p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <Tag className="h-4 w-4" />
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <Input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="input-styled flex-1 uppercase"
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
        <Button
          onClick={handleApply}
          disabled={isValidating || !couponCode.trim()}
          variant="secondary"
          className="px-6"
        >
          {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
    </div>
  );
};

export default CouponInput;

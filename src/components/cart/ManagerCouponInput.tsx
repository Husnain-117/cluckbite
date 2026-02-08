import React, { useState } from 'react';
import { Tag, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCoupon, AppliedCoupon } from '@/hooks/useCoupon';

interface ManagerCouponInputProps {
  subtotal: number;
  onApply: (coupon: AppliedCoupon, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: AppliedCoupon | null;
  compact?: boolean;
}

const ManagerCouponInput = ({ subtotal, onApply, onRemove, appliedCoupon, compact = false }: ManagerCouponInputProps) => {
  const { validateCoupon, calculateDiscount, isValidating } = useCoupon();
  const [couponCode, setCouponCode] = useState('');

  const handleApply = async () => {
    const coupon = await validateCoupon(couponCode, subtotal);
    if (coupon) {
      onApply(coupon, calculateDiscount(coupon, subtotal));
      setCouponCode('');
    }
  };

  const handleRemove = () => {
    onRemove();
    setCouponCode('');
  };

  if (appliedCoupon) {
    return (
      <div className={`flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg ${compact ? 'p-1.5' : 'p-3'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckCircle className={`flex-shrink-0 text-primary ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
          <div className="min-w-0">
            <p className={`font-semibold text-primary truncate ${compact ? 'text-[10px]' : 'text-sm'}`}>{appliedCoupon.coupon_code}</p>
            {!compact && <p className="text-xs text-muted-foreground truncate">{appliedCoupon.title}</p>}
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        >
          <X className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <div className="relative flex-1">
        <Tag className={`absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
        <Input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Coupon code"
          className={`input-styled uppercase ${compact ? 'h-7 text-xs pl-7' : 'h-9 text-sm pl-8'}`}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
      </div>
      <Button
        onClick={handleApply}
        disabled={isValidating || !couponCode.trim()}
        variant="secondary"
        size="sm"
        className={compact ? 'h-7 px-3 text-xs' : 'h-9 px-4'}
      >
        {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
      </Button>
    </div>
  );
};

export default ManagerCouponInput;

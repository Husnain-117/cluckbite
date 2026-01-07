import React, { useState, useEffect } from 'react';
import { X, Tag, Clock, Gift, Percent } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  discount_value: number;
  offer_type: 'daily' | 'weekly' | 'special';
  end_date: string;
  coupon_code: string | null;
  minimum_order: number;
}

const OffersPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  const { data: offers } = useQuery({
    queryKey: ['active-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .order('offer_type', { ascending: true });
      if (error) throw error;
      return data as Offer[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Show popup after a delay when there are active offers
  useEffect(() => {
    if (offers && offers.length > 0) {
      // Check if user has dismissed the popup recently
      const lastDismissed = localStorage.getItem('offers_popup_dismissed');
      if (lastDismissed) {
        const dismissedTime = new Date(lastDismissed).getTime();
        const now = new Date().getTime();
        // Don't show for 1 hour after dismissal
        if (now - dismissedTime < 60 * 60 * 1000) {
          return;
        }
      }
      
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000); // Show after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [offers]);

  // Countdown timer
  useEffect(() => {
    if (!offers || offers.length === 0) return;

    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      offers.forEach((offer) => {
        const endTime = new Date(offer.end_date).getTime();
        const now = new Date().getTime();
        const diff = endTime - now;

        if (diff <= 0) {
          newCountdowns[offer.id] = 'Expired';
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            newCountdowns[offer.id] = `${days}d ${hours}h ${minutes}m`;
          } else if (hours > 0) {
            newCountdowns[offer.id] = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            newCountdowns[offer.id] = `${minutes}m ${seconds}s`;
          }
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [offers]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('offers_popup_dismissed', new Date().toISOString());
  };

  const getDiscountDisplay = (offer: Offer) => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% OFF`;
      case 'fixed':
        return `£${offer.discount_value} OFF`;
      case 'bogo':
        return 'Buy One Get One FREE!';
      case 'free_item':
        return 'FREE Item!';
      default:
        return '';
    }
  };

  const getOfferIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return <Clock className="h-5 w-5" />;
      case 'weekly':
        return <Tag className="h-5 w-5" />;
      case 'special':
        return <Gift className="h-5 w-5" />;
      default:
        return <Percent className="h-5 w-5" />;
    }
  };

  const getOfferTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return "Today's Deal";
      case 'weekly':
        return 'Weekly Special';
      case 'special':
        return 'Limited Offer';
      default:
        return 'Special Offer';
    }
  };

  if (!offers || offers.length === 0) return null;

  const currentOffer = offers[currentOfferIndex];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative bg-gradient-to-br from-primary via-primary to-secondary rounded-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-8 text-white text-center">
            {/* Offer Type Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              {getOfferIcon(currentOffer.offer_type)}
              <span className="font-medium">{getOfferTypeLabel(currentOffer.offer_type)}</span>
            </div>

            {/* Discount Display */}
            <div className="mb-4">
              <span className="text-5xl md:text-6xl font-heading font-bold">
                {getDiscountDisplay(currentOffer)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-heading font-semibold mb-2">
              {currentOffer.title}
            </h3>

            {/* Description */}
            {currentOffer.description && (
              <p className="text-white/80 mb-4">{currentOffer.description}</p>
            )}

            {/* Countdown Timer */}
            <div className="bg-black/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/70 mb-1">Offer expires in:</p>
              <p className="text-2xl font-mono font-bold">
                {countdowns[currentOffer.id] || 'Loading...'}
              </p>
            </div>

            {/* Coupon Code */}
            {currentOffer.coupon_code && (
              <div className="mb-6">
                <p className="text-sm text-white/70 mb-2">Use code:</p>
                <div className="inline-block bg-white text-primary font-mono font-bold text-xl px-6 py-3 rounded-lg">
                  {currentOffer.coupon_code}
                </div>
              </div>
            )}

            {/* Minimum Order */}
            {currentOffer.minimum_order > 0 && (
              <p className="text-sm text-white/70 mb-4">
                *Minimum order: £{currentOffer.minimum_order.toFixed(2)}
              </p>
            )}

            {/* Navigation Dots */}
            {offers.length > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {offers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentOfferIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentOfferIndex ? 'bg-white w-6' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* CTA Button */}
            <Button
              onClick={handleClose}
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 text-lg rounded-xl"
            >
              Order Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OffersPopup;

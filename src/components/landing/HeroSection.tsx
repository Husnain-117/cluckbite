import React, { useState } from 'react';
import { ArrowRight, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrderTypeModal from '@/components/modals/OrderTypeModal';
import { useRestaurantSettings, isRestaurantOpen } from '@/hooks/useRestaurantSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: settings } = useRestaurantSettings();
  
  const deliverySettings = settings?.deliverySettings;
  const deliveryTimeMin = deliverySettings?.delivery_time_min || 30;
  const deliveryTimeMax = deliverySettings?.delivery_time_max || 40;

  // Determine open/closed from real settings
  const { isOpen, message: closedMessage } = settings
    ? isRestaurantOpen(settings.operatingHours, settings.emergencyClosure)
    : { isOpen: true, message: '' };

  // Fetch a featured item with image for hero
  const { data: featuredItem } = useQuery({
    queryKey: ['featured-hero-item'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('title, image_url, category')
        .eq('is_featured', true)
        .eq('is_available', true)
        .not('image_url', 'is', null)
        .limit(1);
      
      if (error || !data || data.length === 0) return null;
      return data[0];
    },
  });

  // Fetch real average rating from approved reviews
  const { data: ratingData } = useQuery({
    queryKey: ['hero-rating'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('is_approved', true);
      if (error || !data || data.length === 0) return null;
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { avg: avg.toFixed(1), count: data.length };
    },
    staleTime: 1000 * 60 * 5,
  });

  const scrollToMenu = () => {
    const element = document.querySelector('#menu');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 border ${
              isOpen
                ? 'bg-card border-border'
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-destructive'}`} />
              <span className="text-sm text-muted-foreground">
                {isOpen ? 'Open for Orders' : (closedMessage || 'Currently Closed')}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 leading-tight tracking-tight">
              Crispy Juicy
              <br />
              <span className="text-primary">Unforgettable</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Premium wings, juicy burgers, and signature sides. 
              Made with quality ingredients, served hot to your door.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button 
                onClick={() => isOpen && setIsModalOpen(true)} 
                size="lg"
                disabled={!isOpen}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOpen ? (
                  <>Order Now <ArrowRight className="ml-2 h-5 w-5" /></>
                ) : (
                  'Currently Closed'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={scrollToMenu}
                size="lg"
                className="border-border hover:bg-muted h-12 text-base"
              >
                View Menu
              </Button>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{deliveryTimeMin}-{deliveryTimeMax} min delivery</span>
              </div>
              {ratingData && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                  <span>{ratingData.avg} rating ({ratingData.count} {ratingData.count === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>

          {/* Hero Image */}
          <div className="flex-1 w-full max-w-md lg:max-w-lg">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-muted to-card border border-border">
              {featuredItem?.image_url ? (
                <img 
                  src={featuredItem.image_url} 
                  alt={featuredItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-6xl">🍗</span>
                    </div>
                    <p className="text-lg font-heading font-semibold text-foreground">
                      Premium Wings
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Starting from £5.99
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderTypeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default HeroSection;

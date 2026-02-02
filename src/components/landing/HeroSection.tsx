import React, { useState } from 'react';
import { ArrowRight, MapPin, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrderTypeModal from '@/components/modals/OrderTypeModal';
import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: settings } = useRestaurantSettings();
  
  const deliverySettings = settings?.deliverySettings;
  const deliveryTimeMin = deliverySettings?.delivery_time_min || 30;
  const deliveryTimeMax = deliverySettings?.delivery_time_max || 40;

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

  const scrollToMenu = () => {
    const element = document.querySelector('#menu');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20 pb-12">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left animate-slide-up">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-border/50 shadow-lg">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-foreground">Now Open</span>
              <span className="w-px h-4 bg-border" />
              <span className="text-sm text-muted-foreground">Delivery Available</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-extrabold mb-6 leading-[0.9] tracking-tight">
              <span className="block">Crispy.</span>
              <span className="block gradient-text">Juicy.</span>
              <span className="block">Irresistible.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Experience the ultimate chicken feast with our signature crispy wings, 
              juicy burgers, and finger-licking good flavors. Made fresh, served hot.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button 
                onClick={() => setIsModalOpen(true)} 
                className="btn-primary text-lg px-8 py-6 group shadow-xl shadow-primary/20"
              >
                Order Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                onClick={scrollToMenu}
                className="btn-outline text-lg px-8 py-6"
              >
                Explore Menu
              </Button>
            </div>

            {/* Quick Info Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">£2 for 3mi (+£0.50/mi)</span>
              </div>
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">{deliveryTimeMin}-{deliveryTimeMax} min delivery</span>
              </div>
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
                <Star className="h-4 w-4 text-secondary fill-secondary" />
                <span className="text-sm font-medium">4.9 Rating</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Visual */}
          <div className="flex-1 relative animate-fade-in w-full max-w-lg lg:max-w-xl" style={{ animationDelay: '0.3s' }}>
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-3xl blur-3xl opacity-60 scale-110" />
              
              {/* Main hero visual */}
              <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-card via-card to-muted border border-border/50 overflow-hidden shadow-2xl">
                {featuredItem?.image_url ? (
                  <img 
                    src={featuredItem.image_url} 
                    alt={featuredItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <span className="text-[120px] md:text-[160px] drop-shadow-2xl filter">🍗</span>
                      <p className="text-xl md:text-2xl font-heading font-bold gradient-text mt-4">
                        Premium Wings
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>

              {/* Floating badges */}
              <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl font-bold text-sm shadow-xl animate-bounce-gentle">
                🔥 HOT & SPICY
              </div>
              <div className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4 bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl font-bold text-sm shadow-xl animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
                ⭐ Best Seller
              </div>
              
              {/* Price badge */}
              <div className="absolute top-1/2 -right-4 md:-right-6 transform -translate-y-1/2 bg-card border border-border shadow-xl rounded-2xl p-3 md:p-4 hidden md:block">
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-2xl font-heading font-bold text-primary">£5.99</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-muted-foreground/30 rounded-full animate-pulse" />
        </div>
      </div>

      <OrderTypeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default HeroSection;

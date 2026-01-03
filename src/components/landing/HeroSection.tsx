import React, { useState } from 'react';
import { ArrowRight, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrderTypeModal from '@/components/modals/OrderTypeModal';

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToMenu = () => {
    const element = document.querySelector('#menu');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/90" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-card rounded-full px-4 py-2 mb-6 border border-border">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Now Open • Delivery Available</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight">
              Crispy.{' '}
              <span className="gradient-text">Juicy.</span>{' '}
              <br className="hidden md:block" />
              Unforgettable.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Experience the ultimate chicken feast with our signature crispy wings, 
              juicy burgers, and finger-licking good flavors. Made fresh, served hot.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button 
                onClick={() => setIsModalOpen(true)} 
                className="btn-primary text-lg px-8 py-6 group"
              >
                Order Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                onClick={scrollToMenu}
                className="btn-outline text-lg px-8 py-6"
              >
                View Menu
              </Button>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Free delivery within 5km</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5 text-primary" />
                <span>20-30 min delivery</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Visual */}
          <div className="flex-1 relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full max-w-lg mx-auto">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full blur-3xl opacity-50" />
              
              {/* Main hero visual - placeholder for food image */}
              <div className="relative aspect-square rounded-full bg-gradient-to-br from-card to-muted border-4 border-primary/20 flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  <span className="text-8xl">🍗</span>
                  <p className="text-2xl font-heading font-bold gradient-text mt-4">
                    Premium Wings
                  </p>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold text-sm animate-bounce-gentle">
                🔥 HOT & SPICY
              </div>
              <div className="absolute -bottom-4 -left-4 bg-secondary text-secondary-foreground px-4 py-2 rounded-full font-bold text-sm animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
                ⭐ 4.9 Rating
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>

      <OrderTypeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default HeroSection;

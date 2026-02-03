import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const MenuPreviewSection = () => {
  const { addItem } = useCart();

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['featured-menu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_featured', true)
        .eq('is_available', true)
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.id,
      title: item.title,
      price: Number(item.price),
      image_url: item.image_url,
    });
    toast.success(`${item.title} added to cart!`);
  };

  return (
    <section id="menu" className="section-padding bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            Featured Favorites
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our most loved dishes, made with premium ingredients
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            menuItems?.map((item) => (
              <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary/50 transition-colors">
                {/* Image */}
                <div className="relative h-48 bg-muted overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-card">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-3xl">🍗</span>
                      </div>
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-heading font-bold text-primary">
                      £{Number(item.price).toFixed(2)}
                    </span>
                    <Button
                      onClick={() => handleAddToCart(item)}
                      size="icon"
                      className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View Full Menu CTA */}
        <div className="text-center">
          <Link to="/menu">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
              View Full Menu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MenuPreviewSection;

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

  const categoryEmojis: Record<string, string> = {
    'Wings': '🍗',
    'Burgers': '🍔',
    'Sides': '🍟',
    'Tenders': '🍖',
    'Beverages': '🥤',
    'Desserts': '🍰',
  };

  return (
    <section id="menu" className="section-padding bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-4">
            Our Menu
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Featured <span className="gradient-text">Favorites</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our most loved dishes, prepared with premium ingredients and packed with flavor
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-menu">
                <Skeleton className="h-48 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            menuItems?.map((item) => (
              <div key={item.id} className="card-menu group">
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-muted to-background overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">
                        {categoryEmojis[item.category] || '🍽️'}
                      </span>
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="badge-featured">{item.category}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-heading font-bold text-secondary">
                      £{Number(item.price).toFixed(2)}
                    </span>
                    <Button
                      onClick={() => handleAddToCart(item)}
                      size="icon"
                      className="rounded-full bg-primary hover:bg-primary/90 h-11 w-11"
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
            <Button className="btn-primary text-lg px-8 py-6 group">
              View Full Menu
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MenuPreviewSection;

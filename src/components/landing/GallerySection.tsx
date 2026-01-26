import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const GallerySection = () => {
  const [selectedImage, setSelectedImage] = useState<{ title: string; image_url: string; category: string } | null>(null);

  // Fetch featured menu items with images for gallery
  const { data: galleryItems = [], isLoading } = useQuery({
    queryKey: ['gallery-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, title, image_url, category')
        .eq('is_available', true)
        .not('image_url', 'is', null)
        .limit(8);
      
      if (error) throw error;
      return data.filter(item => item.image_url);
    },
  });

  // Fallback gallery for when no images exist
  const fallbackGallery = [
    { id: '1', title: 'Crispy Wings', image_url: '', category: 'Wings', emoji: '🍗' },
    { id: '2', title: 'Chicken Burger', image_url: '', category: 'Burgers', emoji: '🍔' },
    { id: '3', title: 'Loaded Fries', image_url: '', category: 'Fries', emoji: '🍟' },
    { id: '4', title: 'Fresh Drinks', image_url: '', category: 'Drinks', emoji: '🥤' },
    { id: '5', title: 'Tender Strips', image_url: '', category: 'Tenders', emoji: '🍖' },
    { id: '6', title: 'Spicy Special', image_url: '', category: 'Special', emoji: '🌶️' },
  ];

  const displayItems = galleryItems.length > 0 ? galleryItems : fallbackGallery;

  const categoryEmojis: Record<string, string> = {
    'Chicken Burgers': '🍔',
    'Smash Burgers': '🍔',
    'Wings': '🍗',
    'Tenders & Wings': '🍗',
    'Fries': '🍟',
    'Drinks': '🥤',
    'Sides': '🍟',
    'Dessert': '🍰',
    'Wrap': '🌯',
    'Doner': '🥙',
    'Rice Bowl': '🍚',
    'Meals': '🍽️',
  };

  return (
    <section id="gallery" className="section-padding bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-4 border border-primary/20">
            Our Gallery
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            Feast Your <span className="gradient-text">Eyes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From our kitchen to your table — every dish crafted with passion and premium ingredients
          </p>
        </div>

        {/* Gallery Grid - Masonry-style layout */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[250px]">
            {displayItems.map((item, index) => {
              // Create visual variety with different spans
              const isLarge = index === 0 || index === 3;
              const isTall = index === 2 || index === 5;
              
              return (
                <button
                  key={item.id}
                  onClick={() => item.image_url && setSelectedImage({ 
                    title: item.title, 
                    image_url: item.image_url, 
                    category: item.category 
                  })}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted border border-border 
                    hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10
                    ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}
                    ${isTall ? 'row-span-2' : ''}`}
                >
                  {item.image_url ? (
                    <>
                      <img 
                        src={item.image_url} 
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-background">
                      <span className={`${isLarge ? 'text-8xl md:text-9xl' : 'text-6xl md:text-7xl'} group-hover:scale-110 transition-transform duration-500 filter drop-shadow-lg`}>
                        {(item as any).emoji || categoryEmojis[item.category] || '🍽️'}
                      </span>
                    </div>
                  )}
                  
                  {/* Info overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="bg-card/95 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border/50">
                      <span className="text-xs text-primary font-medium uppercase tracking-wider">{item.category}</span>
                      <h3 className="font-heading font-bold text-base md:text-lg mt-1">{item.title}</h3>
                    </div>
                  </div>
                  
                  {/* Corner badge */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      View
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            Follow us on social media for daily specials and behind-the-scenes content
          </p>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl bg-card border-border p-0 overflow-hidden">
          {selectedImage?.image_url && (
            <div className="relative">
              <img 
                src={selectedImage.image_url} 
                alt={selectedImage.title}
                className="w-full max-h-[70vh] object-contain bg-muted"
              />
              <div className="p-6 bg-gradient-to-t from-card to-card/80">
                <span className="text-sm text-primary font-medium uppercase tracking-wider">{selectedImage.category}</span>
                <h3 className="text-2xl font-heading font-bold mt-1">{selectedImage.title}</h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GallerySection;

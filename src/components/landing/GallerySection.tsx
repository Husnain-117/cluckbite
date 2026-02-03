import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

const GallerySection = () => {
  const [selectedImage, setSelectedImage] = useState<{ title: string; image_url: string; category: string } | null>(null);

  // Fetch menu items with images for gallery
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

  // Only show section if we have real images
  if (!isLoading && galleryItems.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="section-padding bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            Our Menu Gallery
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Fresh from our kitchen — crafted with passion and premium ingredients
          </p>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryItems.map((item, index) => {
              const isLarge = index === 0 || index === 5;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedImage({ 
                    title: item.title, 
                    image_url: item.image_url!, 
                    category: item.category 
                  })}
                  className={`group relative overflow-hidden rounded-xl bg-card border border-border 
                    hover:border-primary/50 transition-all duration-300
                    ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
                >
                  <div className={`${isLarge ? 'aspect-square' : 'aspect-square'}`}>
                    <img 
                      src={item.image_url!} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Info on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-xs text-primary font-medium">{item.category}</span>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl bg-card border-border p-0 overflow-hidden">
          {selectedImage?.image_url && (
            <div>
              <img 
                src={selectedImage.image_url} 
                alt={selectedImage.title}
                className="w-full max-h-[70vh] object-contain bg-muted"
              />
              <div className="p-6">
                <span className="text-sm text-primary font-medium">{selectedImage.category}</span>
                <h3 className="text-xl font-heading font-bold mt-1">{selectedImage.title}</h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GallerySection;

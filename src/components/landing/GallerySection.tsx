import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const galleryImages = [
  { id: 1, emoji: '🍗', label: 'Crispy Wings' },
  { id: 2, emoji: '🍔', label: 'Chicken Burger' },
  { id: 3, emoji: '🍟', label: 'Loaded Fries' },
  { id: 4, emoji: '🥤', label: 'Fresh Drinks' },
  { id: 5, emoji: '🍖', label: 'Tender Strips' },
  { id: 6, emoji: '🌶️', label: 'Spicy Special' },
  { id: 7, emoji: '🍰', label: 'Sweet Desserts' },
  { id: 8, emoji: '👨‍🍳', label: 'Our Kitchen' },
];

const GallerySection = () => {
  const [selectedImage, setSelectedImage] = useState<typeof galleryImages[0] | null>(null);

  return (
    <section id="gallery" className="section-padding bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-4">
            Gallery
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Feast Your <span className="gradient-text">Eyes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A visual journey through our delicious creations
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className={`group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-500 ${
                index === 0 || index === 5 ? 'md:row-span-2' : ''
              }`}
              style={{
                aspectRatio: index === 0 || index === 5 ? '1/1.5' : '1/1',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-background flex items-center justify-center">
                <span className={`${index === 0 || index === 5 ? 'text-8xl' : 'text-6xl'} group-hover:scale-110 transition-transform duration-500`}>
                  {image.emoji}
                </span>
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="font-heading font-semibold text-lg">{image.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
          <div className="relative aspect-square bg-gradient-to-br from-muted to-background flex items-center justify-center">
            <span className="text-[200px]">{selectedImage?.emoji}</span>
          </div>
          <div className="p-6 text-center">
            <h3 className="text-2xl font-heading font-bold">{selectedImage?.label}</h3>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GallerySection;

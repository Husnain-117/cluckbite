import React from 'react';
import { Star, Quote } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    initials: 'SJ',
    rating: 5,
    text: "Best wings I've ever had! The crispy coating and the sauces are absolutely incredible. My go-to place for chicken now.",
    date: '2 weeks ago',
  },
  {
    id: 2,
    name: 'Mike Thompson',
    initials: 'MT',
    rating: 5,
    text: "The spicy buffalo wings are addictive. Fast delivery and the food arrived hot and fresh. Highly recommend!",
    date: '1 month ago',
  },
  {
    id: 3,
    name: 'Emily Chen',
    initials: 'EC',
    rating: 5,
    text: "Perfect for family dinners. Everyone loves the variety - from mild to extra spicy. Great quality every time!",
    date: '3 weeks ago',
  },
  {
    id: 4,
    name: 'David Wilson',
    initials: 'DW',
    rating: 5,
    text: "Been ordering from Cluck Bite for months now. Consistent quality, great customer service, and amazing taste!",
    date: '1 week ago',
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="section-padding bg-muted/20">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real reviews from real customers who love our food
          </p>
        </div>

        {/* Testimonials Carousel */}
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-4">
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2">
                <div className="bg-card rounded-2xl border border-border p-6 h-full flex flex-col">
                  {/* Quote Icon */}
                  <Quote className="h-6 w-6 text-primary/40 mb-4" />

                  {/* Rating */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-foreground/90 mb-6 flex-1 leading-relaxed text-sm md:text-base">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {testimonial.initials}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.date}</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>

        {/* Trust Indicators - Simplified */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-border/50">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-foreground">4.9</p>
            <p className="text-xs text-muted-foreground">Average Rating</p>
          </div>
          <div className="w-px bg-border hidden sm:block" />
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-foreground">10K+</p>
            <p className="text-xs text-muted-foreground">Happy Customers</p>
          </div>
          <div className="w-px bg-border hidden sm:block" />
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-foreground">98%</p>
            <p className="text-xs text-muted-foreground">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

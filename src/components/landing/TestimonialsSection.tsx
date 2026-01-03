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
    avatar: '👩',
    rating: 5,
    text: "Best wings I've ever had! The crispy coating and the sauces are absolutely incredible. My go-to place for chicken now.",
    date: '2 weeks ago',
  },
  {
    id: 2,
    name: 'Mike Thompson',
    avatar: '👨',
    rating: 5,
    text: "The spicy buffalo wings are addictive. Fast delivery and the food arrived hot and fresh. Highly recommend!",
    date: '1 month ago',
  },
  {
    id: 3,
    name: 'Emily Chen',
    avatar: '👩‍🦱',
    rating: 5,
    text: "Perfect for family dinners. Everyone loves the variety - from mild to extra spicy. Great quality every time!",
    date: '3 weeks ago',
  },
  {
    id: 4,
    name: 'David Wilson',
    avatar: '🧔',
    rating: 5,
    text: "Been ordering from Cluck Bite for months now. Consistent quality, great customer service, and amazing taste!",
    date: '1 week ago',
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="section-padding">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            What Our <span className="gradient-text">Customers</span> Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it - hear from our happy customers
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
              <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                <div className="card-elevated p-6 h-full flex flex-col">
                  {/* Quote Icon */}
                  <div className="mb-4">
                    <Quote className="h-8 w-8 text-primary/30" />
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-foreground/90 mb-6 flex-1 leading-relaxed">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-heading font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.date}</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 pt-12 border-t border-border">
          <div className="text-center">
            <p className="text-3xl font-heading font-bold gradient-text">4.9★</p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-heading font-bold gradient-text">10K+</p>
            <p className="text-sm text-muted-foreground">Reviews</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-heading font-bold gradient-text">98%</p>
            <p className="text-sm text-muted-foreground">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

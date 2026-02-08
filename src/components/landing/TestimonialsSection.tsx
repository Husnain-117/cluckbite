import React, { useState } from 'react';
import { Star, Quote, MessageSquare, Send } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const TestimonialsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Fetch approved reviews from DB
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['public-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const name = user ? (customerName || user.email?.split('@')[0] || 'Anonymous') : customerName;
      if (!name.trim()) throw new Error('Please enter your name');
      if (!reviewText.trim()) throw new Error('Please write a review');

      const { error } = await supabase.from('reviews').insert({
        user_id: user?.id || null,
        customer_name: name.trim(),
        rating,
        review_text: reviewText.trim(),
        is_approved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review submitted! It will appear after approval.');
      setReviewText('');
      setRating(5);
      setCustomerName('');
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['public-reviews'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit review'),
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <section id="testimonials" className="section-padding bg-muted/20">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Real reviews from real customers who love our food
          </p>

          {/* Write Review Button */}
          {user ? (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave a Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={user.email?.split('@')[0] || 'Your name'}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              star <= (hoverRating || rating)
                                ? 'fill-secondary text-secondary'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Your Review</Label>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us about your experience..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full btn-primary"
                    onClick={() => submitReview.mutate()}
                    disabled={submitReview.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your review will be visible after approval.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-sm text-muted-foreground">
              <a href="/auth" className="text-primary hover:underline">Login</a> to leave a review
            </p>
          )}
        </div>

        {/* Reviews Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border max-w-md mx-auto">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No Reviews Yet</h3>
            <p className="text-muted-foreground text-sm">
              Be the first to share your experience!
            </p>
          </div>
        ) : (
          <>
            {/* Testimonials Carousel */}
            <Carousel
              opts={{ align: 'start', loop: true }}
              className="w-full max-w-5xl mx-auto"
            >
              <CarouselContent className="-ml-4">
                {reviews.map((review) => (
                  <CarouselItem key={review.id} className="pl-4 md:basis-1/2">
                    <div className="bg-card rounded-2xl border border-border p-6 h-full flex flex-col">
                      <Quote className="h-6 w-6 text-primary/40 mb-4" />
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                        ))}
                        {Array.from({ length: 5 - review.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
                        ))}
                      </div>
                      <p className="text-foreground/90 mb-6 flex-1 leading-relaxed text-sm md:text-base">
                        "{review.review_text}"
                      </p>
                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {review.customer_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{review.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </p>
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
            <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-heading font-bold text-foreground">{avgRating}</p>
                <p className="text-xs text-muted-foreground">Average Rating</p>
              </div>
              <div className="w-px bg-border hidden sm:block" />
              <div className="text-center">
                <p className="text-2xl font-heading font-bold text-foreground">{reviews.length}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;

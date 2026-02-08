import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Trash2, Check, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ReviewsManagement = () => {
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: approved })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review updated');
    },
    onError: () => toast.error('Failed to update review'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted');
    },
    onError: () => toast.error('Failed to delete review'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">Reviews Management</h2>
          <p className="text-muted-foreground">Approve, reject, or delete customer reviews</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{reviews.length} Total</Badge>
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            {reviews.filter(r => r.is_approved).length} Approved
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            {reviews.filter(r => !r.is_approved).length} Pending
          </Badge>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No Reviews Yet</h3>
          <p className="text-muted-foreground">Customer reviews will appear here once submitted.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-card rounded-xl border p-5 flex flex-col sm:flex-row gap-4 ${
                review.is_approved ? 'border-border' : 'border-yellow-500/30 bg-yellow-500/5'
              }`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold">{review.customer_name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                    {Array.from({ length: 5 - review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
                    ))}
                  </div>
                  <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
                <p className="text-foreground/80 text-sm">{review.review_text}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </p>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                {!review.is_approved ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                    onClick={() => approveMutation.mutate({ id: review.id, approved: true })}
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
                    onClick={() => approveMutation.mutate({ id: review.id, approved: false })}
                  >
                    <X className="h-4 w-4 mr-1" /> Unapprove
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm('Delete this review permanently?')) {
                      deleteMutation.mutate(review.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;

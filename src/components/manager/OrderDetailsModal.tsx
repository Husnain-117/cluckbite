import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

const statusActions: Record<string, { next: string; label: string; color: string }[]> = {
  pending: [
    { next: 'approved', label: 'Approve Order', color: 'bg-green-500 hover:bg-green-600' },
    { next: 'rejected', label: 'Reject Order', color: 'bg-destructive hover:bg-destructive/90' },
  ],
  approved: [
    { next: 'preparing', label: 'Start Preparing', color: 'bg-purple-500 hover:bg-purple-600' },
  ],
  preparing: [
    { next: 'ready', label: 'Mark as Ready', color: 'bg-blue-500 hover:bg-blue-600' },
  ],
  ready: [
    { next: 'completed', label: 'Mark as Completed', color: 'bg-green-500 hover:bg-green-600' },
  ],
};

const rejectionReasons = [
  'Items out of stock',
  'Restaurant closed',
  'Delivery area not covered',
  'Payment issue',
  'Other',
];

const OrderDetailsModal = ({ order, onClose }: OrderDetailsModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');

  const { data: statusHistory = [] } = useQuery({
    queryKey: ['order-status-history', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: string; notes?: string }) => {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          order_status: newStatus as "pending" | "approved" | "preparing" | "ready" | "completed" | "rejected", 
          updated_at: new Date().toISOString() 
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Insert status history
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: newStatus,
          changed_by: user?.id,
          notes: notes || null,
        });

      if (historyError) throw historyError;

      // Create notification for customer (if they have an account)
      const statusMessages: Record<string, string> = {
        approved: `Your order #${order.order_number} has been approved!`,
        preparing: `Your order #${order.order_number} is now being prepared.`,
        ready: `Your order #${order.order_number} is ready for ${order.order_type}!`,
        completed: `Your order #${order.order_number} has been completed. Thank you!`,
        rejected: `Your order #${order.order_number} has been rejected. ${notes || ''}`,
      };

      if (statusMessages[newStatus]) {
        await supabase.from('notifications').insert({
          recipient_role: 'admin',
          order_id: order.id,
          message: `Order #${order.order_number} status changed to ${newStatus}`,
          notification_type: 'status_update',
        });
      }
    },
    onSuccess: () => {
      toast.success('Order status updated!');
      queryClient.invalidateQueries({ queryKey: ['manager-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-status-history', order.id] });
      setShowRejectForm(false);
      onClose();
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'rejected') {
      setShowRejectForm(true);
    } else {
      updateStatus.mutate({ newStatus });
    }
  };

  const handleReject = () => {
    if (!rejectionReason) {
      toast.error('Please select a rejection reason');
      return;
    }
    updateStatus.mutate({
      newStatus: 'rejected',
      notes: `${rejectionReason}${rejectionNotes ? `: ${rejectionNotes}` : ''}`,
    });
  };

  const printReceipt = () => {
    const receiptContent = `
      <html>
        <head>
          <title>Order Receipt - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h1 { text-align: center; }
            .header { text-align: center; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cluck Bite</h1>
            <p>Order Receipt</p>
          </div>
          <div class="divider"></div>
          <p><strong>Order:</strong> ${order.order_number}</p>
          <p><strong>Date:</strong> ${format(new Date(order.created_at), 'PPpp')}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Type:</strong> ${order.order_type}</p>
          <div class="divider"></div>
          ${order.order_items?.map((item: any) => `
            <div class="item">
              <span>${item.quantity}x ${item.item_title}</span>
              <span>$${Number(item.total_price).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>Subtotal</span>
            <span>$${Number(order.subtotal).toFixed(2)}</span>
          </div>
          ${order.delivery_charges > 0 ? `
            <div class="item">
              <span>Delivery</span>
              <span>$${Number(order.delivery_charges).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item total">
            <span>Total</span>
            <span>$${Number(order.total_amount).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <p style="text-align: center; margin-top: 20px;">Thank you for your order!</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const actions = statusActions[order.order_status] || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-heading text-2xl">Order {order.order_number}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              order.order_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
              order.order_status === 'rejected' ? 'bg-red-500/10 text-red-500' :
              'bg-green-500/10 text-green-500'
            }`}>
              {order.order_status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card-elevated p-4 space-y-3">
            <h3 className="font-heading font-semibold">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${order.customer_phone}`} className="hover:text-primary">
                  {order.customer_phone}
                </a>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href={`mailto:${order.customer_email}`} className="hover:text-primary">
                  {order.customer_email}
                </a>
              </div>
              {order.delivery_address && (
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <span>{order.delivery_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Type & Time */}
          <div className="flex gap-4">
            <div className="card-elevated p-4 flex-1 flex items-center gap-3">
              {order.order_type === 'delivery' ? (
                <Truck className="h-6 w-6 text-primary" />
              ) : (
                <Store className="h-6 w-6 text-secondary" />
              )}
              <div>
                <p className="font-semibold capitalize">{order.order_type}</p>
                {order.distance_km && (
                  <p className="text-sm text-muted-foreground">{order.distance_km} km</p>
                )}
              </div>
            </div>
            <div className="card-elevated p-4 flex-1 flex items-center gap-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-semibold">{format(new Date(order.created_at), 'PPp')}</p>
                <p className="text-sm text-muted-foreground">Order placed</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card-elevated p-4">
            <h3 className="font-heading font-semibold mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.item_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">${Number(item.total_price).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                {order.delivery_charges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>${Number(order.delivery_charges).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-heading font-bold text-lg">
                  <span>Total</span>
                  <span className="text-secondary">${Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="card-elevated p-4">
            <h3 className="font-heading font-semibold mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {order.payment_method === 'card' ? (
                  <CreditCard className="h-4 w-4 text-primary" />
                ) : (
                  <Banknote className="h-4 w-4 text-green-500" />
                )}
                <span className="capitalize">{order.payment_method}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit ${
                order.payment_status === 'completed' ? 'bg-green-500/10 text-green-500' :
                order.payment_status === 'partial' ? 'bg-orange-500/10 text-orange-500' :
                'bg-yellow-500/10 text-yellow-500'
              }`}>
                {order.payment_status === 'completed' ? <CheckCircle className="h-3 w-3" /> :
                 order.payment_status === 'partial' ? <AlertCircle className="h-3 w-3" /> :
                 <Clock className="h-3 w-3" />}
                {order.payment_status}
              </div>
              {order.amount_paid_online > 0 && (
                <div>
                  <span className="text-muted-foreground">Paid Online: </span>
                  <span className="font-medium">${Number(order.amount_paid_online).toFixed(2)}</span>
                </div>
              )}
              {order.amount_due_cod > 0 && (
                <div>
                  <span className="text-muted-foreground">Due COD: </span>
                  <span className="font-medium">${Number(order.amount_due_cod).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="card-elevated p-4">
              <h3 className="font-heading font-semibold mb-2">Special Instructions</h3>
              <p className="text-muted-foreground">{order.special_instructions}</p>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-heading font-semibold mb-3">Status History</h3>
              <div className="space-y-3">
                {statusHistory.map((history: any) => (
                  <div key={history.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium capitalize">{history.status}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(history.created_at), 'PPp')}
                      </p>
                      {history.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="card-elevated p-4 border-destructive">
              <h3 className="font-heading font-semibold mb-4 text-destructive">Reject Order</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Select value={rejectionReason} onValueChange={setRejectionReason}>
                    <SelectTrigger className="input-styled">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {rejectionReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="input-styled"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={updateStatus.isPending}
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                  >
                    {updateStatus.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Print Receipt */}
            <Button variant="outline" onClick={printReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>

            {/* Status Actions */}
            {!showRejectForm && actions.map((action) => (
              <Button
                key={action.next}
                onClick={() => handleStatusChange(action.next)}
                disabled={updateStatus.isPending}
                className={`flex-1 ${action.color} text-white`}
              >
                {updateStatus.isPending ? 'Updating...' : action.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;

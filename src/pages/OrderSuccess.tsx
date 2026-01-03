import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  React.useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F2994A', '#F2C94C', '#EB5757'],
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-slide-up">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-green-500/10 rounded-full flex items-center justify-center animate-pulse-glow">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Order Confirmed */}
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
          Order Confirmed! 🎉
        </h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your order. We've received your request and are preparing your delicious meal.
        </p>

        {/* Order Number */}
        {orderNumber && (
          <div className="card-elevated p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-2">Order Number</p>
            <p className="text-2xl font-heading font-bold text-primary">{orderNumber}</p>
          </div>
        )}

        {/* Estimated Time */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Estimated Time</p>
            <p className="font-semibold">20-30 mins</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-secondary/10 rounded-full flex items-center justify-center mb-2">
              <MapPin className="h-6 w-6 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold text-secondary">Processing</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-heading font-semibold mb-4">What's Next?</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              <span>We're preparing your order with care</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</span>
              <span>You'll receive a confirmation email shortly</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</span>
              <span>Track your order status in real-time</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={`/track-order?order=${orderNumber}`} className="flex-1">
            <Button className="w-full btn-primary group">
              Track Order
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/menu" className="flex-1">
            <Button variant="outline" className="w-full btn-outline">
              Order More
            </Button>
          </Link>
        </div>

        {/* Back to Home */}
        <Link to="/" className="inline-block mt-8 text-muted-foreground hover:text-primary transition-colors">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;

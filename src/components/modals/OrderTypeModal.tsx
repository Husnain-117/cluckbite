import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Store, MapPin, Mail, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

// Restaurant location (example coordinates - replace with actual)
const RESTAURANT_LAT = 51.5074;
const RESTAURANT_LNG = -0.1278;
const BASE_DELIVERY_CHARGE = 2.0;
const CHARGE_PER_KM = 0.5;
const FREE_KM = 2;

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderTypeModal = ({ isOpen, onClose }: OrderTypeModalProps) => {
  const navigate = useNavigate();
  const { setDeliveryInfo } = useCart();
  const [step, setStep] = useState<'select' | 'delivery-details'>('select');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pinLocation, setPinLocation] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateDeliveryCharges = (distanceKm: number) => {
    if (distanceKm <= FREE_KM) {
      return BASE_DELIVERY_CHARGE;
    }
    return BASE_DELIVERY_CHARGE + (distanceKm - FREE_KM) * CHARGE_PER_KM;
  };

  const handleCalculateDistance = () => {
    if (!pinLocation.trim()) {
      toast.error('Please enter your postal/pin code');
      return;
    }

    setIsCalculating(true);
    
    // Simulate distance calculation (in real app, use Google Maps API)
    setTimeout(() => {
      // Random distance between 1-15km for demo
      const calculatedDistance = Math.round((Math.random() * 14 + 1) * 10) / 10;
      const charges = calculateDeliveryCharges(calculatedDistance);
      
      setDistance(calculatedDistance);
      setDeliveryCharges(charges);
      setIsCalculating(false);
    }, 1000);
  };

  const handleSelectDelivery = () => {
    setStep('delivery-details');
  };

  const handleSelectCollection = () => {
    setDeliveryInfo({
      type: 'collection',
      email: email || undefined,
    });
    onClose();
    navigate('/menu');
  };

  const handleProceedToMenu = () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter your delivery address');
      return;
    }
    if (distance === null) {
      toast.error('Please calculate delivery distance first');
      return;
    }

    setDeliveryInfo({
      type: 'delivery',
      email,
      address,
      pinLocation,
      distance,
      deliveryCharges,
    });
    onClose();
    navigate('/menu');
  };

  const handleClose = () => {
    setStep('select');
    setEmail('');
    setAddress('');
    setPinLocation('');
    setDistance(null);
    setDeliveryCharges(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-center">
            {step === 'select' ? 'How would you like your order?' : 'Delivery Details'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
            {/* Delivery Option */}
            <button
              onClick={handleSelectDelivery}
              className="group card-elevated p-6 text-center hover:border-primary transition-all duration-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Get your order delivered to your doorstep
              </p>
            </button>

            {/* Collection Option */}
            <button
              onClick={handleSelectCollection}
              className="group card-elevated p-6 text-center hover:border-secondary transition-all duration-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Store className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Collection</h3>
              <p className="text-sm text-muted-foreground">
                Pick up your order from our store
              </p>
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-styled"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Street Name, City"
                className="input-styled"
              />
            </div>

            {/* Pin Location */}
            <div className="space-y-2">
              <Label htmlFor="pinLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Postal/Pin Code *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pinLocation"
                  value={pinLocation}
                  onChange={(e) => setPinLocation(e.target.value)}
                  placeholder="Enter postal code"
                  className="input-styled flex-1"
                />
                <Button
                  type="button"
                  onClick={handleCalculateDistance}
                  disabled={isCalculating}
                  variant="secondary"
                  className="px-6"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate'}
                </Button>
              </div>
            </div>

            {/* Distance & Charges */}
            {distance !== null && (
              <div className="bg-muted rounded-xl p-4 space-y-2 animate-slide-up">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance from restaurant:</span>
                  <span className="font-semibold">{distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery charges:</span>
                  <span className="font-semibold text-primary">${deliveryCharges.toFixed(2)}</span>
                </div>
                {distance <= FREE_KM && (
                  <p className="text-sm text-green-500 font-medium">
                    🎉 You qualify for minimum delivery charge!
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleProceedToMenu}
                className="flex-1 btn-primary group"
              >
                Proceed to Menu
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderTypeModal;

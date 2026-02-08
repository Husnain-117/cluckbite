import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Store, MapPin, Phone, ArrowRight, User, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Restaurant location: 1 Cowbridge Road West, Ely Cardiff
const RESTAURANT_LAT = 51.4866;
const RESTAURANT_LNG = -3.2454;

// UK postcodes for distance calculation (approximate miles from Cardiff Ely)
const cardiffPostcodeDistances: Record<string, number> = {
  'CF5': 1.5, // Ely, Caerau - very close
  'CF11': 2.5, // Canton, Pontcanna
  'CF14': 3.5, // Whitchurch, Heath
  'CF10': 3, // City Centre
  'CF24': 3.5, // Roath, Plasnewydd
  'CF23': 4.5, // Pontprennau, Pentwyn
  'CF3': 5, // Rumney, St Mellons
  'CF15': 5, // Radyr, Tongwynlais
  'CF64': 6, // Penarth, Dinas Powys
  'CF62': 7, // Barry
  'CF63': 7.5, // Barry
  'CF71': 8, // Cowbridge area
  'CF83': 7, // Caerphilly
  'CF82': 8, // Rhymney
  'CF37': 10, // Pontypridd
  'CF38': 9, // Llantrisant
  'CF72': 6, // Miskin, Talbot Green
  'CF35': 12, // Bridgend area
  'CF31': 15, // Bridgend
  'CF32': 14, // Bridgend
  'CF33': 16, // Bridgend
  'CF34': 17, // Maesteg
  'CF39': 12, // Tonypandy
  'CF40': 11, // Treorchy
  'CF41': 13, // Mountain Ash
  'CF42': 14, // Aberdare area
  'CF43': 15, // Ferndale
  'CF44': 16, // Aberdare
  'CF45': 17, // Mountain Ash
  'CF46': 10, // Treharris
  'CF47': 14, // Merthyr Tydfil
  'CF48': 15, // Merthyr Tydfil
  'NP10': 8, // Newport area
  'NP20': 12, // Newport
  'NP19': 11, // Newport
  'NP18': 9, // Caerleon
  'NP44': 10, // Cwmbran
};

// Delivery charge tiers in miles (GBP)
const getDeliveryCharge = (miles: number): number => {
  // £2 for first 3 miles, then £0.50 per additional mile
  if (miles <= 3) return 2.00;
  return 2.00 + Math.ceil(miles - 3) * 0.50;
};

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderTypeModal = ({ isOpen, onClose }: OrderTypeModalProps) => {
  const navigate = useNavigate();
  const { setDeliveryInfo } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'auth-choice' | 'delivery-details'>('select');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pinLocation, setPinLocation] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateDeliveryCharges = (distanceMiles: number) => {
    return getDeliveryCharge(distanceMiles);
  };

  const getDistanceFromPostcode = (postcode: string): number | null => {
    const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
    // Try both 2-digit (CF10) and 1-digit (CF5) outward code matches
    const match2 = cleanPostcode.match(/^([A-Z]{1,2}\d{2})/);
    const match1 = cleanPostcode.match(/^([A-Z]{1,2}\d)/);
    
    let outwardCode: string | null = null;
    if (match2 && cardiffPostcodeDistances[match2[1]] !== undefined) {
      outwardCode = match2[1];
    } else if (match1 && cardiffPostcodeDistances[match1[1]] !== undefined) {
      outwardCode = match1[1];
    } else if (match2) {
      outwardCode = match2[1];
    } else if (match1) {
      outwardCode = match1[1];
    }
    
    if (!outwardCode) return null;
    return cardiffPostcodeDistances[outwardCode] || null;
  };

  const handleCalculateDistance = () => {
    if (!pinLocation.trim()) {
      toast.error('Please enter your postal/pin code');
      return;
    }

    setIsCalculating(true);
    
    // Calculate distance based on postcode
    setTimeout(() => {
      const calculatedDistance = getDistanceFromPostcode(pinLocation);
      
      if (calculatedDistance === null) {
        toast.error('Unable to calculate distance for this postcode. Please check and try again.');
        setIsCalculating(false);
        return;
      }
      
      const charges = calculateDeliveryCharges(calculatedDistance);
      
      setDistance(calculatedDistance);
      setDeliveryCharges(charges);
      setIsCalculating(false);
      
      if (calculatedDistance > 15) {
        toast.warning('Delivery to this location may take longer than usual.');
      }
    }, 800);
  };

  const handleSelectDelivery = () => {
    // If user is already logged in, skip auth choice
    if (user) {
      setStep('delivery-details');
    } else {
      setStep('auth-choice');
    }
  };

  const handleContinueAsGuest = () => {
    setStep('delivery-details');
  };

  const handleLoginRedirect = () => {
    onClose();
    navigate('/auth?redirect=/menu');
  };

  const handleSelectCollection = () => {
    setDeliveryInfo({
      type: 'collection',
      phone: phone || undefined,
    });
    onClose();
    navigate('/menu');
  };

  const handleProceedToMenu = () => {
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
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
      phone,
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
    setPhone('');
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
            {step === 'select' ? 'How would you like your order?' : 
             step === 'auth-choice' ? 'Continue as Guest or Login?' : 'Delivery Details'}
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
        ) : step === 'auth-choice' ? (
          <div className="py-6 space-y-4">
            <p className="text-center text-muted-foreground mb-6">
              Would you like to login for a faster checkout experience or continue as a guest?
            </p>
            
            {/* Guest Option */}
            <button
              onClick={handleContinueAsGuest}
              className="w-full group card-elevated p-4 flex items-center gap-4 hover:border-primary transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <User className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold">Continue as Guest</h3>
                <p className="text-sm text-muted-foreground">Proceed without creating an account</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </button>

            {/* Login Option */}
            <button
              onClick={handleLoginRedirect}
              className="w-full group card-elevated p-4 flex items-center gap-4 hover:border-secondary transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-secondary/10 transition-colors">
                <UserPlus className="h-6 w-6 text-muted-foreground group-hover:text-secondary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold">Login / Sign Up</h3>
                <p className="text-sm text-muted-foreground">Save your details for future orders</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary" />
            </button>

            <Button
              variant="ghost"
              onClick={() => setStep('select')}
              className="w-full mt-4"
            >
              Back
            </Button>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXX XXX XXX"
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
                  <span className="font-semibold">{distance} miles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery charges:</span>
                  <span className="font-semibold text-primary">£{deliveryCharges.toFixed(2)}</span>
                </div>
                {distance <= 3 && (
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
                onClick={() => user ? setStep('select') : setStep('auth-choice')}
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

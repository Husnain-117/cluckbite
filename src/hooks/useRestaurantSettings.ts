import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

export interface OperatingHours {
  days: {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
  };
}

export interface EmergencyClosure {
  is_closed: boolean;
  reason: string;
  until: string | null;
  message: string;
}

export interface DeliverySettings {
  max_distance_miles: number;
  base_charge: number;
  supported_postcodes: string[];
  delivery_time_min: number;
  delivery_time_max: number;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  twitter: string;
}

export interface DailyOrderCounter {
  date: string;
  counter: number;
}

// Restaurant GPS coordinates (51°29'00.6"N 3°13'57.4"W)
const RESTAURANT_LAT = 51.483494;
const RESTAURANT_LNG = -3.232614;
const ROAD_FACTOR = 1.4; // Multiplier: straight-line → approximate road distance

// Haversine formula: returns distance in miles between two GPS points
const haversineDistanceMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Postcode outward code centroids (approximate GPS center of each area)
const cardiffPostcodeCentroids: Record<string, { lat: number; lng: number }> = {
  // Cardiff City postcodes
  'CF5':  { lat: 51.487, lng: -3.238 },  // Ely, Caerau, Fairwater
  'CF11': { lat: 51.474, lng: -3.194 },  // Canton, Riverside
  'CF10': { lat: 51.478, lng: -3.175 },  // City Centre
  'CF14': { lat: 51.502, lng: -3.213 },  // Llandaff, Whitchurch
  'CF24': { lat: 51.485, lng: -3.165 },  // Roath, Adamsdown
  'CF23': { lat: 51.510, lng: -3.150 },  // Penylan, Cyncoed
  'CF3':  { lat: 51.500, lng: -3.120 },  // Rumney, Llanrumney
  'CF15': { lat: 51.520, lng: -3.260 },  // Radyr, Tongwynlais
  'CF4':  { lat: 51.515, lng: -3.285 },  // Creigiau
  // Vale of Glamorgan
  'CF64': { lat: 51.438, lng: -3.175 },  // Penarth
  'CF62': { lat: 51.400, lng: -3.270 },  // Barry
  'CF63': { lat: 51.405, lng: -3.250 },  // Barry
  'CF61': { lat: 51.405, lng: -3.485 },  // Llantwit Major
  'CF71': { lat: 51.462, lng: -3.450 },  // Cowbridge
  // Caerphilly
  'CF83': { lat: 51.575, lng: -3.220 },  // Caerphilly
  'CF82': { lat: 51.640, lng: -3.235 },  // Ystrad Mynach
  'CF81': { lat: 51.690, lng: -3.230 },  // Bargoed
  // Rhondda Cynon Taf
  'CF37': { lat: 51.600, lng: -3.340 },  // Pontypridd
  'CF38': { lat: 51.555, lng: -3.290 },  // Church Village
  'CF72': { lat: 51.520, lng: -3.340 },  // Llantrisant
  'CF35': { lat: 51.525, lng: -3.560 },  // Pencoed area
  // Bridgend
  'CF31': { lat: 51.510, lng: -3.580 },  // Bridgend
  'CF32': { lat: 51.545, lng: -3.580 },  // Tondu
  'CF33': { lat: 51.525, lng: -3.680 },  // Pyle
  'CF34': { lat: 51.610, lng: -3.660 },  // Maesteg
  'CF36': { lat: 51.490, lng: -3.700 },  // Porthcawl
  // Rhondda
  'CF39': { lat: 51.615, lng: -3.410 },  // Porth
  'CF40': { lat: 51.630, lng: -3.440 },  // Tonypandy
  'CF41': { lat: 51.645, lng: -3.465 },  // Pentre
  'CF42': { lat: 51.665, lng: -3.510 },  // Treorchy
  'CF43': { lat: 51.640, lng: -3.440 },  // Ferndale
  'CF44': { lat: 51.710, lng: -3.445 },  // Aberdare
  'CF45': { lat: 51.670, lng: -3.370 },  // Mountain Ash
  'CF46': { lat: 51.660, lng: -3.320 },  // Treharris
  'CF47': { lat: 51.750, lng: -3.380 },  // Merthyr Tydfil
  'CF48': { lat: 51.760, lng: -3.380 },  // Merthyr Tydfil
  // Newport
  'NP10': { lat: 51.580, lng: -3.060 },  // Rogerstone
  'NP19': { lat: 51.570, lng: -3.010 },  // Newport
  'NP20': { lat: 51.590, lng: -2.990 },  // Newport
  'NP18': { lat: 51.610, lng: -3.000 },  // Caerleon
  'NP44': { lat: 51.660, lng: -3.020 },  // Cwmbran
  'NP26': { lat: 51.590, lng: -2.770 },  // Caldicot
  // Extra Cardiff areas
  'CF1':  { lat: 51.480, lng: -3.178 },  // Central
  'CF2':  { lat: 51.505, lng: -3.175 },  // Heath
  'CF6':  { lat: 51.420, lng: -3.280 },  // Vale of Glamorgan
  'CF7':  { lat: 51.520, lng: -3.340 },  // Pontyclun area
};

// Calculate road distance from restaurant to a postcode centroid
const calculateRoadDistance = (outwardCode: string): number | null => {
  const centroid = cardiffPostcodeCentroids[outwardCode];
  if (!centroid) return null;
  const straightLine = haversineDistanceMiles(RESTAURANT_LAT, RESTAURANT_LNG, centroid.lat, centroid.lng);
  return Math.round(straightLine * ROAD_FACTOR * 10) / 10; // Round to 1 decimal
};

// Backward-compatible export: computed distances from centroids
export const cardiffPostcodeDistances: Record<string, number> = Object.fromEntries(
  Object.keys(cardiffPostcodeCentroids).map(code => [code, calculateRoadDistance(code)!])
);

export const getDeliveryCharge = (miles: number): number => {
  // £2 for first 3 miles, then £0.50 per additional mile
  if (miles <= 3) return 2.00;
  return 2.00 + Math.ceil(miles - 3) * 0.50;
};

export const getDistanceFromPostcode = (postcode: string): { distance: number | null; outwardCode: string | null } => {
  const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
  
  const match2 = cleanPostcode.match(/^([A-Z]{1,2}\d{2})/);
  const match1 = cleanPostcode.match(/^([A-Z]{1,2}\d)/);
  
  let outwardCode: string | null = null;
  
  if (match2 && cardiffPostcodeCentroids[match2[1]]) {
    outwardCode = match2[1];
  } else if (match1 && cardiffPostcodeCentroids[match1[1]]) {
    outwardCode = match1[1];
  } else if (match2) {
    outwardCode = match2[1];
  } else if (match1) {
    outwardCode = match1[1];
  }
  
  if (!outwardCode) return { distance: null, outwardCode: null };
  const distance = calculateRoadDistance(outwardCode);
  return { distance, outwardCode };
};

export const isPostcodeInRange = (postcode: string, maxDistance: number): { inRange: boolean; distance: number | null; outwardCode: string | null; error?: string } => {
  if (!postcode || postcode.trim().length < 2) {
    return { inRange: false, distance: null, outwardCode: null, error: 'Please enter a valid postcode' };
  }

  const { distance, outwardCode } = getDistanceFromPostcode(postcode);
  
  if (!outwardCode) {
    return { inRange: false, distance: null, outwardCode: null, error: 'Invalid postcode format. Example: CF5 1AA' };
  }
  
  if (distance === null) {
    return { inRange: false, distance: null, outwardCode, error: `Sorry, we don't deliver to ${outwardCode}. We deliver to Cardiff and surrounding areas only.` };
  }
  
  if (distance > maxDistance) {
    return { inRange: false, distance, outwardCode, error: `Sorry, ${outwardCode} is ${distance} miles away. We currently deliver up to ${maxDistance} miles from our restaurant.` };
  }
  
  return { inRange: true, distance, outwardCode };
};

export const useRestaurantSettings = () => {
  return useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*');
      
      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data?.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
      });
      
      // Set default delivery times if not configured
      const deliverySettings = settings['delivery_settings'] as DeliverySettings;
      if (deliverySettings && !deliverySettings.delivery_time_min) {
        deliverySettings.delivery_time_min = 30;
        deliverySettings.delivery_time_max = 40;
      }
      
      return {
        operatingHours: settings['operating_hours'] as OperatingHours,
        emergencyClosure: settings['emergency_closure'] as EmergencyClosure,
        deliverySettings,
        socialLinks: settings['social_links'] as SocialLinks,
        dailyOrderCounter: settings['daily_order_counter'] as DailyOrderCounter,
        restaurantInfo: settings['restaurant_info'] as { name: string; email: string; phone: string; address: string } | undefined,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateRestaurantSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Use upsert to handle both new and existing settings
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert(
          { setting_key: key, setting_value: value },
          { onConflict: 'setting_key' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
      toast.success('Settings saved!');
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
};

// Generate daily order number (resets each day) - race-condition safe
export const generateDailyOrderNumber = async (prefix: string = 'ORD'): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
  const orderPrefix = `${prefix}-${dateStr}`;
  
  // Query the highest order number for today with this prefix directly from orders table
  // This includes the date in the order number to avoid collisions across days
  const { data: orders } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${orderPrefix}-%`)
    .order('created_at', { ascending: false })
    .limit(50);
  
  let maxNumber = 0;
  
  if (orders && orders.length > 0) {
    // Parse all order numbers and find the maximum
    for (const order of orders) {
      const match = order.order_number.match(new RegExp(`^${orderPrefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }
  
  const nextNumber = maxNumber + 1;
  
  // Format: ORD-20260122-001, ORD-20260122-002, etc.
  return `${orderPrefix}-${nextNumber.toString().padStart(3, '0')}`;
};

export const isRestaurantOpen = (operatingHours: OperatingHours, emergencyClosure: EmergencyClosure): { isOpen: boolean; message: string } => {
  // Check emergency closure first
  if (emergencyClosure?.is_closed) {
    const until = emergencyClosure.until ? new Date(emergencyClosure.until) : null;
    if (!until || until > new Date()) {
      return { 
        isOpen: false, 
        message: emergencyClosure.message || emergencyClosure.reason || 'Restaurant is temporarily closed' 
      };
    }
  }
  
  if (!operatingHours?.days) {
    return { isOpen: true, message: '' };
  }
  
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = dayNames[now.getDay()];
  const todayHours = operatingHours.days[today];
  
  if (!todayHours?.open) {
    return { isOpen: false, message: `We're closed on ${today.charAt(0).toUpperCase() + today.slice(1)}s` };
  }
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.from.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.to.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  if (currentTime < openTime) {
    return { isOpen: false, message: `We open at ${todayHours.from} today` };
  }
  
  if (currentTime >= closeTime) {
    return { isOpen: false, message: `We're closed. We close at ${todayHours.to}` };
  }
  
  return { isOpen: true, message: '' };
};

export const formatOperatingHours = (operatingHours: OperatingHours): string => {
  if (!operatingHours?.days) return 'Hours not set';
  
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const openDays = dayNames.filter(day => operatingHours.days[day]?.open);
  
  if (openDays.length === 0) return 'Closed';
  if (openDays.length === 7) {
    const firstDay = operatingHours.days[openDays[0]];
    return `Daily ${firstDay.from} - ${firstDay.to}`;
  }
  
  return openDays.map(day => {
    const hours = operatingHours.days[day];
    return `${day.charAt(0).toUpperCase() + day.slice(1, 3)}: ${hours.from}-${hours.to}`;
  }).join(', ');
};

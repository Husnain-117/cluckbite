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

// Comprehensive UK postcodes with distance from Cardiff Ely (1 Cowbridge Road West) in MILES
export const cardiffPostcodeDistances: Record<string, number> = {
  // Cardiff City postcodes
  'CF5': 1.5,   // Ely, Caerau, Fairwater
  'CF11': 2.5,  // Canton, Riverside
  'CF10': 3,    // City Centre
  'CF14': 3.5,  // Llandaff, Whitchurch
  'CF24': 3.5,  // Roath, Adamsdown
  'CF23': 4.5,  // Penylan, Cyncoed
  'CF3': 5,     // Rumney, Llanrumney
  'CF15': 5,    // Radyr, Tongwynlais
  'CF4': 4,     // Creigiau
  // Vale of Glamorgan
  'CF64': 6,    // Penarth
  'CF62': 7,    // Barry
  'CF63': 7.5,  // Barry
  'CF61': 8,    // Llantwit Major
  'CF71': 8,    // Cowbridge
  // Caerphilly
  'CF83': 7,    // Caerphilly
  'CF82': 8,    // Ystrad Mynach
  'CF81': 10,   // Bargoed
  // Rhondda Cynon Taf
  'CF37': 10,   // Pontypridd
  'CF38': 9,    // Church Village
  'CF72': 6,    // Llantrisant
  'CF35': 12,   // Bridgend area
  // Bridgend
  'CF31': 15,   // Bridgend
  'CF32': 14,   // Tondu
  'CF33': 16,   // Pyle
  'CF34': 17,   // Maesteg
  'CF36': 16,   // Porthcawl
  // Rhondda
  'CF39': 12,   // Porth
  'CF40': 11,   // Tonypandy
  'CF41': 13,   // Pentre
  'CF42': 14,   // Treorchy
  'CF43': 15,   // Ferndale
  'CF44': 16,   // Aberdare
  'CF45': 17,   // Mountain Ash
  'CF46': 10,   // Treharris
  'CF47': 14,   // Merthyr Tydfil
  'CF48': 15,   // Merthyr Tydfil
  // Newport
  'NP10': 8,    // Rogerstone
  'NP19': 11,   // Newport
  'NP20': 12,   // Newport
  'NP18': 9,    // Caerleon
  'NP44': 10,   // Cwmbran
  'NP26': 14,   // Caldicot
  // Extra Cardiff areas
  'CF1': 3,     // Central
  'CF2': 4,     // Heath
  'CF6': 8,     // Vale of Glamorgan
  'CF7': 6,     // Pontyclun area
};

export const getDeliveryCharge = (miles: number): number => {
  if (miles <= 3) return 1.50;
  if (miles <= 4) return 2.50;
  return 2.50 + Math.ceil(miles - 4);
};

export const getDistanceFromPostcode = (postcode: string): { distance: number | null; outwardCode: string | null } => {
  const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
  // Match UK outward code: 1-2 letters + 1-2 digits (e.g., CF5, CF10, NP20)
  const outwardMatch = cleanPostcode.match(/^([A-Z]{1,2}\d{1,2})/);
  if (!outwardMatch) return { distance: null, outwardCode: null };
  const outwardCode = outwardMatch[1];
  const distance = cardiffPostcodeDistances[outwardCode] ?? null;
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
      
      return {
        operatingHours: settings['operating_hours'] as OperatingHours,
        emergencyClosure: settings['emergency_closure'] as EmergencyClosure,
        deliverySettings: settings['delivery_settings'] as DeliverySettings,
        socialLinks: settings['social_links'] as SocialLinks,
        dailyOrderCounter: settings['daily_order_counter'] as DailyOrderCounter,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateRestaurantSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      
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

// Generate daily order number (resets each day)
export const generateDailyOrderNumber = async (prefix: string = 'ORD'): Promise<string> => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Get current counter
  const { data } = await supabase
    .from('restaurant_settings')
    .select('setting_value')
    .eq('setting_key', 'daily_order_counter')
    .single();
  
  let counter = 1;
  const currentData = data?.setting_value as unknown as DailyOrderCounter | null;
  
  if (currentData && currentData.date === today) {
    counter = (currentData.counter || 0) + 1;
  }
  
  // Update counter
  await supabase
    .from('restaurant_settings')
    .update({ 
      setting_value: { date: today, counter } 
    })
    .eq('setting_key', 'daily_order_counter');
  
  // Format: ORD-001, ORD-002, etc.
  return `${prefix}-${counter.toString().padStart(3, '0')}`;
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

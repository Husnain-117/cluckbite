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

// UK postcodes with distance from Cardiff Ely (miles)
export const cardiffPostcodeDistances: Record<string, number> = {
  'CF5': 1.5, 'CF11': 2.5, 'CF14': 3.5, 'CF10': 3, 'CF24': 3.5,
  'CF23': 4.5, 'CF3': 5, 'CF15': 5, 'CF64': 6, 'CF62': 7,
  'CF63': 7.5, 'CF71': 8, 'CF83': 7, 'CF82': 8, 'CF37': 10,
  'CF38': 9, 'CF72': 6, 'CF35': 12, 'CF31': 15, 'CF32': 14,
  'CF33': 16, 'CF34': 17, 'CF39': 12, 'CF40': 11, 'CF41': 13,
  'CF42': 14, 'CF43': 15, 'CF44': 16, 'CF45': 17, 'CF46': 10,
  'CF47': 14, 'CF48': 15, 'NP10': 8, 'NP20': 12, 'NP19': 11,
  'NP18': 9, 'NP44': 10,
};

export const getDeliveryCharge = (miles: number): number => {
  if (miles <= 3) return 1.50;
  if (miles <= 4) return 2.50;
  return 2.50 + Math.ceil(miles - 4);
};

export const getDistanceFromPostcode = (postcode: string): { distance: number | null; outwardCode: string | null } => {
  const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
  const outwardMatch = cleanPostcode.match(/^([A-Z]{1,2}\d{1,2})/);
  if (!outwardMatch) return { distance: null, outwardCode: null };
  const outwardCode = outwardMatch[1];
  const distance = cardiffPostcodeDistances[outwardCode] ?? null;
  return { distance, outwardCode };
};

export const isPostcodeInRange = (postcode: string, maxDistance: number): { inRange: boolean; distance: number | null; outwardCode: string | null; error?: string } => {
  const { distance, outwardCode } = getDistanceFromPostcode(postcode);
  
  if (!outwardCode) {
    return { inRange: false, distance: null, outwardCode: null, error: 'Invalid postcode format' };
  }
  
  if (distance === null) {
    return { inRange: false, distance: null, outwardCode, error: `Postcode ${outwardCode} is not in our delivery area` };
  }
  
  if (distance > maxDistance) {
    return { inRange: false, distance, outwardCode, error: `${outwardCode} is ${distance} miles away. We only deliver up to ${maxDistance} miles.` };
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
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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

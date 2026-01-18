import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useRestaurantSettings, isRestaurantOpen } from '@/hooks/useRestaurantSettings';
import { format } from 'date-fns';

interface RestaurantStatusBannerProps {
  className?: string;
  showOnlyWhenClosed?: boolean;
}

const RestaurantStatusBanner: React.FC<RestaurantStatusBannerProps> = ({ 
  className = '', 
  showOnlyWhenClosed = false 
}) => {
  const { data: settings, isLoading } = useRestaurantSettings();
  const [dismissed, setDismissed] = React.useState(false);

  if (isLoading || !settings || dismissed) return null;

  const { operatingHours, emergencyClosure } = settings;
  const { isOpen, message } = isRestaurantOpen(operatingHours, emergencyClosure);

  // If restaurant is open and we only show when closed, return null
  if (isOpen && showOnlyWhenClosed) return null;

  // Emergency closure banner
  if (emergencyClosure?.is_closed) {
    const until = emergencyClosure.until ? new Date(emergencyClosure.until) : null;
    if (!until || until > new Date()) {
      return (
        <div className={`bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 ${className}`}>
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Restaurant Temporarily Closed</p>
                <p className="text-sm opacity-90">
                  {emergencyClosure.message || emergencyClosure.reason}
                  {until && ` • Until ${format(until, 'PPp')}`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-destructive/20 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }
  }

  // Regular closed status (outside operating hours)
  if (!isOpen && message) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 px-4 py-2 ${className}`}>
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>{message}</span>
        </div>
      </div>
    );
  }

  return null;
};

export default RestaurantStatusBanner;

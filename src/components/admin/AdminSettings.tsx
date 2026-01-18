import React, { useState, useEffect } from 'react';
import { Save, Store, Truck, CreditCard, Bell, Settings, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  useRestaurantSettings, 
  useUpdateRestaurantSetting,
  OperatingHours,
  EmergencyClosure,
  DeliverySettings,
  DayHours
} from '@/hooks/useRestaurantSettings';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('restaurant');
  const { data: settings, isLoading } = useRestaurantSettings();
  const updateSetting = useUpdateRestaurantSetting();

  // Local state for editing
  const [operatingHours, setOperatingHours] = useState<OperatingHours | null>(null);
  const [emergencyClosure, setEmergencyClosure] = useState<EmergencyClosure | null>(null);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);

  const [restaurantSettings, setRestaurantSettings] = useState({
    name: 'Cluck Bite',
    email: 'hello@cluckbite.com',
    phone: '+44 29 2000 0000',
    address: '1 Cowbridge Road West, Ely, Cardiff, CF5 5BS',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNewOrders: true,
    emailStatusUpdates: true,
    lowStockAlerts: true,
    dailyReports: false,
  });

  // Sync from database
  useEffect(() => {
    if (settings) {
      setOperatingHours(settings.operatingHours);
      setEmergencyClosure(settings.emergencyClosure);
      setDeliverySettings(settings.deliverySettings);
    }
  }, [settings]);

  const handleSaveOperatingHours = () => {
    if (operatingHours) {
      updateSetting.mutate({ key: 'operating_hours', value: operatingHours });
    }
  };

  const handleSaveEmergencyClosure = () => {
    if (emergencyClosure) {
      updateSetting.mutate({ key: 'emergency_closure', value: emergencyClosure });
    }
  };

  const handleSaveDeliverySettings = () => {
    if (deliverySettings) {
      updateSetting.mutate({ key: 'delivery_settings', value: deliverySettings });
    }
  };

  const updateDayHours = (day: typeof DAYS[number], field: keyof DayHours, value: any) => {
    if (!operatingHours) return;
    setOperatingHours({
      ...operatingHours,
      days: {
        ...operatingHours.days,
        [day]: { ...operatingHours.days[day], [field]: value }
      }
    });
  };

  const tabs = [
    { id: 'restaurant', label: 'Restaurant', icon: Store },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-6">
          <Skeleton className="h-96 w-64" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant system</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-56 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 card-elevated p-6">
          {activeTab === 'restaurant' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Restaurant Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input
                    value={restaurantSettings.name}
                    onChange={(e) => setRestaurantSettings({ ...restaurantSettings, name: e.target.value })}
                    className="input-styled"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={restaurantSettings.email}
                      onChange={(e) => setRestaurantSettings({ ...restaurantSettings, email: e.target.value })}
                      className="input-styled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={restaurantSettings.phone}
                      onChange={(e) => setRestaurantSettings({ ...restaurantSettings, phone: e.target.value })}
                      className="input-styled"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={restaurantSettings.address}
                    onChange={(e) => setRestaurantSettings({ ...restaurantSettings, address: e.target.value })}
                    className="input-styled"
                  />
                </div>
              </div>
              <Button onClick={() => toast.success('Restaurant info saved!')} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </div>
          )}

          {activeTab === 'hours' && operatingHours && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-semibold">Operating Hours</h3>
                <p className="text-sm text-muted-foreground">Set your restaurant's opening days and times</p>
              </div>
              
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="w-28">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={operatingHours.days[day]?.open ?? false}
                          onCheckedChange={(checked) => updateDayHours(day, 'open', checked)}
                        />
                        <span className="font-medium capitalize text-sm">{day}</span>
                      </div>
                    </div>
                    {operatingHours.days[day]?.open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={operatingHours.days[day]?.from || '11:00'}
                          onChange={(e) => updateDayHours(day, 'from', e.target.value)}
                          className="input-styled w-28 text-sm"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={operatingHours.days[day]?.to || '22:00'}
                          onChange={(e) => updateDayHours(day, 'to', e.target.value)}
                          className="input-styled w-28 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const allOpen = DAYS.every(d => operatingHours.days[d]?.open);
                    const newDays = { ...operatingHours.days };
                    DAYS.forEach(d => {
                      newDays[d] = { ...newDays[d], open: !allOpen };
                    });
                    setOperatingHours({ ...operatingHours, days: newDays });
                  }}
                >
                  Toggle All Days
                </Button>
                <Button onClick={handleSaveOperatingHours} className="btn-primary" disabled={updateSetting.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSetting.isPending ? 'Saving...' : 'Save Hours'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && emergencyClosure && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Emergency Closure
                </h3>
                <p className="text-sm text-muted-foreground">Temporarily close the restaurant for emergencies</p>
              </div>

              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Close Restaurant</p>
                    <p className="text-sm text-muted-foreground">Stop accepting all orders immediately</p>
                  </div>
                  <Switch
                    checked={emergencyClosure.is_closed}
                    onCheckedChange={(checked) => setEmergencyClosure({ ...emergencyClosure, is_closed: checked })}
                  />
                </div>

                {emergencyClosure.is_closed && (
                  <>
                    <div className="space-y-2">
                      <Label>Reason (Internal)</Label>
                      <Input
                        value={emergencyClosure.reason}
                        onChange={(e) => setEmergencyClosure({ ...emergencyClosure, reason: e.target.value })}
                        placeholder="e.g., Staff shortage, Kitchen maintenance"
                        className="input-styled"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Customer Message (Displayed on Website)</Label>
                      <Textarea
                        value={emergencyClosure.message}
                        onChange={(e) => setEmergencyClosure({ ...emergencyClosure, message: e.target.value })}
                        placeholder="e.g., We're temporarily closed for maintenance. Back soon!"
                        className="input-styled"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reopen Date/Time (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={emergencyClosure.until || ''}
                        onChange={(e) => setEmergencyClosure({ ...emergencyClosure, until: e.target.value || null })}
                        className="input-styled"
                      />
                      <p className="text-xs text-muted-foreground">Leave empty if unsure when you'll reopen</p>
                    </div>
                  </>
                )}
              </div>

              <Button 
                onClick={handleSaveEmergencyClosure} 
                className={emergencyClosure.is_closed ? 'bg-destructive hover:bg-destructive/90' : 'btn-primary'}
                disabled={updateSetting.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : emergencyClosure.is_closed ? 'Activate Closure' : 'Save Settings'}
              </Button>
            </div>
          )}

          {activeTab === 'delivery' && deliverySettings && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Delivery Settings</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Delivery Charge (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={deliverySettings.base_charge}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, base_charge: parseFloat(e.target.value) || 0 })}
                      className="input-styled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Distance (miles)</Label>
                    <Input
                      type="number"
                      value={deliverySettings.max_distance_miles}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, max_distance_miles: parseInt(e.target.value) || 15 })}
                      className="input-styled"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium mb-2">Delivery Charge Tiers</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Up to 3 miles: £1.50</li>
                    <li>• 3-4 miles: £2.50</li>
                    <li>• Above 4 miles: £2.50 + £1 per additional mile</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label>Supported Postcodes</Label>
                  <div className="flex flex-wrap gap-2">
                    {deliverySettings.supported_postcodes?.map((code, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Cardiff and surrounding areas</p>
                </div>
              </div>
              <Button onClick={handleSaveDeliverySettings} className="btn-primary" disabled={updateSetting.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : 'Save Delivery Settings'}
              </Button>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Payment Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Card Payments</p>
                    <p className="text-sm text-muted-foreground">Accept card payments online</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Pay Later (Cash)</p>
                    <p className="text-sm text-muted-foreground">Accept cash payments on delivery</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Split Payments</p>
                    <p className="text-sm text-muted-foreground">Allow partial card + cash payments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Email for New Orders</p>
                    <p className="text-sm text-muted-foreground">Receive email when new orders are placed</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNewOrders}
                    onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, emailNewOrders: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
                  </div>
                  <Switch
                    checked={notificationSettings.lowStockAlerts}
                    onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, lowStockAlerts: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-muted-foreground">Receive daily sales summary email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.dailyReports}
                    onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, dailyReports: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">System Settings</h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Database Status</p>
                    <span className="flex items-center gap-2 text-green-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Cluck Bite Cloud Database</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Order Number Format</p>
                    <span className="font-mono text-sm">ORD-{'{DATE}'}-{'{RANDOM}'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Auto-generated order numbers</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

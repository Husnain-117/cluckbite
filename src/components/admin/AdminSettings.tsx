import React, { useState, useEffect } from 'react';
import { Save, Store, Truck, CreditCard, Bell, Settings, Clock, AlertTriangle, Share2, Instagram, Facebook, Twitter } from 'lucide-react';
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
  SocialLinks,
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
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: ''
  });

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
      if (settings.socialLinks) {
        setSocialLinks(settings.socialLinks);
      }
      // Load restaurant info from settings if available
      if (settings.restaurantInfo) {
        setRestaurantSettings(settings.restaurantInfo);
      }
    }
  }, [settings]);

  const handleSaveRestaurantInfo = () => {
    updateSetting.mutate({ key: 'restaurant_info', value: restaurantSettings });
  };

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

  const handleSaveSocialLinks = () => {
    updateSetting.mutate({ key: 'social_links', value: socialLinks });
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
    { id: 'social', label: 'Social', icon: Share2 },
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
              <Button onClick={handleSaveRestaurantInfo} className="btn-primary" disabled={updateSetting.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : 'Save Changes'}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Time Min (minutes)</Label>
                    <Input
                      type="number"
                      value={deliverySettings.delivery_time_min || 30}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, delivery_time_min: parseInt(e.target.value) || 30 })}
                      className="input-styled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Time Max (minutes)</Label>
                    <Input
                      type="number"
                      value={deliverySettings.delivery_time_max || 40}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, delivery_time_max: parseInt(e.target.value) || 40 })}
                      className="input-styled"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium mb-2">Delivery Charge Tiers (Miles)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Up to 3 miles: £2.00</li>
                    <li>• Above 3 miles: £2.00 + £0.50 per additional mile</li>
                  </ul>
                </div>

                <div className="p-4 bg-primary/10 rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Display Settings
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Delivery time ({deliverySettings.delivery_time_min || 30}-{deliverySettings.delivery_time_max || 40} min) will be shown on the landing page and footer.
                  </p>
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
                  <p className="text-xs text-muted-foreground">Cardiff and surrounding areas (CF, NP postcodes)</p>
                </div>
              </div>
              <Button onClick={handleSaveDeliverySettings} className="btn-primary" disabled={updateSetting.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : 'Save Delivery Settings'}
              </Button>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-semibold">Social Media Links</h3>
                <p className="text-sm text-muted-foreground">Add your social media links - they'll appear in the website footer</p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Instagram
                  </Label>
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    placeholder="https://instagram.com/your-page"
                    className="input-styled"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    value={socialLinks.facebook}
                    onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                    placeholder="https://facebook.com/your-page"
                    className="input-styled"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    TikTok
                  </Label>
                  <Input
                    value={socialLinks.tiktok}
                    onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                    placeholder="https://tiktok.com/@your-page"
                    className="input-styled"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-sky-500" />
                    Twitter / X
                  </Label>
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                    placeholder="https://twitter.com/your-page"
                    className="input-styled"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSocialLinks} className="btn-primary" disabled={updateSetting.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSetting.isPending ? 'Saving...' : 'Save Social Links'}
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
                  <p className="font-medium mb-2">Order Number Format</p>
                  <p className="text-sm text-muted-foreground mb-3">Order numbers reset daily starting from 001</p>
                  <div className="flex gap-2 text-sm">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-mono">WLK-001</span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg font-mono">PHN-002</span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg font-mono">ORD-003</span>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <p className="font-medium mb-2">Database Information</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Connected to Lovable Cloud</p>
                    <p>Real-time sync enabled</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <p className="font-medium mb-2">Version</p>
                  <p className="text-sm text-muted-foreground">Cluck Bite POS v2.0</p>
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

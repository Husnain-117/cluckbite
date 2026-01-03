import React, { useState } from 'react';
import { Save, Store, Truck, CreditCard, Bell, Settings, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('restaurant');

  const [restaurantSettings, setRestaurantSettings] = useState({
    name: 'Cluck Bite',
    email: 'hello@cluckbite.com',
    phone: '+44 123 456 7890',
    address: '123 Chicken Lane, Food District, London, UK EC1A 1BB',
    openingHours: '11:00 AM - 11:00 PM',
  });

  const [deliverySettings, setDeliverySettings] = useState({
    baseCharge: '2.00',
    perKmCharge: '0.50',
    maxDistance: '15',
    freeDeliveryThreshold: '30',
    estimatedTime: '20-30',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNewOrders: true,
    emailStatusUpdates: true,
    lowStockAlerts: true,
    dailyReports: false,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  const tabs = [
    { id: 'restaurant', label: 'Restaurant', icon: Store },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant system</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 card-elevated p-6">
          {activeTab === 'restaurant' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Restaurant Information</h3>
              <div className="grid gap-6">
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
                <div className="space-y-2">
                  <Label>Opening Hours</Label>
                  <Input
                    value={restaurantSettings.openingHours}
                    onChange={(e) => setRestaurantSettings({ ...restaurantSettings, openingHours: e.target.value })}
                    className="input-styled"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <h3 className="text-lg font-heading font-semibold">Delivery Settings</h3>
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Delivery Charge ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={deliverySettings.baseCharge}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, baseCharge: e.target.value })}
                      className="input-styled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Charge Per KM ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={deliverySettings.perKmCharge}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, perKmCharge: e.target.value })}
                      className="input-styled"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maximum Delivery Distance (km)</Label>
                    <Input
                      type="number"
                      value={deliverySettings.maxDistance}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDistance: e.target.value })}
                      className="input-styled"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Free Delivery Threshold ($)</Label>
                    <Input
                      type="number"
                      value={deliverySettings.freeDeliveryThreshold}
                      onChange={(e) =>
                        setDeliverySettings({ ...deliverySettings, freeDeliveryThreshold: e.target.value })
                      }
                      className="input-styled"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Delivery Time</Label>
                  <Input
                    value={deliverySettings.estimatedTime}
                    onChange={(e) => setDeliverySettings({ ...deliverySettings, estimatedTime: e.target.value })}
                    placeholder="e.g., 20-30 mins"
                    className="input-styled"
                  />
                </div>
              </div>
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
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Accept cash payments</p>
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
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  💡 To enable Stripe payments, go to Settings → Stripe Integration
                </p>
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
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, emailNewOrders: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Status Update Emails</p>
                    <p className="text-sm text-muted-foreground">Send emails to customers on status changes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailStatusUpdates}
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, emailStatusUpdates: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
                  </div>
                  <Switch
                    checked={notificationSettings.lowStockAlerts}
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, lowStockAlerts: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-muted-foreground">Receive daily sales summary email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.dailyReports}
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, dailyReports: v })
                    }
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
                  <p className="text-sm text-muted-foreground">Lovable Cloud Database</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Low Stock Threshold (Default)</p>
                    <Input type="number" defaultValue="10" className="w-24 input-styled" />
                  </div>
                  <p className="text-sm text-muted-foreground">Global default for new items</p>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Order Number Format</p>
                    <Input defaultValue="ORD-{DATE}-{RANDOM}" className="w-64 input-styled" disabled />
                  </div>
                  <p className="text-sm text-muted-foreground">Auto-generated order numbers</p>
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <h4 className="font-medium mb-4">Maintenance</h4>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-border">
            <Button onClick={handleSave} className="btn-primary">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

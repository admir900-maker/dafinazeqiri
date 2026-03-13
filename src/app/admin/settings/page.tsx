'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Settings,
  Globe,
  Mail,
  CreditCard,
  Shield,
  Image,
  Calendar,
  BarChart3,
  Share2,
  Bell,
  Wrench,
  Scale,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Cloud,
  Key,
  Eye,
  EyeOff,
  QrCode
} from 'lucide-react';

interface SettingsData {
  _id?: string;
  general: any;
  homepage: any;
  email: any;
  payments: any;
  security: any;
  media: any;
  booking: any;
  validation: any;
  analytics: any;
  social: any;
  notifications: any;
  system: any;
  legal: any;
  version?: number;
  updatedAt?: string;
}

export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsData>({
    general: {},
    homepage: {},
    email: {},
    payments: {},
    security: {},
    media: {},
    booking: {},
    validation: {},
    analytics: {},
    social: {},
    notifications: {},
    system: {},
    legal: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [showPasswords, setShowPasswords] = useState<any>({});
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    if (isLoaded && user) {
      loadSettings();
    }
  }, [isLoaded, user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section: string) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: section,
          data: settings[section as keyof SettingsData]
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSettings(result.data);
          alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
        }
      } else {
        const error = await response.json();
        alert(`Error saving settings: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const testService = async (service: string, config: any) => {
    try {
      setTesting(service);
      const response = await fetch('/api/admin/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, config })
      });

      const result = await response.json();
      setTestResults((prev: any) => ({
        ...prev,
        [service]: result
      }));

      setTimeout(() => {
        setTestResults((prev: any) => ({
          ...prev,
          [service]: null
        }));
      }, 5000);
    } catch (error) {
      console.error('Error testing service:', error);
      setTestResults((prev: any) => ({
        ...prev,
        [service]: { success: false, message: 'Test failed' }
      }));
    } finally {
      setTesting(null);
    }
  };

  const testValidationSettings = async () => {
    try {
      setTesting('validation');
      const response = await fetch('/api/admin/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'validation',
          config: settings.validation || {}
        })
      });

      const result = await response.json();
      setTestResults((prev: any) => ({
        ...prev,
        validation: result
      }));

      setTimeout(() => {
        setTestResults((prev: any) => ({
          ...prev,
          validation: null
        }));
      }, 8000);
    } catch (error) {
      console.error('Error testing validation settings:', error);
      setTestResults((prev: any) => ({
        ...prev,
        validation: { success: false, message: 'Validation test failed' }
      }));
    } finally {
      setTesting(null);
    }
  };

  const updateNestedSetting = (section: string, path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };

      // Ensure the section exists
      if (!newSettings[section as keyof SettingsData]) {
        newSettings[section as keyof SettingsData] = {};
      }

      const keys = path.split('.');
      let current = newSettings[section as keyof SettingsData];

      // Navigate to the nested property, creating objects as needed
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      // Set the final value
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev: any) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
          <div className="flex items-center gap-2 text-orange-100/70">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  const TestButton = ({ service, config, label }: { service: string, config: any, label: string }) => {
    const result = testResults[service];

    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => testService(service, config)}
          disabled={testing === service}
          variant="outline"
          size="sm"
          className="min-w-[80px]"
        >
          {testing === service ? (
            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <TestTube className="w-3 h-3 mr-1" />
          )}
          Test
        </Button>
        {result && (
          <div className="flex items-center gap-1">
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-xs ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.message}
            </span>
          </div>
        )}
      </div>
    );
  };

  const PasswordInput = ({
    label,
    value,
    onChange,
    field
  }: {
    label: string,
    value: string,
    onChange: (value: string) => void,
    field: string
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={showPasswords[field] ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-orange-500/50 hover:text-orange-500"
        >
          {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Settings</h1>
            <p className="text-orange-100/70">Configure your application settings</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-100">
              Version: {settings.version || 1}
            </Badge>
            <Button onClick={loadSettings} variant="outline" size="sm" className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 bg-black/60 border border-orange-500/30">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Homepage</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              <span className="hidden sm:inline">Validation</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">Database</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Globe className="w-5 h-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={settings.general?.siteName || ''}
                      onChange={(e) => updateNestedSetting('general', 'siteName', e.target.value)}
                      placeholder="SUPERNOVA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Site URL</Label>
                    <Input
                      value={settings.general?.siteUrl || ''}
                      onChange={(e) => updateNestedSetting('general', 'siteUrl', e.target.value)}
                      placeholder="https://dafinazeqiri.tickets"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <select
                      value={settings.general?.currency || 'EUR'}
                      onChange={(e) => updateNestedSetting('general', 'currency', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-orange-500/30 rounded-md bg-black/60 text-orange-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="EUR">Euro (Ã¢â€šÂ¬)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="GBP">British Pound (Ã‚Â£)</option>
                      <option value="TRY">Turkish Lira (Ã¢â€šÂº)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <select
                      value={settings.general?.timezone || 'UTC'}
                      onChange={(e) => updateNestedSetting('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-orange-500/30 rounded-md bg-black/60 text-orange-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Europe/Istanbul">Europe/Istanbul</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Site Description</Label>
                  <Textarea
                    value={settings.general?.siteDescription || ''}
                    onChange={(e) => updateNestedSetting('general', 'siteDescription', e.target.value)}
                    placeholder="Event booking platform"
                    rows={3}
                  />
                </div>

                {/* Logo Upload Section */}
                <div className="border-t border-orange-500/20 pt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold text-orange-100">Site Logo</h3>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL (used in PDF tickets and emails)</Label>
                    <Input
                      value={settings.general?.logoUrl || ''}
                      onChange={(e) => updateNestedSetting('general', 'logoUrl', e.target.value)}
                      placeholder="https://res.cloudinary.com/your-cloud/image/upload/logo.png"
                    />
                    <p className="text-sm text-orange-100/50">
                      Upload your logo to Cloudinary first, then paste the URL here.
                      Recommended: PNG format, transparent background, 512x512px minimum.
                    </p>
                    {settings.general?.logoUrl && (
                      <div className="mt-3 p-3 bg-black/40 rounded-lg border border-orange-500/20">
                        <p className="text-sm font-medium mb-2 text-orange-100">Logo Preview:</p>
                        <img
                          src={settings.general.logoUrl}
                          alt="Site logo"
                          className="w-24 h-24 object-contain bg-black/60 rounded border border-orange-500/30"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).alt = 'Failed to load image';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection('general')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save General Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Homepage Settings */}
          <TabsContent value="homepage" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Eye className="w-5 h-5" />
                  Homepage Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-orange-500/20">
                    <div>
                      <Label className="text-base font-semibold">Show Hero Section</Label>
                      <p className="text-sm text-orange-100/50 mt-1">
                        Display the hero section with slides on the homepage
                      </p>
                    </div>
                    <Switch
                      checked={settings.homepage?.showHeroSection ?? true}
                      onCheckedChange={(checked) => updateNestedSetting('homepage', 'showHeroSection', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-orange-500/20">
                    <div>
                      <Label className="text-base font-semibold">Show Featured Events</Label>
                      <p className="text-sm text-orange-100/50 mt-1">
                        Display featured events section on the homepage
                      </p>
                    </div>
                    <Switch
                      checked={settings.homepage?.showFeaturedEvents ?? true}
                      onCheckedChange={(checked) => updateNestedSetting('homepage', 'showFeaturedEvents', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-orange-500/20">
                    <div>
                      <Label className="text-base font-semibold">Show Categories</Label>
                      <p className="text-sm text-orange-100/50 mt-1">
                        Display event categories on the homepage
                      </p>
                    </div>
                    <Switch
                      checked={settings.homepage?.showCategories ?? true}
                      onCheckedChange={(checked) => updateNestedSetting('homepage', 'showCategories', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-orange-500/20">
                    <div>
                      <Label className="text-base font-semibold">Show Statistics</Label>
                      <p className="text-sm text-orange-100/50 mt-1">
                        Display statistics (events, attendees, rating) in hero section
                      </p>
                    </div>
                    <Switch
                      checked={settings.homepage?.showStats ?? true}
                      onCheckedChange={(checked) => updateNestedSetting('homepage', 'showStats', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-orange-500/20">
                    <div>
                      <Label className="text-base font-semibold">Auto-Rotate Hero Slides</Label>
                      <p className="text-sm text-orange-100/50 mt-1">
                        Automatically rotate through hero slides (currently disabled)
                      </p>
                    </div>
                    <Switch
                      checked={settings.homepage?.heroAutoRotate ?? false}
                      onCheckedChange={(checked) => updateNestedSetting('homepage', 'heroAutoRotate', checked)}
                    />
                  </div>

                  {settings.homepage?.heroAutoRotate && (
                    <div className="space-y-2 ml-4">
                      <Label>Rotation Interval (seconds)</Label>
                      <Input
                        type="number"
                        min="3"
                        max="30"
                        value={settings.homepage?.heroRotationInterval || 5}
                        onChange={(e) => updateNestedSetting('homepage', 'heroRotationInterval', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-orange-500/20">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">Theme & Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <select
                        className="w-full px-3 py-2 border-2 border-orange-500/30 rounded-md bg-black/60 text-orange-100 focus:outline-none focus:border-orange-500"
                        value={settings.homepage?.theme || 'auto'}
                        onChange={(e) => updateNestedSetting('homepage', 'theme', e.target.value)}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.homepage?.primaryColor || '#2563eb'}
                          onChange={(e) => updateNestedSetting('homepage', 'primaryColor', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          type="text"
                          value={settings.homepage?.primaryColor || '#2563eb'}
                          onChange={(e) => updateNestedSetting('homepage', 'primaryColor', e.target.value)}
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.homepage?.accentColor || '#8b5cf6'}
                          onChange={(e) => updateNestedSetting('homepage', 'accentColor', e.target.value)}
                          className="w-20"
                        />
                        <Input
                          type="text"
                          value={settings.homepage?.accentColor || '#8b5cf6'}
                          onChange={(e) => updateNestedSetting('homepage', 'accentColor', e.target.value)}
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection('homepage')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Homepage Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Mail className="w-5 h-5" />
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input
                      value={settings.email?.fromName || ''}
                      onChange={(e) => updateNestedSetting('email', 'fromName', e.target.value)}
                      placeholder="SUPERNOVA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Email Address</Label>
                    <Input
                      type="email"
                      value={settings.email?.fromAddress || ''}
                      onChange={(e) => updateNestedSetting('email', 'fromAddress', e.target.value)}
                      placeholder="noreply@dafinazeqiri.tickets"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={settings.email?.smtp?.host || ''}
                      onChange={(e) => updateNestedSetting('email', 'smtp.host', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={settings.email?.smtp?.port || 587}
                      onChange={(e) => updateNestedSetting('email', 'smtp.port', parseInt(e.target.value))}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Username</Label>
                    <Input
                      value={settings.email?.smtp?.username || ''}
                      onChange={(e) => updateNestedSetting('email', 'smtp.username', e.target.value)}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <PasswordInput
                    label="SMTP Password"
                    value={settings.email?.smtp?.password || ''}
                    onChange={(value) => updateNestedSetting('email', 'smtp.password', value)}
                    field="smtpPassword"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.email?.smtp?.secure || false}
                    onCheckedChange={(checked) => updateNestedSetting('email', 'smtp.secure', checked)}
                  />
                  <Label>Use SSL/TLS</Label>
                </div>

                {/* Template toggles */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-orange-100">Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.email?.templates?.bookingConfirmation ?? true}
                        onCheckedChange={(checked) => updateNestedSetting('email', 'templates.bookingConfirmation', checked)}
                      />
                      <Label>Send booking confirmation emails</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.email?.templates?.eventReminders ?? true}
                        onCheckedChange={(checked) => updateNestedSetting('email', 'templates.eventReminders', checked)}
                      />
                      <Label>Send event reminders</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.email?.templates?.welcomeEmail ?? true}
                        onCheckedChange={(checked) => updateNestedSetting('email', 'templates.welcomeEmail', checked)}
                      />
                      <Label>Send welcome email</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.email?.templates?.passwordReset ?? true}
                        onCheckedChange={(checked) => updateNestedSetting('email', 'templates.passwordReset', checked)}
                      />
                      <Label>Enable password reset email</Label>
                    </div>
                  </div>
                </div>

                {/* Send test email */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-orange-100">Send Test Email</h3>
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <div className="flex-1 w-full">
                      <Label>Recipient</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          setSendingTestEmail(true);
                          const res = await fetch('/api/admin/email/test', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: testEmail })
                          });
                          const data = await res.json();
                          alert(data.message || (res.ok ? 'Test email sent' : 'Failed to send test email'));
                        } catch (e) {
                          alert('Failed to send test email');
                        } finally {
                          setSendingTestEmail(false);
                        }
                      }}
                      disabled={!testEmail || sendingTestEmail}
                      variant="outline"
                    >
                      {sendingTestEmail ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Send Test
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <TestButton
                    service="smtp"
                    config={settings.email?.smtp}
                    label="Test SMTP Connection"
                  />
                  <Button
                    onClick={() => saveSection('email')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Email Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <CreditCard className="w-5 h-5" />
                  Payment Gateway Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Stripe
                    </h3>
                    <Switch
                      checked={settings.payments?.stripe?.enabled || false}
                      onCheckedChange={(checked) => updateNestedSetting('payments', 'stripe.enabled', checked)}
                    />
                  </div>
                  {settings.payments?.stripe?.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Publishable Key</Label>
                          <Input
                            value={settings.payments?.stripe?.publicKey || ''}
                            onChange={(e) => updateNestedSetting('payments', 'stripe.publicKey', e.target.value)}
                            placeholder="pk_test_..."
                          />
                        </div>
                        <PasswordInput
                          label="Secret Key"
                          value={settings.payments?.stripe?.secretKey || ''}
                          onChange={(value) => updateNestedSetting('payments', 'stripe.secretKey', value)}
                          field="stripeSecret"
                        />
                        <div className="md:col-span-2">
                          <PasswordInput
                            label="Webhook Secret"
                            value={settings.payments?.stripe?.webhookSecret || ''}
                            onChange={(value) => updateNestedSetting('payments', 'stripe.webhookSecret', value)}
                            field="stripeWebhook"
                          />
                          <p className="text-xs text-orange-100/50 mt-1">
                            Used to verify webhook signatures from Stripe. Get this from your Stripe webhook endpoint settings.
                          </p>
                        </div>
                      </div>
                      <TestButton
                        service="stripe"
                        config={settings.payments?.stripe}
                        label="Test Stripe Connection"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection('payments')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Payment Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Validation Settings */}
          <TabsContent value="validation" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <QrCode className="w-5 h-5" />
                  QR Code Validation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Test Button and Results */}
                <div className="flex justify-between items-center pb-4 border-b border-orange-500/20">
                  <div>
                    <p className="text-sm text-orange-100/50">Test QR validation configuration and security settings</p>
                  </div>
                  <Button
                    onClick={testValidationSettings}
                    disabled={testing === 'validation'}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {testing === 'validation' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4" />
                        Test Validation
                      </>
                    )}
                  </Button>
                </div>

                {testResults.validation && (
                  <div className={`p-4 rounded-lg border ${testResults.validation.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                    }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {testResults.validation.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="font-medium text-sm text-orange-100">
                        {testResults.validation.message}
                      </span>
                    </div>
                    {testResults.validation.data?.tests && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {testResults.validation.data.tests.map((test: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm p-2 bg-black/40 rounded border border-orange-500/20">
                            <span className="font-medium text-orange-100">{test.name}:</span>
                            <span className={`text-xs px-2 py-1 rounded ${test.enabled
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/10 text-orange-100/50'
                              }`}>
                              {test.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {testResults.validation.data?.summary && (
                      <div className="mt-3 pt-3 border-t border-orange-500/20 text-xs text-orange-100/50">
                        <span>Configuration: {testResults.validation.data.summary.configured} settings Ã¢â‚¬Â¢ </span>
                        <span>Active: {testResults.validation.data.summary.enabled}/{testResults.validation.data.summary.total}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Basic QR Settings */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">Basic QR Code Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Enable QR Code Generation</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.qrCodeEnabled || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'qrCodeEnabled', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.qrCodeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Enable QR Code Scanner</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.scannerEnabled || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'scannerEnabled', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.scannerEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Rules */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">Validation Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Allow Multiple Scans</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.multipleScansAllowed || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'multipleScansAllowed', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.multipleScansAllowed ? 'Allowed' : 'Single scan only'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Anti-Replay Protection</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.antiReplayEnabled || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'antiReplayEnabled', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.antiReplayEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Scan Time Window (minutes)</Label>
                      <Input
                        type="number"
                        value={settings.validation?.scanTimeWindow || 60}
                        onChange={(e) => updateNestedSetting('validation', 'scanTimeWindow', parseInt(e.target.value))}
                        placeholder="60"
                      />
                      <span className="text-xs text-orange-100/40">
                        Time window during which ticket can be validated before event
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>Validation Timeout (seconds)</Label>
                      <Input
                        type="number"
                        value={settings.validation?.validationTimeout || 30}
                        onChange={(e) => updateNestedSetting('validation', 'validationTimeout', parseInt(e.target.value))}
                        placeholder="30"
                      />
                      <span className="text-xs text-orange-100/40">
                        Maximum time to wait for validation response
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Validations per Ticket</Label>
                      <Input
                        type="number"
                        value={settings.validation?.maxValidationsPerTicket || 1}
                        onChange={(e) => updateNestedSetting('validation', 'maxValidationsPerTicket', parseInt(e.target.value))}
                        placeholder="1"
                      />
                      <span className="text-xs text-orange-100/40">
                        Maximum number of times a ticket can be validated
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">Security & Access Control</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Require Validator Role</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.requireValidatorRole || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'requireValidatorRole', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.requireValidatorRole ? 'Required' : 'Anyone can validate'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Enable Offline Validation</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.offlineValidation || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'offlineValidation', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.offlineValidation ? 'Enabled' : 'Online only'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Require Geo-location</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.geoLocationRequired || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'geoLocationRequired', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.geoLocationRequired ? 'Required' : 'Not required'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Experience */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">User Experience</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Validation Sound</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.validationSoundEnabled || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'validationSoundEnabled', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.validationSoundEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Vibration Feedback</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.vibrationEnabled || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'vibrationEnabled', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.vibrationEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logging & Monitoring */}
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-100">Logging & Monitoring</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Log All Validation Attempts</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.validation?.logValidations || false}
                          onCheckedChange={(checked) => updateNestedSetting('validation', 'logValidations', checked)}
                        />
                        <span className="text-sm text-orange-100/50">
                          {settings.validation?.logValidations ? 'All attempts logged' : 'Logging disabled'}
                        </span>
                      </div>
                      <span className="text-xs text-orange-100/40">
                        Logs successful and failed validation attempts for auditing
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-between items-center pt-4">
                  <Button
                    onClick={() => testService('validation', settings.validation)}
                    disabled={testing === 'validation'}
                    variant="outline"
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold border-orange-500"
                  >
                    {testing === 'validation' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                    Test QR Validation
                  </Button>
                  <Button onClick={() => saveSection('validation')} disabled={saving} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Validation Settings
                  </Button>
                </div>

                {/* Test Results */}
                {testResults.validation && (
                  <div className={`p-4 rounded-lg border ${testResults.validation.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResults.validation.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-medium text-orange-100">
                        QR Validation Test {testResults.validation.success ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-sm text-orange-100/70">{testResults.validation.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Settings */}
          <TabsContent value="media" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Cloud className="w-5 h-5" />
                  Media & File Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Cloudinary Configuration
                    </h3>
                    <Switch
                      checked={settings.media?.cloudinary?.enabled || false}
                      onCheckedChange={(checked) => updateNestedSetting('media', 'cloudinary.enabled', checked)}
                    />
                  </div>
                  {settings.media?.cloudinary?.enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cloud Name</Label>
                          <Input
                            value={settings.media?.cloudinary?.cloudName || ''}
                            onChange={(e) => updateNestedSetting('media', 'cloudinary.cloudName', e.target.value)}
                            placeholder="your-cloud-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <Input
                            value={settings.media?.cloudinary?.apiKey || ''}
                            onChange={(e) => updateNestedSetting('media', 'cloudinary.apiKey', e.target.value)}
                            placeholder="123456789012345"
                          />
                        </div>
                        <PasswordInput
                          label="API Secret"
                          value={settings.media?.cloudinary?.apiSecret || ''}
                          onChange={(value) => updateNestedSetting('media', 'cloudinary.apiSecret', value)}
                          field="cloudinarySecret"
                        />
                      </div>
                      <TestButton
                        service="cloudinary"
                        config={settings.media?.cloudinary}
                        label="Test Cloudinary Connection"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection('media')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Media Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Wrench className="w-5 h-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-100">Maintenance</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.system?.maintenanceMode || false}
                        onCheckedChange={(checked) => updateNestedSetting('system', 'maintenanceMode', checked)}
                      />
                      <Label>Maintenance Mode</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance Message</Label>
                      <Textarea
                        value={settings.system?.maintenanceMessage || ''}
                        onChange={(e) => updateNestedSetting('system', 'maintenanceMessage', e.target.value)}
                        placeholder="We are currently performing maintenance..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-100">Debug & Logging</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.system?.debugMode || false}
                        onCheckedChange={(checked) => updateNestedSetting('system', 'debugMode', checked)}
                      />
                      <Label>Debug Mode</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection('system')}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <Database className="w-5 h-5" />
                  Database & Environment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-orange-100/50">Test your database connection and view current status.</p>
                <TestButton
                  service="database"
                  config={{}}
                  label="Test Database Connection"
                />
                <div className="mt-4 p-4 bg-black/40 rounded-lg border border-orange-500/20">
                  <h4 className="font-semibold mb-2 text-orange-100">Current Settings Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Settings Version: {settings.version || 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Last Updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Database: Connected</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
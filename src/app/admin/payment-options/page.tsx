'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Settings,
  CreditCard,
  Building2,
  Smartphone,
  Coins,
  DollarSign,
  ArrowUpDown,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Save,
  X
} from 'lucide-react';

interface PaymentOption {
  _id: string;
  name: string;
  displayName: string;
  type: 'card' | 'bank_transfer' | 'digital_wallet' | 'cash' | 'crypto' | 'other';
  provider: string;
  isActive: boolean;
  isDefault: boolean;
  configuration: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    currency?: string;
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
  };
  supportedCurrencies: string[];
  icon?: string;
  color: string;
  description?: string;
  instructions?: string;
  priority: number;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_TYPES = [
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'digital_wallet', label: 'Digital Wallet', icon: Smartphone },
  { value: 'cash', label: 'Cash Payment', icon: DollarSign },
  { value: 'crypto', label: 'Cryptocurrency', icon: Coins },
  { value: 'other', label: 'Other', icon: Settings }
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'RSD'];

export default function PaymentOptionsPage() {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<PaymentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PaymentOption | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: 'card' as PaymentOption['type'],
    provider: '',
    isActive: true,
    isDefault: false,
    configuration: {
      apiKey: '',
      secretKey: '',
      merchantId: '',
      currency: 'EUR',
      minAmount: 0,
      maxAmount: 10000,
      processingFee: 0,
      processingFeeType: 'percentage' as 'fixed' | 'percentage'
    },
    supportedCurrencies: ['EUR'],
    icon: '',
    color: '#6366f1',
    description: '',
    instructions: '',
    priority: 0,
    testMode: false
  });

  useEffect(() => {
    fetchPaymentOptions();
  }, []);

  useEffect(() => {
    filterOptions();
  }, [paymentOptions, searchTerm, typeFilter, statusFilter]);

  const fetchPaymentOptions = async () => {
    try {
      const response = await fetch('/api/admin/payment-options');
      const data = await response.json();

      if (data.success) {
        setPaymentOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOptions = () => {
    let filtered = paymentOptions;

    if (searchTerm) {
      filtered = filtered.filter(option =>
        option.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(option => option.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(option =>
        statusFilter === 'active' ? option.isActive : !option.isActive
      );
    }

    setFilteredOptions(filtered);
  };

  const handleSubmit = async () => {
    try {
      const url = editingOption
        ? '/api/admin/payment-options'
        : '/api/admin/payment-options';

      const method = editingOption ? 'PUT' : 'POST';

      const body = editingOption
        ? { id: editingOption._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        await fetchPaymentOptions();
        resetForm();
        setIsDialogOpen(false);
      } else {
        alert(data.error || 'Failed to save payment option');
      }
    } catch (error) {
      console.error('Error saving payment option:', error);
      alert('Failed to save payment option');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment option?')) return;

    try {
      const response = await fetch(`/api/admin/payment-options?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchPaymentOptions();
      } else {
        alert(data.error || 'Failed to delete payment option');
      }
    } catch (error) {
      console.error('Error deleting payment option:', error);
      alert('Failed to delete payment option');
    }
  };

  const handleBulkAction = async (action: string, ids: string[] = selectedOptions) => {
    try {
      const response = await fetch('/api/admin/payment-options/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids })
      });

      const data = await response.json();

      if (data.success) {
        await fetchPaymentOptions();
        setSelectedOptions([]);
      } else {
        alert(data.error || 'Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action');
    }
  };

  const handleEdit = (option: PaymentOption) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      displayName: option.displayName,
      type: option.type,
      provider: option.provider,
      isActive: option.isActive,
      isDefault: option.isDefault,
      configuration: {
        apiKey: option.configuration?.apiKey || '',
        secretKey: option.configuration?.secretKey || '',
        merchantId: option.configuration?.merchantId || '',
        currency: option.configuration?.currency || '',
        minAmount: option.configuration?.minAmount || 0,
        maxAmount: option.configuration?.maxAmount || 0,
        processingFee: option.configuration?.processingFee || 0,
        processingFeeType: option.configuration?.processingFeeType || 'fixed'
      },
      supportedCurrencies: option.supportedCurrencies,
      icon: option.icon || '',
      color: option.color,
      description: option.description || '',
      instructions: option.instructions || '',
      priority: option.priority,
      testMode: option.testMode
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingOption(null);
    setFormData({
      name: '',
      displayName: '',
      type: 'card',
      provider: '',
      isActive: true,
      isDefault: false,
      configuration: {
        apiKey: '',
        secretKey: '',
        merchantId: '',
        currency: 'EUR',
        minAmount: 0,
        maxAmount: 10000,
        processingFee: 0,
        processingFeeType: 'percentage'
      },
      supportedCurrencies: ['EUR'],
      icon: '',
      color: '#6366f1',
      description: '',
      instructions: '',
      priority: 0,
      testMode: false
    });
  };

  const toggleConfigVisibility = (optionId: string) => {
    setShowConfig(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }));
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = PAYMENT_TYPES.find(t => t.value === type);
    const Icon = typeInfo?.icon || Settings;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Options</h1>
          <p className="text-gray-600 mt-1">
            Configure and manage payment methods for your platform
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Payment Option
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search payment options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus:ring-0 focus:border-0"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <option value="all">All Types</option>
            {PAYMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedOptions.length > 0 && (
          <div className="mt-4 pt-4 border-t flex gap-2">
            <Badge variant="secondary">
              {selectedOptions.length} selected
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('activate')}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('deactivate')}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('delete')}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        )}
      </Card>

      {/* Payment Options List */}
      <div className="space-y-4">
        {filteredOptions.map((option) => (
          <Card key={option._id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOptions(prev => [...prev, option._id]);
                    } else {
                      setSelectedOptions(prev => prev.filter(id => id !== option._id));
                    }
                  }}
                  className="mt-1"
                />

                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: option.color }}
                >
                  {getTypeIcon(option.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{option.displayName}</h3>
                    {option.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                    {option.testMode && (
                      <Badge variant="secondary">Test Mode</Badge>
                    )}
                    <Badge variant={option.isActive ? 'default' : 'secondary'}>
                      {option.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Provider:</strong> {option.provider}</p>
                    <p><strong>Type:</strong> {PAYMENT_TYPES.find(t => t.value === option.type)?.label}</p>
                    <p><strong>Currencies:</strong> {option.supportedCurrencies.join(', ')}</p>
                    {option.description && (
                      <p><strong>Description:</strong> {option.description}</p>
                    )}
                  </div>

                  {/* Configuration Details */}
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleConfigVisibility(option._id)}
                      className="text-xs p-1 h-auto"
                    >
                      {showConfig[option._id] ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hide Config
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Show Config
                        </>
                      )}
                    </Button>

                    {showConfig[option._id] && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1">
                        {option.configuration.minAmount !== undefined && (
                          <p><strong>Min Amount:</strong> {option.configuration.minAmount} {option.configuration.currency}</p>
                        )}
                        {option.configuration.maxAmount !== undefined && (
                          <p><strong>Max Amount:</strong> {option.configuration.maxAmount} {option.configuration.currency}</p>
                        )}
                        {option.configuration.processingFee !== undefined && (
                          <p><strong>Processing Fee:</strong> {option.configuration.processingFee}{option.configuration.processingFeeType === 'percentage' ? '%' : ` ${option.configuration.currency}`}</p>
                        )}
                        {option.configuration.merchantId && (
                          <p><strong>Merchant ID:</strong> {option.configuration.merchantId}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(option)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(option._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredOptions.length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No payment options found</h3>
              <p>Create your first payment option to get started.</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="mt-4"
              >
                Add Payment Option
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <div className="max-w-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingOption ? 'Edit Payment Option' : 'Add Payment Option'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Internal Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="stripe-card"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Credit/Debit Card"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as PaymentOption['type'] }))}
                >
                  {PAYMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="Stripe, PayPal, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.configuration.apiKey}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, apiKey: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={formData.configuration.secretKey}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, secretKey: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="merchantId">Merchant ID</Label>
                <Input
                  id="merchantId"
                  value={formData.configuration.merchantId}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    configuration: { ...prev.configuration, merchantId: e.target.value }
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount">Min Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    value={formData.configuration.minAmount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, minAmount: parseFloat(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount">Max Amount</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    value={formData.configuration.maxAmount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, maxAmount: parseFloat(e.target.value) }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="processingFee">Processing Fee</Label>
                  <Input
                    id="processingFee"
                    type="number"
                    step="0.01"
                    value={formData.configuration.processingFee}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, processingFee: parseFloat(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="processingFeeType">Fee Type</Label>
                  <Select
                    value={formData.configuration.processingFeeType}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      configuration: { ...prev.configuration, processingFeeType: value as 'fixed' | 'percentage' }
                    }))}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description and Instructions */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this payment method"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Instructions for users on how to use this payment method"
                rows={3}
              />
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isDefault">Default Payment Method</Label>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="testMode">Test Mode</Label>
                <Switch
                  checked={formData.testMode}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, testMode: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingOption ? 'Update' : 'Create'} Payment Option
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
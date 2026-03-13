'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Search, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  isActive: boolean;
  eventCount: number;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '🎭',
    color: '#8B5CF6',
    isActive: true,
    sortOrder: 0,
    metaTitle: '',
    metaDescription: ''
  });

  useEffect(() => {
    fetchCategories();
  }, [showInactive]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories?includeInactive=${showInactive}&updateCounts=true`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchCategories();
        setIsCreating(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await fetch(`/api/categories/${editingCategory.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchCategories();
        setEditingCategory(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.slug}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      metaTitle: category.metaTitle || '',
      metaDescription: category.metaDescription || ''
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '🎭',
      color: '#8B5CF6',
      isActive: true,
      sortOrder: 0,
      metaTitle: '',
      metaDescription: ''
    });
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Categories</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-orange-100/70">Loading categories...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Categories</h1>
            <p className="text-orange-100/70 mt-2">Manage event categories for better organization</p>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-6">
              <div className="text-2xl font-black text-orange-500">{categories.length}</div>
              <div className="text-sm text-orange-100/70">Total Categories</div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-6">
              <div className="text-2xl font-black text-green-400">
                {categories.filter(c => c.isActive).length}
              </div>
              <div className="text-sm text-orange-100/70">Active Categories</div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-6">
              <div className="text-2xl font-black text-orange-100/50">
                {categories.filter(c => !c.isActive).length}
              </div>
              <div className="text-sm text-orange-100/70">Inactive Categories</div>
            </CardContent>
          </Card>
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-6">
              <div className="text-2xl font-black text-orange-500">
                {categories.reduce((sum, c) => sum + c.eventCount, 0)}
              </div>
              <div className="text-sm text-orange-100/70">Total Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500/50 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor="show-inactive" className="text-sm font-medium text-orange-100/70">
              Show Inactive
            </label>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingCategory) && (
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-orange-500">
                {isCreating ? 'Create New Category' : `Edit Category: ${editingCategory?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        name,
                        slug: prev.slug || generateSlugFromName(name)
                      }));
                    }}
                    placeholder="Category name"
                    className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Slug *</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="category-slug"
                    className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-100/70 mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Category description"
                  rows={3}
                  className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Icon (Emoji)</label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="🎭"
                    className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10 p-1 border-2 border-orange-500/30 rounded bg-black/60"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#8B5CF6"
                      className="flex-1 border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Sort Order</label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="border-2 border-orange-500/30 bg-black/60 text-orange-100 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-orange-100/70 mb-1">Meta Title</label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="SEO title (60 chars max)"
                    maxLength={60}
                    className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <label htmlFor="is-active" className="text-sm font-bold text-orange-100/70">
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-100/70 mb-1">Meta Description</label>
                <Textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="SEO description (160 chars max)"
                  maxLength={160}
                  rows={2}
                  className="border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                  className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={isCreating ? handleCreateCategory : handleUpdateCategory}
                  className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? 'Create' : 'Update'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-black/60 border-2 border-orange-500/30 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-orange-500/20 rounded mb-4"></div>
                  <div className="h-8 bg-orange-500/20 rounded mb-2"></div>
                  <div className="h-3 bg-orange-500/20 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-6 bg-orange-500/20 rounded w-16"></div>
                    <div className="h-6 bg-orange-500/20 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Card key={category._id} className="bg-black/60 border-2 border-orange-500/30 relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: category.color + '20', border: `2px solid ${category.color}` }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex items-center space-x-1">
                      {category.isActive ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-100/50">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-orange-100 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-orange-100/70 mb-4 line-clamp-2">
                    {category.description || 'No description'}
                  </p>

                  <div className="flex items-center justify-between text-sm text-orange-100/50 mb-4">
                    <span>{category.eventCount} events</span>
                    <span>Order: {category.sortOrder}</span>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(category)}
                      className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      disabled={category.eventCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {category.eventCount > 0 && (
                    <p className="text-xs text-orange-100/50 mt-2">
                      Cannot delete: category has events
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredCategories.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-orange-100/50 mb-4">No categories found</div>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')} className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10">
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
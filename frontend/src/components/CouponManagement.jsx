import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Copy, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    minOrder: '',
    maxDiscount: '',
    expiryDate: '',
    usageLimit: '',
    description: '',
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/coupons`);
      if (!response.ok) throw new Error('Failed to fetch coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || !formData.value) {
      toast.error('Code and value are required');
      return;
    }
    
    setIsLoading(true);

    const couponData = {
      ...formData,
      value: parseFloat(formData.value),
      minOrder: formData.minOrder ? parseFloat(formData.minOrder) : null,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
    };

    try {
      let response;
      if (editingCoupon) {
        response = await fetch(`${API_URL}/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(couponData),
        });
        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.detail || 'Failed to update coupon');
        }
        toast.success('Coupon updated successfully!');
      } else {
        response = await fetch(`${API_URL}/coupons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(couponData),
        });
        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.detail || 'Failed to create coupon');
        }
        toast.success('Coupon created successfully!');
      }

      await response.json();
      loadCoupons(); // Refresh the list
      resetForm();
      setIsDialogOpen(false);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      minOrder: coupon.minOrder?.toString() || '',
      maxDiscount: coupon.maxDiscount?.toString() || '',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit?.toString() || '',
      description: coupon.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        const response = await fetch(`${API_URL}/coupons/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
           if (response.status === 404) throw new Error('Coupon not found');
           throw new Error('Failed to delete coupon');
        }
        toast.success('Coupon deleted successfully!');
        loadCoupons(); // Refresh list
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied!');
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      minOrder: '',
      maxDiscount: '',
      expiryDate: '',
      usageLimit: '',
      description: '',
    });
    setEditingCoupon(null);
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isLimitReached = (coupon) => {
    if (!coupon.usageLimit) return false;
    return coupon.usedCount >= coupon.usageLimit;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Tag className="w-5 h-5" />
          <span>Coupon Management</span>
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    required
                    maxLength={20}
                    disabled={!!editingCoupon} // Don't allow editing coupon code
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.type === 'percentage' ? 'Discount Percentage *' : 'Discount Amount (₹) *'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'percentage' ? '20' : '500'}
                    required
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minOrder">Minimum Order Value (₹)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    step="0.01"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    placeholder="1000"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Max Discount Amount (₹)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    step="0.01"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="2000"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">For percentage discounts</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="100"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Get 20% off on all products"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingCoupon ? 'Update Coupon' : 'Create Coupon')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading && coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No coupons yet. Create your first coupon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon, index) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <code className="text-lg font-bold bg-secondary/10 text-secondary px-3 py-1 rounded">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(coupon.code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {isExpired(coupon.expiryDate) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {isLimitReached(coupon) && (
                        <Badge variant="secondary">Limit Reached</Badge>
                      )}
                      {!isExpired(coupon.expiryDate) && !isLimitReached(coupon) && (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {coupon.description || 'No description'}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Discount</p>
                        <p className="font-semibold">
                          {coupon.type === 'percentage' 
                            ? `${coupon.value}%` 
                            : `₹${coupon.value}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min Order</p>
                        <p className="font-semibold">
                          {coupon.minOrder ? `₹${coupon.minOrder}` : 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Usage</p>
                        <p className="font-semibold">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' / ∞'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expiry</p>
                        <p className="font-semibold">
                          {coupon.expiryDate 
                            ? new Date(coupon.expiryDate).toLocaleDateString('en-IN')
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(coupon)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
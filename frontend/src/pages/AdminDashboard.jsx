import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, LogOut, Package, DollarSign, ShoppingBag, TrendingUp, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import CouponManagement from '../components/CouponManagement';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
// Base URL for viewing content
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Hero Content State
  const [heroContent, setHeroContent] = useState({ type: 'image', url: '', alt: '' });
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState('');
  const [isHeroUploading, setIsHeroUploading] = useState(false);

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    originalPrice: '',
    description: '',
    image: '',
    colors: '#1a202c',
    badge: '',
    model3DUrl: '', // <-- Store the URL
  });
  const [model3DFile, setModel3DFile] = useState(null);
  const [isModelUploading, setIsModelUploading] = useState(false);

  // Helper to get Admin Token
  const getAdminToken = () => {
    return localStorage.getItem('adminToken');
  };

  useEffect(() => {
    const isAuth = localStorage.getItem('isAdminAuthenticated');
    if (!isAuth) {
      navigate('/admin/login');
      return;
    }
    loadProducts();
    loadHeroContent();
  }, [navigate]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHeroContent = async () => {
    try {
      const response = await fetch(`${API_URL}/content/hero`);
      if (!response.ok) throw new Error('Failed to fetch hero content');
      const data = await response.json();
      setHeroContent(data);
      setHeroPreview(data.url.startsWith('/') ? `${BASE_URL}${data.url}` : data.url);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Generic File Upload Function
  const uploadFile = async (file) => {
    const token = getAdminToken();
    if (!token) {
      toast.error('Admin session expired. Please log in again.');
      return null;
    }
    
    const_formData = new FormData();
    _formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: _formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }
      
      const result = await response.json();
      return result.url; // Returns the relative URL (e.g., /uploads/filename.jpg)
      
    } catch (error) {
      toast.error(error.message);
      return null;
    }
  };

  // --- Hero Content Handlers ---
  
  const handleHeroFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB video, 10MB image
      if (file.size > maxSize) {
        toast.error(`File too large! Max ${isVideo ? '5MB' : '10MB'}.`);
        return;
      }
      
      setHeroFile(file);
      setHeroContent({ ...heroContent, type: isVideo ? 'video' : 'image' });
      setHeroPreview(URL.createObjectURL(file));
    }
  };
  
  const saveHeroContent = async () => {
    setIsHeroUploading(true);
    let fileUrl = heroContent.url; // Keep old URL if no new file

    // 1. If a new file is staged, upload it
    if (heroFile) {
      const uploadedUrl = await uploadFile(heroFile);
      if (uploadedUrl) {
        fileUrl = uploadedUrl;
      } else {
        setIsHeroUploading(false);
        return; // Upload failed
      }
    }
    
    // 2. Save the (new or old) URL to the hero content endpoint
    try {
      const token = getAdminToken();
      const response = await fetch(`${API_URL}/content/hero`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: heroContent.type,
          url: fileUrl,
          alt: heroContent.alt || '',
        }),
      });

      if (!response.ok) throw new Error('Failed to save hero content');
      
      const data = await response.json();
      setHeroContent(data);
      setHeroPreview(data.url.startsWith('/') ? `${BASE_URL}${data.url}` : data.url);
      setHeroFile(null);
      setIsHeroDialogOpen(false);
      toast.success('Hero content updated successfully!');

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsHeroUploading(false);
    }
  };

  // --- Product Form Handlers ---
  
  const handle3DModelChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
        toast.error('Please upload a GLB or GLTF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('3D model file size must be less than 10MB');
        return;
      }
      
      setModel3DFile(file); // Store the file
      setFormData({ ...formData, model3DUrl: 'Uploading...' }); // Set placeholder
      
      // Upload immediately
      setIsModelUploading(true);
      const uploadedUrl = await uploadFile(file);
      if (uploadedUrl) {
        setFormData({ ...formData, model3DUrl: uploadedUrl });
        toast.success('3D model uploaded successfully!');
      } else {
        setFormData({ ...formData, model3DUrl: '' }); // Clear on failure
      }
      setIsModelUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isModelUploading) {
      toast.error('Please wait for the 3D model to finish uploading.');
      return;
    }
    
    setIsLoading(true);

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      colors: [formData.colors],
      model3DUrl: formData.model3DUrl || null, // Ensure it's in the payload
    };

    try {
      const token = getAdminToken();
      let response;
      if (editingProduct) {
        // Update
        response = await fetch(`${API_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(productData),
        });
        if (!response.ok) throw new Error('Failed to update product');
        toast.success('Product updated successfully!');
      } else {
        // Create
        response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(productData),
        });
        if (!response.ok) throw new Error('Failed to create product');
        toast.success('Product added successfully!');
      }
      
      await response.json();
      loadProducts();
      resetForm();
      setIsDialogOpen(false);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      description: product.description || '',
      image: product.image,
      colors: product.colors?.[0] || '#1a202c',
      badge: product.badge || '',
      model3DUrl: product.model3DUrl || '', // Load existing URL
    });
    setModel3DFile(null); // Clear file input
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = getAdminToken();
        const response = await fetch(`${API_URL}/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete product');
        toast.success('Product deleted successfully!');
        loadProducts();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminToken');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const resetForm = () => {
    setFormData({
      name: '', category: '', price: '', originalPrice: '',
      description: '', image: '', colors: '#1a202c', badge: '', model3DUrl: '',
    });
    setEditingProduct(null);
    setModel3DFile(null);
  };

  const stats = [
    { title: 'Total Products', value: products.length, icon: Package, color: 'text-blue-500' },
    { title: 'Total Revenue', value: '$45,678', icon: DollarSign, color: 'text-green-500' },
    { title: 'Orders', value: '234', icon: ShoppingBag, color: 'text-purple-500' },
    { title: 'Growth', value: '+23%', icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <span className="gradient-text-green">Admin</span> Dashboard
            </h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Hero Content Management */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hero Content Management</CardTitle>
            <Dialog open={isHeroDialogOpen} onOpenChange={(open) => {
              setIsHeroDialogOpen(open);
              if (!open) {
                setHeroFile(null);
                setHeroPreview(heroContent.url.startsWith('/') ? `${BASE_URL}${heroContent.url}` : heroContent.url); // Reset preview
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Hero
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Hero Content</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroFile">Upload Image or Video</Label>
                    <Input
                      id="heroFile"
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/ogg"
                      onChange={handleHeroFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max 10MB for images | Max 5MB for videos
                    </p>
                  </div>
                  
                  {heroContent.type === 'image' && (
                    <div className="space-y-2">
                      <Label htmlFor="heroAlt">Alt Text</Label>
                      <Input
                        id="heroAlt"
                        value={heroContent.alt || ''}
                        onChange={(e) => setHeroContent({ ...heroContent, alt: e.target.value })}
                        placeholder="Fashion Model"
                      />
                    </div>
                  )}
                  
                  {heroPreview && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
                        {heroContent.type === 'video' ? (
                          <video src={heroPreview} className="w-full h-full object-cover" controls />
                        ) : (
                          <img src={heroPreview} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 justify-end pt-4">
                    <Button variant="outline" onClick={() => setIsHeroDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveHeroContent} disabled={isHeroUploading}>
                      {isHeroUploading ? 'Uploading...' : 'Save Hero Content'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Hero Content</p>
                <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
                  {heroContent.url ? (
                    heroContent.type === 'video' ? (
                      <video 
                        src={heroContent.url.startsWith('/') ? `${BASE_URL}${heroContent.url}` : heroContent.url} 
                        className="w-full h-full object-cover" 
                        muted autoPlay loop 
                      />
                    ) : (
                      <img 
                        src={heroContent.url.startsWith('/') ? `${BASE_URL}${heroContent.url}` : heroContent.url} 
                        alt={heroContent.alt} 
                        className="w-full h-full object-cover" 
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No hero content set
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{heroContent.type || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">URL</p>
                  <p className="text-sm text-muted-foreground break-all">{heroContent.url || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* ... (Product form fields: Name, Category, Price, etc. - UNCHANGED) ... */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Women, Men" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Price (₹) *</Label>
                          <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="originalPrice">Original Price (₹)</Label>
                          <Input id="originalPrice" type="number" step="0.01" value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image">Image URL *</Label>
                        <Input id="image" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://images.unsplash.com/..." required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="colors">Primary Color</Label>
                          <Input id="colors" type="color" value={formData.colors} onChange={(e) => setFormData({ ...formData, colors: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="badge">Badge</Label>
                          <Select value={formData.badge} onValueChange={(value) => setFormData({ ...formData, badge: value })}>
                            <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Badge</SelectItem>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Sale">Sale</SelectItem>
                              <SelectItem value="Trending">Trending</SelectItem>
                              <SelectItem value="Bestseller">Bestseller</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                      </div>

                      {/* MODIFIED 3D Model Input */}
                      <div className="space-y-2">
                        <Label htmlFor="model3D">3D Model (Optional)</Label>
                        <Input
                          id="model3D"
                          type="file"
                          accept=".glb,.gltf"
                          onChange={handle3DModelChange}
                          className="cursor-pointer"
                          disabled={isModelUploading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload GLB or GLTF file. Max 10MB.
                        </p>
                        {isModelUploading && (
                           <div className="flex items-center space-x-2 text-sm text-blue-500">
                             <Upload className="w-4 h-4 animate-pulse" />
                             <span>Uploading...</span>
                           </div>
                        )}
                        {formData.model3DUrl && !isModelUploading && (
                          <p className="text-xs text-secondary font-medium break-all">
                            ✓ Uploaded: {formData.model3DUrl}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || isModelUploading}>
                          {isLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* ... (Product table rendering - UNCHANGED) ... */}
                 {isLoading && products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No products yet. Add your first product!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Image</th>
                          <th className="text-left p-4">Name</th>
                          <th className="text-left p-4">Category</th>
                          <th className="text-left p-4">Price (₹)</th>
                          <th className="text-left p-4">Badge</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">
                              <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
                            </td>
                            <td className="p-4 font-medium">{product.name}</td>
                            <td className="p-4 text-muted-foreground">{product.category}</td>
                            <td className="p-4">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold">{product.price.toLocaleString('en-IN')}</span>
                                {product.originalPrice && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    {product.originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              {product.badge && product.badge !== 'none' && (
                                <span className="px-2 py-1 text-xs rounded-full bg-accent text-accent-foreground">
                                  {product.badge}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <CouponManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, LogOut, Package, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [heroContent, setHeroContent] = useState({ type: 'image', url: '', alt: '' });
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    originalPrice: '',
    description: '',
    image: '',
    colors: '#1a202c',
    badge: '',
    model3D: null,
  });

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAdminAuthenticated');
    if (!isAuth) {
      navigate('/admin/login');
      return;
    }

    // Load products from localStorage
    const savedProducts = localStorage.getItem('adminProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }

    // Load hero content
    const savedHero = localStorage.getItem('heroContent');
    if (savedHero) {
      setHeroContent(JSON.parse(savedHero));
    }
  }, [navigate]);

  const saveProducts = (updatedProducts) => {
    localStorage.setItem('adminProducts', JSON.stringify(updatedProducts));
    setProducts(updatedProducts);
  };

  const saveHeroContent = () => {
    if (heroFile) {
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const contentToSave = {
            type: heroContent.type,
            url: reader.result,
            alt: heroContent.alt
          };
          
          // Try to save to localStorage
          localStorage.setItem('heroContent', JSON.stringify(contentToSave));
          toast.success('Hero content updated successfully!');
          setIsHeroDialogOpen(false);
          setHeroFile(null);
          setHeroPreview('');
          
          // Reload hero content
          const savedHero = localStorage.getItem('heroContent');
          if (savedHero) {
            setHeroContent(JSON.parse(savedHero));
          }
        } catch (error) {
          console.error('Save error:', error);
          if (error.name === 'QuotaExceededError') {
            toast.error(
              'File too large for browser storage! Please use a smaller file (under 5MB for videos, 10MB for images) or compress it.',
              { duration: 7000 }
            );
          } else {
            toast.error('Failed to save. Please try a smaller file.');
          }
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(heroFile);
    } else if (heroPreview) {
      // Use existing preview (already uploaded)
      try {
        localStorage.setItem('heroContent', JSON.stringify(heroContent));
        toast.success('Hero content updated successfully!');
        setIsHeroDialogOpen(false);
      } catch (error) {
        toast.error('Failed to save. Storage quota exceeded.');
      }
    } else {
      toast.error('Please upload an image or video');
    }
  };

  const handleHeroFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error('Please upload an image or video file');
        return;
      }

      // Different size limits for images and videos
      const maxSize = isVideo ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for video, 10MB for images
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      
      if (file.size > maxSize) {
        toast.error(
          `File too large! ${isVideo ? 'Videos' : 'Images'} must be under ${isVideo ? '5MB' : '10MB'}. Your file: ${sizeMB}MB. Please compress it first.`,
          { duration: 5000 }
        );
        return;
      }

      setHeroFile(file);
      setHeroContent({
        ...heroContent,
        type: isVideo ? 'video' : 'image'
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroPreview(reader.result);
      };
      reader.onerror = () => {
        toast.error('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
      
      // Show helpful message for large files
      if (file.size > 3 * 1024 * 1024) {
        toast.warning('Large file detected. This may take a moment to save...', { duration: 3000 });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Update existing product
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? { ...formData, id: editingProduct.id } : p
      );
      saveProducts(updatedProducts);
      
      // Save 3D model separately
      if (formData.model3D) {
        save3DModel(editingProduct.id, formData.model3D);
      }
      
      toast.success('Product updated successfully!');
    } else {
      // Add new product
      const productId = Date.now();
      const newProduct = {
        ...formData,
        id: productId,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        colors: [formData.colors],
      };
      saveProducts([...products, newProduct]);
      
      // Save 3D model separately
      if (formData.model3D) {
        save3DModel(productId, formData.model3D);
      }
      
      toast.success('Product added successfully!');
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const save3DModel = (productId, modelFile) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const existingModels = JSON.parse(localStorage.getItem('product3DModels') || '[]');
      const updatedModels = existingModels.filter(m => m.productId !== productId);
      updatedModels.push({
        productId,
        modelUrl: reader.result,
        fileName: modelFile.name
      });
      localStorage.setItem('product3DModels', JSON.stringify(updatedModels));
    };
    reader.readAsDataURL(modelFile);
  };

  const handle3DModelChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
        toast.error('Please upload a GLB or GLTF file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('3D model file size must be less than 10MB');
        return;
      }
      
      setFormData({ ...formData, model3D: file });
      toast.success('3D model selected');
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const updatedProducts = products.filter(p => p.id !== id);
      saveProducts(updatedProducts);
      toast.success('Product deleted successfully!');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      originalPrice: '',
      description: '',
      image: '',
      colors: '#1a202c',
      badge: '',
    });
    setEditingProduct(null);
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
                setHeroPreview('');
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
                    <div className="flex items-center gap-4">
                      <Input
                        id="heroFile"
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/ogg"
                        onChange={handleHeroFileChange}
                        className="cursor-pointer"
                      />
                      {heroFile && (
                        <span className="text-sm text-muted-foreground">
                          {(heroFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported: Images (JPG, PNG, WebP) max 10MB | Videos (MP4, WebM, OGG) max 5MB
                    </p>
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ For larger videos, compress them first using tools like HandBrake or FFmpeg
                    </p>
                    {heroFile && (
                      <div className="text-xs space-y-1">
                        <p className="text-secondary font-medium">✓ File selected: {heroFile.name}</p>
                        <p className="text-muted-foreground">Type: {heroContent.type}</p>
                      </div>
                    )}
                  </div>
                  
                  {heroContent.type === 'image' && (
                    <div className="space-y-2">
                      <Label htmlFor="heroAlt">Alt Text</Label>
                      <Input
                        id="heroAlt"
                        value={heroContent.alt}
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
                    <Button onClick={saveHeroContent} disabled={!heroFile && !heroPreview}>
                      Save Hero Content
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
                      <video src={heroContent.url} className="w-full h-full object-cover" muted autoPlay loop />
                    ) : (
                      <img src={heroContent.url} alt={heroContent.alt} className="w-full h-full object-cover" />
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
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{heroContent.url ? 'Active' : 'Not configured'}</p>
                </div>
                {heroContent.type === 'image' && heroContent.alt && (
                  <div>
                    <p className="text-sm font-medium">Alt Text</p>
                    <p className="text-sm text-muted-foreground">{heroContent.alt}</p>
                  </div>
                )}
                <div className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    • Images appear as background on hero section
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Videos auto-play on loop with play/pause control
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Recommended: High-resolution images (1920x1080 or higher)
                  </p>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Women, Men, Accessories"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Original Price ($)</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        step="0.01"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Image URL *</Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="colors">Primary Color</Label>
                      <Input
                        id="colors"
                        type="color"
                        value={formData.colors}
                        onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="badge">Badge</Label>
                      <Select value={formData.badge} onValueChange={(value) => setFormData({ ...formData, badge: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select badge" />
                        </SelectTrigger>
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
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model3D">3D Model (Optional)</Label>
                    <Input
                      id="model3D"
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handle3DModelChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload GLB or GLTF file for 3D preview. Max 10MB. Customers can rotate and view it.
                    </p>
                    {formData.model3D && (
                      <p className="text-xs text-secondary font-medium">
                        \u2714 {formData.model3D.name} selected
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
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
                      <th className="text-left p-4">Price</th>
                      <th className="text-left p-4">Badge</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        </td>
                        <td className="p-4 font-medium">{product.name}</td>
                        <td className="p-4 text-muted-foreground">{product.category}</td>
                        <td className="p-4">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold">${product.price}</span>
                            {product.originalPrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                ${product.originalPrice}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {product.badge && (
                            <span className="px-2 py-1 text-xs rounded-full bg-accent text-accent-foreground">
                              {product.badge}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                            >
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
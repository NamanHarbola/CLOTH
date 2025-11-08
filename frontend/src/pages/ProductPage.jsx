import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, ShoppingCart, Heart, Share2, Star, Truck, Shield, RotateCcw,
  Cuboid, // <-- CORRECTED ICON
  Image as ImageIcon 
} from 'lucide-react'; 
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import Product3DViewer from '../components/Product3DViewer';
import SizeChart from '../components/SizeChart';

// Define API and BASE URLs
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

// Define fixed product details not in the basic model
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const FEATURES = [
  '100% Organic Cotton',
  'Premium Quality Fabric',
  'Sustainable Production',
  'Perfect Fit Guarantee',
];
const RATING = 4.8;
const REVIEWS = 248;

// --- Helper function to get full image URL ---
const getImageUrl = (url) => {
  if (!url) return '';
  // If URL is relative (starts with /), prepend BASE_URL
  if (url.startsWith('/') && BASE_URL) {
    return `${BASE_URL}${url}`;
  }
  // Otherwise, use the URL as-is (e.g., if it's an external link)
  return url;
};

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [show3D, setShow3D] = useState(false); // State for 2D/3D toggle

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/products/${id}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const productData = await response.json();
        
        const fullProductData = {
          ...productData,
          colors: (productData.colors || ['#1a202c']).map((colorValue, idx) => ({
            name: idx === 0 ? 'Navy' : idx === 1 ? 'Charcoal' : 'Gray',
            value: colorValue
          })),
          sizes: SIZES,
          features: FEATURES,
          rating: RATING,
          reviews: REVIEWS,
        };
        
        setProduct(fullProductData);
        if (fullProductData.colors && fullProductData.colors.length > 0) {
          setSelectedColor(fullProductData.colors[0].value);
        }
      } catch (error) {
        toast.error(error.message);
        navigate('/collection/new');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleAddToCart = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Please log in to add items to your cart.');
      return;
    }

    const cartItem = {
      productId: id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      selectedSize,
      selectedColor,
      quantity,
    };

    try {
      const response = await fetch(`${API_URL}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cartItem),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to cart.');
      }
      
      await response.json();
      toast.success('Added to cart successfully!');
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
         <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading product...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* --- MODIFIED PRODUCT VIEWER --- */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="sticky top-24 space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                {show3D && product.model3DUrl ? (
                  // 3D View
                  <Product3DViewer productId={id} /> 
                ) : (
                  // 2D Image View (Default)
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* 3D Toggle Button (only shows if model exists) */}
              {product.model3DUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShow3D(!show3D)}
                >
                  {show3D ? (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <Cuboid className="w-4 h-4 mr-2" /> // <-- CORRECTED ICON
                  )}
                  {show3D ? 'Show 2D Image' : 'View in 3D'}
                </Button>
              )}
            </div>
          </motion.div>
          {/* --- END OF MODIFICATION --- */}


          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? 'fill-secondary text-secondary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold">{'\u20B9'}{product.price.toLocaleString('en-IN')}</span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {'\u20B9'}{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {product.originalPrice && (
                  <span className="text-sm font-semibold text-accent">
                    Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Color: {product.colors.find(c => c.value === selectedColor)?.name}</label>
              <div className="flex space-x-3">
                {product.colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-12 h-12 rounded-full transition-all ${
                      selectedColor === color.value
                        ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Size: {selectedSize}</label>
                <SizeChart />
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? 'default' : 'outline'}
                    onClick={() => setSelectedSize(size)}
                    className="min-w-[60px]"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setIsLiked(!isLiked);
                  toast.success(isLiked ? 'Removed from wishlist' : 'Added to wishlist');
                }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-accent text-accent' : ''}`} />
              </Button>
              <Button size="lg" variant="outline">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 py-6 border-y">
              <div className="flex flex-col items-center text-center space-y-2">
                <Truck className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">2 Year Warranty</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <RotateCcw className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">Easy Returns</span>
              </div>
            </div>

            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="description" className="flex-1">Description</TabsTrigger>
                <TabsTrigger value="features" className="flex-1">Features</TabsTrigger>
                <TabsTrigger value="care" className="flex-1">Care</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="space-y-4 pt-4">
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || "Experience unparalleled comfort with our premium designer t-shirt. Crafted from the finest organic cotton, this piece combines luxury with sustainability."}
                </p>
              </TabsContent>
              <TabsContent value="features" className="space-y-2 pt-4">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="care" className="space-y-2 pt-4">
                <p className="text-muted-foreground">Machine wash cold with like colors. Tumble dry low. Do not bleach. Iron on low heat if needed.</p>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
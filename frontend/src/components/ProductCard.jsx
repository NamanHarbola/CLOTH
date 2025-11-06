import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function ProductCard({ product, index }) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleProductClick = () => {
    // MODIFIED: No longer save to localStorage.
    // The ProductPage will fetch its own data.
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Please log in to add items to your cart.');
      return;
    }
    
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      selectedSize: 'M', // Default size
      selectedColor: product.colors?.[0] || '#1a202c', // Default color
      quantity: 1,
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
      toast.success(`${product.name} added to cart!`);
      
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    toast.success(isLiked ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className="group cursor-pointer overflow-hidden border-border hover:shadow-lg transition-all duration-300"
        onClick={handleProductClick}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            animate={{
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.6 }}
          />
          
          {product.badge && product.badge !== 'none' && (
            <div className="absolute top-4 left-4 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold rounded-full">
              {product.badge}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleLike}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isLiked ? 'fill-accent text-accent' : 'text-foreground'
              }`}
            />
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 20,
            }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-4 right-4"
          >
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </motion.div>
        </div>
        
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="font-semibold text-base mb-2 line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold text-foreground">
                {'\u20B9'}{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {'\u20B9'}{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {product.colors && (
              <div className="flex space-x-1">
                {product.colors.slice(0, 3).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
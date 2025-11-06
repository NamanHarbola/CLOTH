import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Grid3x3, Grid2x2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function CollectionPage() {
  const { category } = useParams();
  const [gridColumns, setGridColumns] = useState(4);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch products from API
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        let allProducts = await response.json();
        
        // Filter by category if one is provided in the URL (and not 'new')
        if (category && category.toLowerCase() !== 'new') {
          allProducts = allProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        
        setProducts(allProducts);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, [category]);

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-5xl sm:text-6xl font-bold capitalize">
              {category} <span className="gradient-text-green">Collection</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our curated selection of premium {category} pieces
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters & Controls */}
      <section className="py-8 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                {isLoading ? '...' : products.length} items
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select defaultValue="featured">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="hidden md:flex items-center space-x-2 border rounded-lg p-1">
                <Button
                  variant={gridColumns === 4 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGridColumns(4)}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={gridColumns === 3 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGridColumns(3)}
                >
                  <Grid2x2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
             <div className="text-center text-muted-foreground">No products found in this collection.</div>
          ) : (
            <div
              className={`grid gap-8 ${
                gridColumns === 4
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
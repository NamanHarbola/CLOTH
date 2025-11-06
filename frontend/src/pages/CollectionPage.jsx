import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Grid3x3, Grid2x2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function CollectionPage() {
  const { category } = useParams();
  const [gridColumns, setGridColumns] = useState(4);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Mock products data
    const mockProducts = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Premium Item ${i + 1}`,
      category: category || 'Fashion',
      price: Math.floor(Math.random() * 400) + 100,
      originalPrice: Math.random() > 0.5 ? Math.floor(Math.random() * 500) + 200 : null,
      image: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=800&q=80`,
      badge: Math.random() > 0.7 ? ['New', 'Sale', 'Trending'][Math.floor(Math.random() * 3)] : null,
      colors: ['#1a202c', '#9b2c2c', '#276749'].slice(0, Math.floor(Math.random() * 3) + 1),
    }));
    setProducts(mockProducts);
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
                {products.length} items
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
        </div>
      </section>
    </div>
  );
}
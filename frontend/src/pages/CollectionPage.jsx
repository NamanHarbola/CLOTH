import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';
import { Package } from 'lucide-react';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function CollectionPage() {
  // 'category' can be undefined if the route is /search, for example
  const { category } = useParams(); 
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search'); // Use 'search' as param

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
          throw new Error('Failed to load products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []); // Fetch all products once on load

  const filteredProducts = products.filter(product => {
    // 1. Category Filter
    // Added '?' to 'category?.toLowerCase()' to prevent crash if category is undefined
    const categoryMatch = !category || // If category is undefined, this is true
                          category === 'all' || 
                          category === 'new' || 
                          (product.category && product.category.toLowerCase() === category?.toLowerCase());
    
    // 2. Search Term Filter
    if (searchTerm) {
      const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // If we are searching, we must match the search term
      return categoryMatch && searchMatch;
    }
    
    // If no search term, just filter by category
    return categoryMatch;
  });

  const finalProducts = (category === 'new' && !searchTerm) 
    ? filteredProducts.filter(p => p.badge === 'New') 
    : filteredProducts;

  // --- THIS IS THE FIX ---
  // We check if 'category' exists before trying to use .charAt()
  let title;
  if (searchTerm) {
    title = `Search results for "${searchTerm}"`;
  } else if (category === 'new') {
    title = 'New Arrivals';
  } else if (category) { // <--- THIS CHECK PREVENTS THE CRASH
    title = category.charAt(0).toUpperCase() + category.slice(1);
  } else {
    title = 'All Products'; // Fallback for when no category is set
  }
  // --- END FIX ---

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          <p className="text-lg text-muted-foreground mb-10">
            {finalProducts.length} {finalProducts.length === 1 ? 'product' : 'products'} found
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Skeleton Loaders */}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : finalProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {finalProducts.map((product, index) => (
              product ? (
                <ProductCard key={product.id || index} product={product} index={index} />
              ) : null
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <Package className="w-24 h-24 text-muted-foreground opacity-50 mb-6" />
            <h2 className="text-2xl font-bold mb-2">No Products Found</h2>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any products that match your criteria. Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
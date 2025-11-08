import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Define API and BASE URLs
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

export default function HeroMedia() {
  const [heroContent, setHeroContent] = useState({
    type: 'image',
    url: '', // Start with empty URL
    alt: 'Loading hero content...',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHeroContent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/content/hero`);
        if (!response.ok) {
          throw new Error('Failed to fetch hero content');
        }
        const data = await response.json();
        
        // Prepend BASE_URL if the URL is relative (e.g., /uploads/...)
        if (data.url && data.url.startsWith('/')) {
          data.url = `${BASE_URL}${data.url}`;
        }
        
        setHeroContent(data);
      } catch (error) {
        toast.error(error.message);
        // Set a fallback image on error
        setHeroContent({
          type: 'image',
          url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
          alt: 'Fashion Model',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeroContent();
  }, []);

  // Show a simple loading state or a blank div
  if (isLoading || !heroContent.url) {
    return (
      <div className="w-full h-full bg-muted animate-pulse" />
    );
  }

  // Render video or image based on fetched type
  if (heroContent.type === 'video') {
    return (
      <motion.video
        key={heroContent.url}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="w-full h-full object-cover"
        src={heroContent.url}
        autoPlay
        loop
        muted
        playsInline // Important for mobile browsers
      />
    );
  }

  // Default to rendering an image
  return (
    <motion.img
      key={heroContent.url}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      src={heroContent.url}
      alt={heroContent.alt}
      className="w-full h-full object-cover"
    />
  );
}
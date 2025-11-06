import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, TrendingUp, Award } from 'lucide-react';
import { Button } from '../components/ui/button';
import HeroMedia from '../components/HeroMedia';
import ProductCard from '../components/ProductCard';
import ScrollReveal from '../components/ScrollReveal';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const mouseY = useTransform(scrollYProgress, [0, 0.1], [0, 20]);

  const featuredProducts = [
    {
      id: 1,
      name: 'Premium Leather Jacket',
      category: 'Outerwear',
      price: 24999,
      originalPrice: 32999,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
      badge: 'New',
      colors: ['#1a202c', '#4a5568', '#2d3748'],
    },
    {
      id: 2,
      name: 'Silk Evening Dress',
      category: 'Women',
      price: 37999,
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      badge: 'Trending',
      colors: ['#742a2a', '#1a202c', '#2c5282'],
    },
    {
      id: 3,
      name: 'Designer Sneakers',
      category: 'Footwear',
      price: 15699,
      originalPrice: 20599,
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80',
      colors: ['#ffffff', '#1a202c', '#9b2c2c'],
    },
    {
      id: 4,
      name: 'Cashmere Sweater',
      category: 'Knitwear',
      price: 23099,
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
      badge: 'Bestseller',
      colors: ['#c6977f', '#744210', '#1a202c'],
    },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'Premium Quality',
      description: 'Handcrafted with finest materials',
    },
    {
      icon: TrendingUp,
      title: 'Latest Trends',
      description: 'Stay ahead with fashion-forward designs',
    },
    {
      icon: Award,
      title: 'Award Winning',
      description: 'Recognized excellence in fashion',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Full Screen Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Hero Media Background */}
        <div className="absolute inset-0 w-full h-full">
          <HeroMedia />
        </div>
        
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-6 py-3 bg-secondary/20 backdrop-blur-sm border border-secondary/30 rounded-full text-sm font-medium text-white mb-8"
            >
              ✨ Experience Luxury Fashion
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-tight text-white mb-6"
            >
              Redefining
              <br />
              <span className="gradient-text-green">Luxury Fashion</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-12"
            >
              Discover our exclusive collection of premium garments,
              designed for those who appreciate the finer things in life.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 h-auto group"
                onClick={() => navigate('/collection/new')}
              >
                Explore Collection
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6 h-auto backdrop-blur-sm bg-white/10"
              >
                New Arrivals
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Smooth Scroll Indicator with Mouse */}
        <motion.div
          style={{ opacity, y: mouseY }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center text-white/90"
          >
            <span className="text-sm mb-3 font-medium tracking-wide">Scroll to explore</span>
            {/* Animated Mouse */}
            <motion.div
              animate={{
                y: [0, 8, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-7 h-11 border-2 border-white/60 rounded-full flex items-start justify-center p-2 backdrop-blur-sm bg-white/5"
            >
              <motion.div
                animate={{
                  y: [0, 12, 0],
                  opacity: [1, 0.3, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-3 bg-white rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section with Dark Background */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all border border-white/10">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-white/70">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold">
                Featured <span className="gradient-text-green">Collection</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover our handpicked selection of premium garments, crafted with
                precision and designed for the modern connoisseur.
              </p>
            </div>
          </ScrollReveal>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
          
          <ScrollReveal>
            <div className="text-center mt-12">
              <Button
                size="lg"
                variant="outline"
                className="border-2"
                onClick={() => navigate('/collection/new')}
              >
                View All Products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section with Dark Background */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-secondary to-transparent" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <ScrollReveal>
            <h2 className="text-4xl sm:text-5xl font-bold">
              Join Our Exclusive Community
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Subscribe to receive early access to new collections, exclusive offers,
              and style inspiration.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-6 py-4 rounded-full bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 whitespace-nowrap px-8"
              >
                Subscribe
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
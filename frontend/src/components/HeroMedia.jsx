import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Upload } from 'lucide-react';
import { Button } from './ui/button';

export default function HeroMedia() {
  const [heroContent, setHeroContent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Load hero content from localStorage (admin-controlled)
    const savedHero = localStorage.getItem('heroContent');
    if (savedHero) {
      const parsed = JSON.parse(savedHero);
      setHeroContent(parsed);
      console.log('Loaded hero content:', parsed.type, parsed.url?.substring(0, 50));
    } else {
      // Default hero content
      setHeroContent({
        type: 'image',
        url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
        alt: 'Fashion Model'
      });
    }
  }, []);

  const handleVideoToggle = () => {
    const video = document.getElementById('hero-video');
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoError = () => {
    console.error('Video failed to load');
    setVideoError(true);
  };

  if (!heroContent) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />
    );
  }

  return (
    <div className="relative w-full h-full">
      {heroContent.type === 'video' ? (
        <>
          {!videoError ? (
            <>
              <video
                id="hero-video"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                onError={handleVideoError}
              >
                <source src={heroContent.url} />
                Your browser does not support the video tag.
              </video>
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-6 right-6 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white z-20"
                onClick={handleVideoToggle}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Video failed to load</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroContent.url})` }}
        />
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Play, Pause, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
// Base URL for viewing content
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

export default function HeroMedia() {
  const [heroContent, setHeroContent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Load hero content from API
    const fetchHeroContent = async () => {
      try {
        const response = await fetch(`${API_URL}/content/hero`);
        if (!response.ok) throw new Error('Failed to load hero content');
        const data = await response.json();
        
        // Construct absolute URL if it's relative
        if (data.url && data.url.startsWith('/')) {
          data.url = `${BASE_URL}${data.url}`;
        }
        
        setHeroContent(data);
        console.log('Loaded hero content from API:', data.type);
      } catch (error) {
        toast.error(error.message);
        // Set default hero content on error
        setHeroContent({
          type: 'image',
          url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
          alt: 'Fashion Model'
        });
      }
    };
    
    fetchHeroContent();
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
                src={heroContent.url} // Use src attribute for reliability
              >
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
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  The admin may need to re-upload this file.
                </p>
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
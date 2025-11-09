import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import UserAuthDialog from './UserAuthDialog'; // We need this for the user modal
import { useAuth } from '../context/AuthContext'; // We'll need this in a moment

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user info from context

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to a search results page
      navigate(`/search?search=${searchTerm.trim()}`);
      setSearchTerm('');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo/Brand */}
            <Link to="/" className="text-2xl font-bold">
              RISHÉ
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/category/all" className="text-sm font-medium text-muted-foreground hover:text-primary">
                All
              </Link>
              <Link to="/category/shirts" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Shirts
              </Link>
              <Link to="/category/pants" className="text-sm font-medium text-muted-foreground hover:text-primary">
                Pants
              </Link>
              <Link to="/category/new" className="text-sm font-medium text-muted-foreground hover:text-primary">
                New Arrivals
              </Link>
            </div>

            {/* Search & Icons */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <form onSubmit={handleSearch} className="hidden md:flex items-center">
                <Input 
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-32 md:w-full"
                />
                <Button type="submit" variant="ghost" size="icon">
                  <Search className="w-5 h-5" />
                </Button>
              </form>

              {/* Admin Link - only shows if user is admin */}
              {user && user.isAdmin && (
                <Button asChild variant="ghost" size="icon">
                  <Link to="/admin" title="Admin Dashboard">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </Link>
                </Button>
              )}

              <Button asChild variant="ghost" size="icon">
                <Link to="/cart">
                  <ShoppingCart className="w-5 h-5" />
                </Link>
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setIsAuthOpen(true)}>
                <User className="w-5 h-5" />
              </Button>
            </div>

          </div>
        </div>
      </nav>
      
      {/* Login/Signup Dialog */}
      <UserAuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
    </>
  );
}
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

const HomePage = lazy(() => import('./pages/HomePage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Admin Routes - No Navbar */}
          <Route path="/admin/login" element={
            <Suspense fallback={<LoadingSpinner />}>
              <AdminLoginPage />
            </Suspense>
          } />
          <Route path="/admin/dashboard" element={
            <Suspense fallback={<LoadingSpinner />}>
              <AdminDashboard />
            </Suspense>
          } />
          
          {/* Public Routes - With Navbar */}
          <Route path="/*" element={
            <>
              <Navbar />
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/collection/:category" element={<CollectionPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                </Routes>
              </Suspense>
            </>
          } />
        </Routes>
        <Toaster position="bottom-right" />
      </div>
    </Router>
  );
}
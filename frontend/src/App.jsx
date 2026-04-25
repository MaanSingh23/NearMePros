import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import AddService from './pages/AddService';
import EditService from './pages/EditService';
// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Bookings from './pages/Bookings';
import Profile from './pages/Profile';
import Verification from './pages/Verification';
import ProviderDashboard from './pages/ProviderDashboard';
import ManageServices from './pages/ManageServices';
import ProviderAnalytics from './pages/ProviderAnalytics';
import CustomerReviews from './pages/CustomerReviews';

// Admin Pages
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProviderVerifications from './pages/Admin/ProviderVerifications';
import ManageProviders from './pages/Admin/ManageProviders';
import RevenueReports from './pages/Admin/RevenueReports';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// NotFound Component
const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="glass-card rounded-[2rem] p-10 text-center">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-primary-700">Lost route</p>
      <h1 className="mb-4 text-7xl font-black text-stone-900">404</h1>
      <p className="mb-8 text-xl text-stone-600 dark:text-stone-400">Page not found</p>
      <a href="/" className="btn-primary inline-flex">
        Go Home
      </a>
    </div>
  </div>
);

// AppContent handles logic that needs useLocation
const AppContent = () => {
  const location = useLocation();
  const authRoutes = ['/login', '/register', '/admin/login'];
  const isAuthPage = authRoutes.includes(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1c1917',
            color: '#fff',
          }
        }}
      />
      
      <main className={`flex-grow ${isAuthPage ? '' : 'pt-24 pb-16'}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<Services />} />
          <Route path="/service/:id" element={<ServiceDetail />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/verifications" element={<AdminRoute><ProviderVerifications /></AdminRoute>} />
          <Route path="/admin/providers" element={<AdminRoute><ManageProviders /></AdminRoute>} />
          <Route path="/admin/revenue" element={<AdminRoute><RevenueReports /></AdminRoute>} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
          <Route path="/bookings/:id" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><CustomerReviews /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
          
          {/* Provider Routes */}
          <Route path="/provider/dashboard" element={<ProtectedRoute requiredRole="provider"><ProviderDashboard /></ProtectedRoute>} />
          <Route path="/provider/services" element={<ProtectedRoute requiredRole="provider"><ManageServices /></ProtectedRoute>} />
          <Route path="/provider/services/new" element={<ProtectedRoute requiredRole="provider"><AddService /></ProtectedRoute>} />
          <Route path="/provider/services/:id/edit" element={<ProtectedRoute requiredRole="provider"><EditService /></ProtectedRoute>} />
          <Route path="/provider/analytics" element={<ProtectedRoute requiredRole="provider"><ProviderAnalytics /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <AppContent />
        </LocationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

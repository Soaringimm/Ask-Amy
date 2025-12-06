import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    // Optionally, render a loading spinner or component here
    return <div>Loading authentication...</div>;
  }

  if (!user) {
    // User is not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    // If roles are specified, check if the user's profile role matches
    if (!profile || !roles.includes(profile.role)) {
      // User does not have the required role, redirect to an unauthorized page or home
      // For now, let's redirect to home
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and has the required role (if specified)
  return children ? children : <Outlet />;
};

export default ProtectedRoute;

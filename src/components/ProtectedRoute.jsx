import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Если не залогинен, отправляем на /login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если залогинен, показываем страницу
  return children;
};

export default ProtectedRoute;
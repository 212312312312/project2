import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import DriverRegistrationPage from './pages/DriverRegistrationPage'; 
import DriverPhotoUploadWebView from './pages/DriverPhotoUploadWebView'; // 👈 ДОБАВЛЕНО

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* === Публичные роуты === */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Роут для WebView регистрации (доступен без логина) */}
        <Route path="/driver-register" element={<DriverRegistrationPage />} />

        {/* Роут для WebView фотоконтроля водителя (доступен без логина диспетчера) */}
        <Route path="/driver/photo-upload" element={<DriverPhotoUploadWebView />} /> {/* 👈 ДОБАВЛЕНО */}

        {/* === Защищенные роуты (Админка) === */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
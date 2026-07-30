import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import DriverRegistrationPage from './pages/DriverRegistrationPage'; 
import DriverPhotoUploadWebView from './pages/DriverPhotoUploadWebView';
import AddCarPage from './pages/AddCarPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* === Публичные роуты (WebView для водителя) === */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/driver-register/*" element={<DriverRegistrationPage />} />
        <Route path="/driver/photo-upload/*" element={<DriverPhotoUploadWebView />} />
        <Route path="/add-car/*" element={<AddCarPage />} />

        {/* === Защищенные роуты (Диспетчерская) === */}
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
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
// Импортируем новую страницу регистрации
import DriverRegistrationPage from './pages/DriverRegistrationPage'; 

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* === Публичные роуты === */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Роут для WebView регистрации (доступен без логина) */}
        <Route path="/driver-register" element={<DriverRegistrationPage />} />

        {/* === Защищенные роуты (Админка) === */}
        <Route
          path="/*" // "/*" перенаправляет всё управление в DashboardLayout
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
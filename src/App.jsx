import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* === Публичный роут === */}
        <Route path="/login" element={<LoginPage />} />

        {/* === Защищенные роуты === */}
        <Route
          path="/*" // "/*" означает "все остальные пути"
          element={
            <ProtectedRoute>
              {/* DashboardLayout содержит свои (вложенные) роуты */}
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
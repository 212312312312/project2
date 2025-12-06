import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

// Импортируем ВСЕ страницы
import OrdersPage from './OrdersPage';
import DriversPage from './DriversPage'; 
import ClientsPage from './ClientsPage';
import TariffsPage from './TariffsPage'; 
import DispatchersPage from './DispatchersPage'; // <-- НОВЫЙ ИМПОРТ

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  
  // Определяем, является ли пользователь Администратором
  const isAdmin = user && user.role === 'ADMINISTRATOR';

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>Taxi-App (Диспетчерская)</h1>
        <div className="user-info">
          <span>{user?.fullName} ({user?.role})</span>
          <button onClick={logout}>Выйти</button>
        </div>
      </header>
      
      <nav className="dashboard-nav">
        {/* Общие вкладки для ADMIN и DISPATCHER */}
        <NavLink to="/" end>Заказы</NavLink>
        <NavLink to="/drivers">Водители</NavLink>
        <NavLink to="/clients">Клиенты</NavLink>
        
        {/* Вкладки ТОЛЬКО ДЛЯ АДМИНА */}
        {isAdmin && (
          <>
            <NavLink to="/tariffs">Тарифы</NavLink>
            <NavLink to="/dispatchers">Диспетчеры</NavLink>
          </>
        )}
      </nav>

      <main className="dashboard-content">
        <Routes>
          {/* Общие роуты */}
          <Route path="/" element={<OrdersPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          
          {/* Роуты ТОЛЬКО ДЛЯ АДМИНА */}
          {isAdmin ? (
            <>
              <Route path="/tariffs" element={<TariffsPage />} />
              <Route path="/dispatchers" element={<DispatchersPage />} />
            </>
          ) : (
            <>
              {/* Если обычный Диспетчер попытается зайти на /tariffs, его перекинет на главную */}
              <Route path="/tariffs" element={<Navigate to="/" replace />} />
              <Route path="/dispatchers" element={<Navigate to="/" replace />} />
            </>
          )}
          
          <Route path="*" element={<h2>Страница не найдена</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardLayout;
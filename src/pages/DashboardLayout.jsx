import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

// Импортируем ВСЕ страницы
import OrdersPage from './OrdersPage';
import DriversPage from './DriversPage'; 
import ClientsPage from './ClientsPage';
import TariffsPage from './TariffsPage'; 
import DispatchersPage from './DispatchersPage';
import PromosPage from './PromosPage';         // Акции (Задания за поездки)
import PromoCodesPage from './PromoCodesPage'; // Текстовые коды
import NewsPage from './NewsPage';             // Сповіщення
import ServicesPage from './Services';         // Доп. послуги
import SettingsPage from './SettingsPage';     // <-- НОВАЯ СТРАНИЦА (Налаштування)

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
            <NavLink to="/news">Сповіщення</NavLink> 
            <NavLink to="/services">Дод. послуги</NavLink>

            <NavLink to="/tariffs">Тарифы</NavLink>
            <NavLink to="/dispatchers">Диспетчеры</NavLink>
            
            <NavLink to="/promos">Акції (Завдання)</NavLink>
            <NavLink to="/promocodes">Промокоди</NavLink>

            {/* --- НОВАЯ КНОПКА В МЕНЮ --- */}
            <NavLink to="/settings">Налаштування</NavLink>
            {/* --------------------------- */}
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
              <Route path="/news" element={<NewsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              
              <Route path="/tariffs" element={<TariffsPage />} />
              <Route path="/dispatchers" element={<DispatchersPage />} />
              
              <Route path="/promos" element={<PromosPage />} />
              <Route path="/promocodes" element={<PromoCodesPage />} />

              {/* --- НОВЫЙ РОУТ --- */}
              <Route path="/settings" element={<SettingsPage />} />
              {/* ------------------ */}
            </>
          ) : (
            <>
              {/* Если обычный Диспетчер попытается зайти на закрытые страницы */}
              <Route path="/news" element={<Navigate to="/" replace />} />
              <Route path="/services" element={<Navigate to="/" replace />} />
              
              <Route path="/tariffs" element={<Navigate to="/" replace />} />
              <Route path="/dispatchers" element={<Navigate to="/" replace />} />
              <Route path="/promos" element={<Navigate to="/" replace />} />
              <Route path="/promocodes" element={<Navigate to="/" replace />} />

              {/* --- ЗАЩИТА НОВОГО РОУТА --- */}
              <Route path="/settings" element={<Navigate to="/" replace />} />
              {/* --------------------------- */}
            </>
          )}
          
          <Route path="*" element={<h2>Страница не найдена</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardLayout;
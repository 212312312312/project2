import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Импортируем ВСЕ страницы
import OrdersPage from './OrdersPage';
import DriversPage from './DriversPage'; 
import ClientsPage from './ClientsPage';
import TariffsPage from './TariffsPage'; 
import DispatchersPage from './DispatchersPage';
import PromosPage from './PromosPage';         
import PromoCodesPage from './PromoCodesPage'; 
import NewsPage from './NewsPage';             
import ServicesPage from './Services';         
import SettingsPage from './SettingsPage';     
import SectorsPage from './SectorsPage';
// --- НОВОЕ: Импорт страницы рейтингов ---
import RatingsPage from './RatingsPage';       

const sosStyle = {
  backgroundColor: '#ff4d4d',
  color: 'white',
  fontWeight: 'bold',
  animation: 'pulse 1s infinite'
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  
  // Определяем, является ли пользователь Администратором
  const isAdmin = user && user.role === 'ADMINISTRATOR';
  
  const location = useLocation();
  const navigate = useNavigate();

  // Состояние для SOS
  const [sosAlert, setSosAlert] = useState(false);
  const [sosList, setSosList] = useState([]);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws-taxi');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log('WS Connected (Global)');
        
        stompClient.subscribe('/topic/admin/sos', (message) => {
          const newSos = JSON.parse(message.body);
          console.log("SOS RECEIVED:", newSos);
          
          setSosList(prev => [newSos, ...prev]);

          // Если мы НЕ на странице новостей/оповещений - включаем тревогу
          if (location.pathname !== '/news') {
            setSosAlert(true);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });
    stompClient.activate();

    return () => stompClient.deactivate();
  }, [location.pathname]);

  // Сброс алерта при переходе на страницу новостей
  useEffect(() => {
    if (location.pathname === '/news') {
      setSosAlert(false);
    }
  }, [location.pathname]);

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
            {/* ПЕРЕДАЕМ СТИЛЬ ПРИ ТРЕВОГЕ */}
            <NavLink 
                to="/news"
                style={({ isActive }) => (sosAlert && !isActive ? sosStyle : {})}
            >
                Сповіщення {sosAlert && "(!)"}
            </NavLink> 

            {/* --- НОВОЕ: Кнопка Рейтинги --- */}
            <NavLink to="/ratings">Відгуки</NavLink>
            {/* ----------------------------- */}

            <NavLink to="/services">Дод. послуги</NavLink>
            <NavLink to="/tariffs">Тарифы</NavLink>
            <NavLink to="/dispatchers">Диспетчеры</NavLink>
            <NavLink to="/promos">Акції (Завдання)</NavLink>
            <NavLink to="/promocodes">Промокоди</NavLink>
            <NavLink to="/sectors">Сектори</NavLink>
            <NavLink to="/settings">Налаштування</NavLink>
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
              {/* ВАЖНО: Передаем sosList как пропс! */}
              <Route path="/news" element={<NewsPage sosList={sosList} setSosList={setSosList} />} />
              
              {/* --- НОВОЕ: Роут для страницы рейтингов --- */}
              <Route path="/ratings" element={<RatingsPage />} />
              {/* ---------------------------------------- */}

              <Route path="/services" element={<ServicesPage />} />
              <Route path="/tariffs" element={<TariffsPage />} />
              <Route path="/dispatchers" element={<DispatchersPage />} />
              <Route path="/promos" element={<PromosPage />} />
              <Route path="/promocodes" element={<PromoCodesPage />} />
              <Route path="/sectors" element={<SectorsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          ) : (
            <>
              {/* Защита роутов для обычного диспетчера */}
              <Route path="/news" element={<Navigate to="/" replace />} />
              <Route path="/ratings" element={<Navigate to="/" replace />} /> {/* Защита для ratings */}
              <Route path="/services" element={<Navigate to="/" replace />} />
              <Route path="/tariffs" element={<Navigate to="/" replace />} />
              <Route path="/dispatchers" element={<Navigate to="/" replace />} />
              <Route path="/promos" element={<Navigate to="/" replace />} />
              <Route path="/promocodes" element={<Navigate to="/" replace />} />
              <Route path="/sectors" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<Navigate to="/" replace />} />
            </>
          )}
          
          <Route path="*" element={<h2>Страница не найдена</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardLayout;
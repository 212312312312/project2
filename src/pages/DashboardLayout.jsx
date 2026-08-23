import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Імпортуємо ВСІ сторінки
import OrdersPage from './OrdersPage';
import DriversPage from './DriversPage'; 
import ClientsPage from './ClientsPage';
import AnalyticsPage from './AnalyticsPage';
import TariffsPage from './TariffsPage'; 
import DispatchersPage from './DispatchersPage';
import PromosPage from './PromosPage';         
import PromoCodesPage from './PromoCodesPage'; 
import NewsPage from './NewsPage';             
import ServicesPage from './Services';         
import SettingsPage from './SettingsPage';     
import SectorsPage from './SectorsPage';
import RatingsPage from './RatingsPage';
import CarRequestsPage from './CarRequestsPage';
import DriverRequestsPage from './DriverRequestsPage'; 
import ClientInfoPage from './ClientInfoPage';
import FinancePage from './FinancePage';
import PhotoControl from './PhotoControl';
import DriverPhotoUploadWebView from './DriverPhotoUploadWebView';
import SupportPage from './SupportPage'; // 👈 Додано сторінку підтримки

const sosStyle = {
  backgroundColor: '#ff4d4d',
  color: 'white',
  fontWeight: 'bold',
  animation: 'pulse 1s infinite'
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  
  // Визначаємо, чи є користувач Адміністратором
  const isAdmin = user && user.role === 'ADMINISTRATOR';
  
  const location = useLocation();
  const navigate = useNavigate();

  // Стан для SOS
  const [sosAlert, setSosAlert] = useState(false);
  const [sosList, setSosList] = useState([]);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/ws-taxi' 
      : 'https://api.unitua.com/ws-taxi';
    const socket = new SockJS(wsUrl);
    
    const token = localStorage.getItem('token');

    const stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('WS Connected (Global)');
        
        stompClient.subscribe('/topic/admin/sos', (message) => {
          const newSos = JSON.parse(message.body);
          console.log("SOS RECEIVED:", newSos);
          
          setSosList(prev => [newSos, ...prev]);

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

  // Скидання алерту при переході на сторінку новин
  useEffect(() => {
    if (location.pathname === '/news') {
      setSosAlert(false);
    }
  }, [location.pathname]);

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>Unit-App (Диспетчерська)</h1>
        <div className="user-info">
          <span>{user?.fullName} ({user?.role})</span>
          <button onClick={logout}>Вийти</button>
        </div>
      </header>
      
      <nav className="dashboard-nav">
        {/* Загальні вкладки для ADMIN та DISPATCHER */}
        <NavLink to="/" end>Замовлення</NavLink>
        <NavLink to="/support" style={{ color: '#0088cc', fontWeight: '500' }}>Підтримка</NavLink>
        <NavLink to="/drivers">Водії</NavLink>
        <NavLink to="/clients">Клієнти</NavLink>
        <NavLink to="/photo-control" style={{ color: '#e67e22', fontWeight: '500' }}>Фотоконтроль</NavLink>
        <NavLink to="/analytics" style={{ color: '#0288d1', fontWeight: '500' }}>Аналітика</NavLink>
        
        {/* Вкладки ТІЛЬКИ ДЛЯ АДМІНА */}
        {isAdmin && (
          <>
            <NavLink to="/car-requests" className="nav-item">Заявки авто</NavLink>

            <NavLink 
                to="/news"
                style={({ isActive }) => (sosAlert && !isActive ? sosStyle : {})}
            >
                Сповіщення {sosAlert && "(!)"}
            </NavLink> 
            
            <NavLink to="/driver-requests" className="nav-item">Заявки водіїв</NavLink>
            <NavLink to="/finance" style={{ color: '#2e7d32', fontWeight: '500' }}>Фінанси</NavLink>
            <NavLink to="/ratings">Відгуки</NavLink>
            <NavLink to="/services">Дод. послуги</NavLink>
            <NavLink to="/tariffs">Тарифи</NavLink>
            <NavLink to="/dispatchers">Диспетчери</NavLink>
            <NavLink to="/promos">Акції</NavLink>
            <NavLink to="/promocodes">Промокоди</NavLink>
            <NavLink to="/sectors">Сектори</NavLink>
            <NavLink to="/settings">Налаштування</NavLink>
          </>
        )}
      </nav>

      <main className="dashboard-content">
        <Routes>
          {/* Загальні роути */}
          <Route path="/" element={<OrdersPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/client-info" element={<ClientInfoPage />} />
          <Route path="/photo-control" element={<PhotoControl />} />
          
          {/* Публічний WebView роут для водія */}
          <Route path="/driver/photo-upload" element={<DriverPhotoUploadWebView />} />
          
          {/* Роути ТІЛЬКИ ДЛЯ АДМІНА */}
          {isAdmin ? (
            <>
              <Route path="/news" element={<NewsPage sosList={sosList} setSosList={setSosList} />} />
              <Route path="/ratings" element={<RatingsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/tariffs" element={<TariffsPage />} />
              <Route path="/dispatchers" element={<DispatchersPage />} />
              <Route path="/promos" element={<PromosPage />} />
              <Route path="/promocodes" element={<PromoCodesPage />} />
              <Route path="/sectors" element={<SectorsPage />} />
              <Route path="/driver-requests" element={<DriverRequestsPage />} />
              <Route path="/car-requests" element={<CarRequestsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          ) : (
            <>
              {/* Захист роутів для звичайного диспетчера */}
              <Route path="/news" element={<Navigate to="/" replace />} />
              <Route path="/ratings" element={<Navigate to="/" replace />} />
              <Route path="/services" element={<Navigate to="/" replace />} />
              <Route path="/tariffs" element={<Navigate to="/" replace />} />
              <Route path="/dispatchers" element={<Navigate to="/" replace />} />
              <Route path="/promos" element={<Navigate to="/" replace />} />
              <Route path="/promocodes" element={<Navigate to="/" replace />} />
              <Route path="/sectors" element={<Navigate to="/" replace />} />
              <Route path="/car-requests" element={<Navigate to="/" replace />} />
              <Route path="/driver-requests" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<Navigate to="/" replace />} />
            </>
          )}
          
          <Route path="*" element={<h2>Сторінка не знайдена</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardLayout;
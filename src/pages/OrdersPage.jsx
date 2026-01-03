import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ActiveOrders from '../components/ActiveOrders';
import ArchiveOrders from '../components/ArchiveOrders';
import '../assets/OrdersPage.css';

const OrdersPage = () => {
  const [viewMode, setViewMode] = useState('active'); // 'active' або 'archive'
  const { user } = useAuth();

  // --- ВИПРАВЛЕННЯ: ЗАХИСТ ВІД БІЛОГО ЕКРАНУ ---
  
  // 1. Якщо дані користувача ще не завантажились
  if (!user) {
    return <div style={{ padding: '20px' }}>Завантаження даних користувача...</div>;
  }

  // 2. Тепер безпечно перевіряємо роль
  const isAllowed = user.role === 'DISPATCHER' || user.role === 'ADMINISTRATOR';

  if (!isAllowed) {
    return <h2 style={{ padding: '20px', color: 'red' }}>Доступ заборонено: Ви не диспетчер</h2>;
  }
  // ---------------------------------------------

  return (
    <div className="orders-page-container">
      {/* Перемикач вкладок */}
      <div className="view-switcher">
        <button
          className={viewMode === 'active' ? 'active' : ''}
          onClick={() => setViewMode('active')}
        >
          Активні замовлення
        </button>
        <button
          className={viewMode === 'archive' ? 'active' : ''}
          onClick={() => setViewMode('archive')}
        >
          Архів замовлень
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="orders-content">
        {viewMode === 'active' ? (
           <ActiveOrders />
        ) : (
           <ArchiveOrders />
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ActiveOrders from '../components/ActiveOrders';
import ArchiveOrders from '../components/ArchiveOrders';
import '../assets/OrdersPage.css';

const OrdersPage = () => {
  const [viewMode, setViewMode] = useState('active');
  const { user } = useAuth();

  // --- ВИПРАВЛЕННЯ ТУТ ---
  // Перевіряємо, чи має користувач будь-яку з цих двох ролей
  const isAllowed = user.role === 'DISPATCHER' || user.role === 'ADMINISTRATOR';

  if (!isAllowed) {
    // Це повідомлення тепер не повинно з'являтися
    return <h2>Доступ заборонено</h2>;
  }
  // --- Кінець виправлення ---

  return (
    <div className="orders-page-container">
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

      <div style={{ display: viewMode === 'active' ? 'block' : 'none' }}>
        <ActiveOrders />
      </div>
      <div style={{ display: viewMode === 'archive' ? 'block' : 'none' }}>
        <ArchiveOrders />
      </div>

    </div>
  );
};

export default OrdersPage;
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActiveOrders from '../components/ActiveOrders';
import ArchiveOrders from '../components/ArchiveOrders';
import '../assets/OrdersPage.css';

const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(() =>
    searchParams.get('tab') === 'archive' ? 'archive' : 'active'
  );
  const { user } = useAuth();

  useEffect(() => {
    const tab = searchParams.get('tab');
    setViewMode(tab === 'archive' ? 'archive' : 'active');
  }, [searchParams]);

  const handleModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'archive') {
      setSearchParams({ tab: 'archive' });
    } else {
      setSearchParams({});
    }
  };

  // --- ВИПРАВЛЕННЯ: ЗАХИСТ ВІД БІЛОГО ЕКРАНУ ---
  if (!user) {
    return <div style={{ padding: '20px' }}>Завантаження даних користувача...</div>;
  }

  const isAllowed = user.role === 'DISPATCHER' || user.role === 'ADMINISTRATOR';

  if (!isAllowed) {
    return <h2 style={{ padding: '20px', color: 'red' }}>Доступ заборонено: Ви не диспетчер</h2>;
  }

  return (
    <div className="orders-page-container">
      {/* Перемикач вкладок */}
      <div className="view-switcher">
        <button
          className={viewMode === 'active' ? 'active' : ''}
          onClick={() => handleModeChange('active')}
        >
          Активні замовлення
        </button>
        <button
          className={viewMode === 'archive' ? 'active' : ''}
          onClick={() => handleModeChange('archive')}
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
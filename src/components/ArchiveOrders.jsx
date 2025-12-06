import React, { useState, useEffect, useCallback } from 'react';
import { getArchivedOrders, searchArchiveByPhone } from '../services/orderService';
// Мы используем стили из TableStyles.css, которые уже подключены

const ArchiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Функция для загрузки всего архива
  const fetchArchive = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getArchivedOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Загружаем архив при первом рендере
  useEffect(() => {
    fetchArchive();
  }, []); // [] = один раз при монтировании

  // 3. Обработчик поиска
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      fetchArchive(); // Если поиск пуст, загрузить весь архив
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await searchArchiveByPhone(searchTerm);
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
    return <div>Загрузка архива...</div>;
  }

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Архив Заказов ({orders.length})</h2>
        <form className="controls" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Поиск по телефону..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn-primary">Поиск</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Статус</th>
              <th>Клиент (Тел)</th>
              <th>Водитель (Тел)</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Создан</th>
              <th>Завершен</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>
                    <span style={{ color: order.status === 'CANCELLED' ? 'red' : 'green', fontWeight: 'bold' }}>
                      {order.status}
                    </span>
                  </td>
                  <td>{`${order.client.fullName} (${order.client.phoneNumber})`}</td>
                  <td>
                    {order.driver ? 
                      `${order.driver.fullName} (${order.driver.phoneNumber})` : 
                      'N/A'}
                  </td>
                  <td>{order.fromAddress}</td>
                  <td>{order.toAddress}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{new Date(order.completedAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">Заказы в архиве не найдены.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchiveOrders;
import React, { useState, useEffect } from 'react';
import { getArchivedOrders, searchArchiveByPhone } from '../services/orderService';
import '../assets/TableStyles.css';

const ArchiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    fetchArchive();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      fetchArchive();
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

  if (loading && orders.length === 0) return <div>Завантаження архіву...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Архів Замовлень ({orders.length})</h2>
        <form className="controls" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Пошук за телефоном..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn-primary">Пошук</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Статус</th>
              <th>Клієнт</th>
              <th>Водій</th>
              <th>Звідки</th>
              <th>Маршрут / Дод. точки</th> 
              <th>Куди</th>
              <th>Ціна</th>
              {/* === КОЛОНКА КОМЕНТАРЯ === */}
              <th>Коментар</th>
              <th>Оплата</th> 
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>
                    <span style={{ 
                      color: order.status === 'CANCELLED' ? 'red' : 'green', 
                      fontWeight: 'bold',
                      fontSize: '0.9em'
                    }}>
                      {order.status === 'CANCELLED' ? 'СКАСОВАНО' : 'ВИКОНАНО'}
                    </span>
                  </td>
                  <td>{order.client.phoneNumber}</td>
                  <td>{order.driver ? order.driver.fullName : '—'}</td>
                  
                  <td>{order.fromAddress}</td>
                  
                  <td style={{fontStyle: 'italic', color: '#555'}}>
                    {order.formattedWaypoints ? (
                        <span>{order.formattedWaypoints}</span>
                    ) : (
                        <span style={{color: '#ccc'}}>—</span>
                    )}
                  </td>
                  
                  <td>{order.toAddress}</td>
                  <td><strong>{order.price} ₴</strong></td>

                  {/* === ЯЧЕЙКА КОМЕНТАРЯ === */}
                  <td style={{ maxWidth: '150px', fontStyle: 'italic', color: '#666', fontSize: '0.9em' }}>
                     {order.comment ? order.comment : <span style={{color: '#ccc'}}>—</span>}
                  </td>
                  <td>
        {order.paymentMethod === 'CARD' ? (
          <span style={{color: 'blue'}}>💳 Картка</span>
        ) : (
          <span style={{color: 'green'}}>💵 Готівка</span>
        )}
      </td>
                  {/* ========================= */}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center'}}>Архів порожній</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchiveOrders;
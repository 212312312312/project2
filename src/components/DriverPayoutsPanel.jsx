import React, { useState, useEffect } from 'react';
import { payoutService } from '../services/payoutService';
import '../assets/DriverPayouts.css';

export const DriverPayoutsPanel = () => {
  const [subTab, setSubTab] = useState('PENDING'); // 'PENDING' или 'ARCHIVE'
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'PENDING') {
        const data = await payoutService.getPendingPayouts();
        setPayouts(data);
      } else {
        const data = await payoutService.getPaidArchive();
        setPayouts(data);
      }
    } catch (err) {
      console.error('Помилка завантаження виплат:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab]);

  const handleConfirm = async (payoutId) => {
    if (!window.confirm('Підтвердити, що гроші перераховані водію на карту?')) return;

    setActionLoadingId(payoutId);
    try {
      await payoutService.confirmPayout(payoutId);
      await loadData();
    } catch (err) {
      alert('Помилка при закритті боргу: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    const date = new Date(dtStr);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="payouts-container">
      <div className="payouts-subtabs">
        <button
          className={`payouts-subtab-btn ${subTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setSubTab('PENDING')}
        >
          Активні борги (до виплати)
        </button>
        <button
          className={`payouts-subtab-btn ${subTab === 'ARCHIVE' ? 'active' : ''}`}
          onClick={() => setSubTab('ARCHIVE')}
        >
          Архів виплат
        </button>
      </div>

      {loading ? (
        <div className="payouts-loading">Завантаження...</div>
      ) : payouts.length === 0 ? (
        <div className="payouts-empty">
          {subTab === 'PENDING' ? 'Немає активних боргів перед водіями' : 'Архів виплат порожній'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="payouts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Водій</th>
                <th>Телефон</th>
                <th>Замовлення</th>
                <th>Сума (грн)</th>
                <th>Причина / Коментар</th>
                <th>Дата створення</th>
                {subTab === 'PENDING' ? (
                  <th>Дія</th>
                ) : (
                  <>
                    <th>Дата виплати</th>
                    <th>Диспетчер</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {payouts.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td><strong>{item.driverName}</strong></td>
                  <td>
                    <a href={`tel:${item.driverPhone}`} className="phone-link">
                      {item.driverPhone || '—'}
                    </a>
                  </td>
                  <td>{item.orderId ? `#${item.orderId}` : '—'}</td>
                  <td className="amount-cell">
                    <strong>{item.amount.toFixed(2)} ₴</strong>
                  </td>
                  <td>{item.comment || '—'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  {subTab === 'PENDING' ? (
                    <td>
                      <button
                        className="btn-confirm-payout"
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleConfirm(item.id)}
                      >
                        {actionLoadingId === item.id ? 'Закриття...' : 'Закрити борг'}
                      </button>
                    </td>
                  ) : (
                    <>
                      <td>{formatDateTime(item.paidAt)}</td>
                      <td>{item.paidByDispatcher || '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllClients, blockClient, unblockClient } from '../services/clientService';

const ClientInfoPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = new URLSearchParams(location.search);
  const phone = params.get('phone');

  const loadClientData = async () => {
    if (!phone) {
      setError('Номер телефону не вказаний в URL');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const allClients = await getAllClients();
      const found = allClients.find(c => c.phoneNumber === phone);
      if (found) {
        setClient(found);
      } else {
        setError(`Клієнта з номером ${phone} не знайдено в базі даних`);
      }
    } catch (err) {
      setError(err.message || 'Помилка завантаження даних клієнта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [phone]);

  const handleToggleBlock = async () => {
    if (!client) return;
    const action = client.isBlocked ? unblockClient : blockClient;
    const actionName = client.isBlocked ? 'Розблокувати' : 'Заблокувати';

    if (window.confirm(`Ви впевнені, що хочете ${actionName.toLowerCase()} клієнта ${client.fullName}?`)) {
      try {
        setError('');
        const updated = await action(client.id);
        setClient(updated);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', fontSize: '18px', fontWeight: 'bold' }}>⏳ Завантаження профілю клієнта...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ color: 'red', backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '20px', fontWeight: 'bold' }}>
          ⚠️ {error}
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px' }}>Повернутись до замовлень</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>👤 Профіль клієнта: <span style={{ color: '#1976d2' }}>{client.fullName}</span></h2>
        <button 
          onClick={() => window.close()} 
          style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
        >
          Закрити вкладку ✕
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '16px' }}>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>ID в системі:</span>
            <span style={{ fontWeight: '600' }}>{client.id}</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Повне ім'я:</span>
            <span style={{ fontWeight: '600' }}>{client.fullName}</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Номер телефону:</span>
            <span style={{ fontWeight: '600', color: '#000' }}>{client.phoneNumber}</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Email:</span>
            <span style={{ fontWeight: '600', color: '#555' }}>{client.email || '—'}</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Кількість поїздок:</span>
            <span style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '18px' }}>{client.tripsCount ?? 0}</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Маска карти:</span>
            <span style={{ fontWeight: '600' }}>{client.cardMask ? `💳 ${client.cardMask}` : 'Не прив\'язана'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '200px', color: '#555' }}>Статус акаунту:</span>
            {client.isBlocked ? (
              <span style={{ color: 'red', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '4px 12px', borderRadius: '4px', border: '1px solid #ffcdd2' }}>⛔ ЗАБЛОКОВАНИЙ</span>
            ) : (
              <span style={{ color: 'green', fontWeight: 'bold', backgroundColor: '#e8f5e9', padding: '4px 12px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>🟢 Активний</span>
            )}
          </div>
        </div>

        <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleToggleBlock}
            className={client.isBlocked ? 'btn-primary' : 'btn-danger'}
            style={{ padding: '12px 30px', fontSize: '15px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
          >
            {client.isBlocked ? '🔓 Розблокувати клієнта' : '🔒 Заблокувати клієнта'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoPage;
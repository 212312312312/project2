import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllClients, 
  blockClient, 
  unblockClient 
} from '../services/clientService';
import '../assets/ClientsPage.css';

// --- МОДАЛЬНЕ ВІКНО ДЕТАЛЕЙ КЛІЄНТА ---
const ClientDetailsModal = ({ client, isOpen, onClose, onToggleBlock }) => {
  if (!isOpen || !client) return null;

  return (
    <div className="details-overlay">
      <header className="details-header">
        <div className="details-header-title">
          <span>Картка клієнта</span>
          <h2>{client.fullName}</h2>
        </div>
        <button className="btn btn-close" onClick={onClose}>Закрити ✕</button>
      </header>

      <div className="details-content">
        <div className="card profile-hero-card">
          <div className="avatar-section">
            <div className="avatar-large">
              {client.fullName ? client.fullName.charAt(0).toUpperCase() : '—'}
            </div>
            <span className={`badge ${client.isBlocked ? 'badge-danger' : 'badge-success'} avatar-status-badge`}>
              {client.isBlocked ? 'ЗАБЛОКОВАНИЙ' : 'АКТИВНИЙ'}
            </span>
          </div>

          <div className="profile-details-grid">
            <div className="detail-item">
              <span className="detail-label">ID клієнта</span>
              <span className="detail-value">{client.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">ПІБ</span>
              <span className="detail-value">{client.fullName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Номер телефону</span>
              <span className="detail-value">{client.phoneNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{client.email || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Виконаних поїздок</span>
              <span className="detail-value text-primary">{client.tripsCount ?? 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Статус акаунту</span>
              <span className="detail-value">
                {client.isBlocked ? (
                  <span className="text-danger font-medium">Заблокований</span>
                ) : (
                  <span className="text-success font-medium">Активний</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Управління доступом</h3>
          <div className="client-actions-box">
            <p className="text-subtle" style={{ margin: 0 }}>
              {client.isBlocked 
                ? 'Клієнт наразі заблокований і не може створювати нові замовлення.' 
                : 'Клієнт має повний доступ до створення замовлень у застосунку.'}
            </p>
            <button 
              className={`btn ${client.isBlocked ? 'btn-outline-success' : 'btn-outline-danger'}`}
              onClick={() => onToggleBlock(client)}
            >
              {client.isBlocked ? 'Розблокувати клієнта' : 'Заблокувати клієнта'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ОСНОВНИЙ КОМПОНЕНТ СТРАНИЦІ ---
const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [detailsClient, setDetailsClient] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllClients();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  /* АВТО-ОТКРЫТИЕ КАРТОЧКИ ПРИ ПЕРЕХОДЕ ПО openId ИЗ РЕЙТИНГОВ/ИНЫХ РАЗДЕЛОВ */
  useEffect(() => {
    if (clients.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get('openId');
      if (openId) {
        const targetClient = clients.find(c => c.id.toString() === openId.toString());
        if (targetClient) setDetailsClient(targetClient);
      }
    }
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter((client) =>
      client.phoneNumber.includes(term) ||
      (client.fullName && client.fullName.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  const updateClientState = (updatedClient) => {
    setClients(prevClients => 
      prevClients.map(c => c.id === updatedClient.id ? updatedClient : c)
    );
    if (detailsClient && detailsClient.id === updatedClient.id) {
      setDetailsClient(updatedClient);
    }
  };

  const handleToggleBlock = async (client) => {
    const action = client.isBlocked ? unblockClient : blockClient;
    const actionName = client.isBlocked ? 'розблокувати' : 'заблокувати';

    if (window.confirm(`Ви впевнені, що хочете ${actionName} клієнта ${client.fullName}?`)) {
      try {
        setError('');
        const updatedClient = await action(client.id);
        updateClientState(updatedClient);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleRowDoubleClick = (client) => {
    setDetailsClient(client);
  };

  if (loading) return <div className="loading-spinner">Завантаження клієнтів...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Клієнти</h1>
          <span className="count-badge">{filteredClients.length}</span>
        </div>
        
        <div className="header-actions">
          <input
            type="text"
            placeholder="Пошук (Телефон або ПІБ)..."
            className="input-field search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ПІБ</th>
                <th>Телефон</th>
                <th className="text-center">Статус</th>
                <th className="text-center">Кількість поїздок</th>
                <th className="text-center">Дії</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id}
                    onDoubleClick={() => handleRowDoubleClick(client)}
                    className="clickable-row"
                    title="Подвійний клік для деталей"
                  >
                    <td className="text-subtle">{client.id}</td>
                    <td className="font-medium">{client.fullName}</td>
                    <td>{client.phoneNumber}</td>
                    <td className="text-center">
                      {client.isBlocked ? (
                        <span className="badge badge-danger">Заблокований</span>
                      ) : (
                        <span className="badge badge-success">Активний</span>
                      )}
                    </td>
                    <td className="text-center font-medium">{client.tripsCount ?? 0}</td>
                    <td className="text-center">
                      <button 
                        className={`btn btn-sm ${client.isBlocked ? 'btn-outline-success' : 'btn-outline-danger'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBlock(client);
                        }}
                      >
                        {client.isBlocked ? 'Розблокувати' : 'Заблокувати'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-subtle py-8">Клієнти не знайдені</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientDetailsModal 
        client={detailsClient}
        isOpen={!!detailsClient}
        onClose={() => setDetailsClient(null)}
        onToggleBlock={handleToggleBlock}
      />
    </div>
  );
};

export default ClientsPage;
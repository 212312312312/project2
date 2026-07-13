import React, { useState, useEffect } from 'react';
import {
  getAllTariffs,
  createTariff,
  updateTariff,
  deleteTariff,
  reorderTariff,
  getMinDistance,    // 👈 ДОБАВЛЕНО
  updateMinDistance  // 👈 ДОБАВЛЕНО
} from '../services/tariffService';

import Modal from '../components/Modal';
import TariffForm from '../components/TariffForm';

const TariffsPage = () => {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [minDistance, setMinDistance] = useState(3.0); // 👈 ДОБАВЛЕНО: Стейт значения километража
  const [isSavingDistance, setIsSavingDistance] = useState(false); // 👈 ДОБАВЛЕНО: Стейт загрузки сохранения

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllTariffs();
      setTariffs(data);
      
      // 🔥 ДОБАВЛЕНО: Автоматически загружаем километраж минималки с бэкенда Unit при старте страницы
      const distData = await getMinDistance();
      setMinDistance(distData.minDistance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleAddClick = () => {
    setEditingTariff(null);
    setIsModalOpen(true);
  };

  const handleReorder = async (id, direction) => {
    try {
      const updatedTariffs = await reorderTariff(id, direction);
      setTariffs(updatedTariffs); 
    } catch (error) {
      console.error("Помилка изменения порядка тарифов:", error);
      alert("Не удалось изменить порядок тарифа");
    }
  };

  const handleEditClick = (tariff) => {
    setEditingTariff(tariff);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTariff(null);
  };

  const handleFormSubmit = async (formData, file) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingTariff) {
        await updateTariff(editingTariff.id, formData, file);
      } else {
        await createTariff(formData, file);
      }
      handleModalClose();
      fetchTariffs(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (tariffId) => {
    if (window.confirm('Are you sure? This will delete the tariff and its image.')) {
      try {
        await deleteTariff(tariffId);
        fetchTariffs(); 
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // 🔥 ДОБАВЛЕНО: Обработчик сохранения глобального километража
  const handleSaveMinDistance = async () => {
    setIsSavingDistance(true);
    try {
      await updateMinDistance(minDistance);
      alert('Мінімальний кілометраж успішно оновлено для всіх тарифів!');
      fetchTariffs(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingDistance(false);
    }
  };

  if (loading) return <div>Loading tariffs...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Tariff Settings ({tariffs.length})</h2>
        <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* 🔥 ДОБАВЛЕНО: Минималистичный и аккуратный блок настройки километража минималки Unit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#232329', padding: '6px 12px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Минималка (КМ):</span>
            <input 
              type="number" 
              step="0.1" 
              min="0"
              value={minDistance} 
              onChange={(e) => setMinDistance(parseFloat(e.target.value) || 0)}
              style={{ width: '65px', padding: '6px', borderRadius: '6px', border: '1px solid #52525b', background: '#18181b', color: '#fff', textAlign: 'center', fontWeight: 'bold' }}
            />
            <button 
              className="btn-primary" 
              onClick={handleSaveMinDistance} 
              disabled={isSavingDistance}
              style={{ padding: '6px 12px', fontSize: '13px', background: '#008080', border: 'none', cursor: 'pointer' }}
            >
              {isSavingDistance ? '...' : 'Сохранить'}
            </button>
          </div>

          <button className="btn-primary" onClick={handleAddClick}>
            + Create Tariff
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Icon</th>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Base Price</th>
              <th>Price/km</th>
              <th>Out City $/km</th>
              <th>Waypoint $</th>
              <th>Free Wait (min)</th>
              <th>Wait Price/min</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.length > 0 ? (
              tariffs.map((tariff) => (
                <tr 
                  key={tariff.id} 
                  style={{ opacity: tariff.isUnavailable ? 0.4 : 1, background: tariff.isUnavailable ? '#f5f5f5' : 'transparent' }}
                >
                  <td>
                    {tariff.imageUrl ? (
                      <img 
                        src={tariff.imageUrl} 
                        alt={tariff.name} 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>{tariff.id}</td>
                  <td>
                    <strong>{tariff.name}</strong>
                    {tariff.isBeta && (
                      <span style={{ 
                        marginLeft: '8px', fontSize: '10px', background: '#d32f2f', 
                        color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' 
                      }}>
                        BETA
                      </span>
                    )}
                    {tariff.isUnavailable && (
                      <div style={{ fontSize: '10px', color: '#757575', marginTop: '2px' }}>
                        UNAVAILABLE
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={tariff.isActive ? 'status-online' : 'status-offline'}>
                      {tariff.isActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </td>
                  <td>{tariff.basePrice.toFixed(2)}</td>
                  <td>{tariff.pricePerKm.toFixed(2)}</td>
                  <td style={{ color: '#e65100', fontWeight: 'bold' }}>
                      {tariff.pricePerKmOutCity ? tariff.pricePerKmOutCity.toFixed(2) : '-'}
                  </td>
                  <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {tariff.extraWaypointPrice ? tariff.extraWaypointPrice.toFixed(2) : '0.00'}
                  </td>
                  <td>{tariff.freeWaitingMinutes} min</td>
                  <td>{tariff.pricePerWaitingMinute.toFixed(2)}</td>
                  <td>
                    {/* КНОПКИ СОРТИРОВКИ ПОРЯДКА */}
                    <div className="reorder-actions" style={{ display: 'inline-flex', gap: '4px', marginRight: '8px' }}>
                      <button 
                        onClick={() => handleReorder(tariff.id, 'UP')}
                        className="btn-reorder-up"
                        title="Перемістити вгору"
                        style={{ padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => handleReorder(tariff.id, 'DOWN')}
                        className="btn-reorder-down"
                        title="Перемістити вниз"
                        style={{ padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ↓
                      </button>
                    </div>

                    {/* КНОПКИ УПРАВЛЕНИЯ ТАРИФОМ */}
                    <button className="btn-secondary" onClick={() => handleEditClick(tariff)} style={{ marginRight: '4px' }}>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDeleteClick(tariff.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11">No tariffs found. Create the first one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingTariff ? 'Edit Tariff' : 'Create New Tariff'}
      >
        <TariffForm
          initialData={editingTariff}
          onSubmit={handleFormSubmit}
          onCancel={handleModalClose}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default TariffsPage;
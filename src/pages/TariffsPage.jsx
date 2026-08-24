import React, { useState, useEffect } from 'react';
import {
  getAllTariffs,
  createTariff,
  updateTariff,
  deleteTariff,
  reorderTariff,
  getMinDistance,
  updateMinDistance
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
  
  const [minDistance, setMinDistance] = useState(3.0);
  const [isSavingDistance, setIsSavingDistance] = useState(false);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllTariffs();
      setTariffs(data);
      
      const distData = await getMinDistance();
      if (distData && distData.minDistance !== undefined) {
        setMinDistance(distData.minDistance);
      }
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
      console.error("Помилка зміни порядку тарифів:", error);
      alert("Не вдалося змінити порядок тарифу");
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
    if (window.confirm('Ви впевнені, що хочете видалити цей тариф?')) {
      try {
        await deleteTariff(tariffId);
        fetchTariffs(); 
      } catch (err) {
        setError(err.message);
      }
    }
  };

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

  if (loading) return <div className="loading-spinner">Завантаження тарифів...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Тарифи</h1>
          <span className="count-badge">{tariffs.length}</span>
        </div>

        <div className="header-actions">
          {/* Блок налаштування мінімалки */}
          <div className="toggle-group" style={{ padding: '4px 8px', gap: '8px', alignItems: 'center' }}>
            <span className="text-subtle font-medium" style={{ fontSize: '0.85rem' }}>Мінімалка (км):</span>
            <input 
              type="number" 
              step="0.1" 
              min="0"
              className="input-field"
              value={minDistance} 
              onChange={(e) => setMinDistance(parseFloat(e.target.value) || 0)}
              style={{ width: '70px', padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}
            />
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={handleSaveMinDistance} 
              disabled={isSavingDistance}
            >
              {isSavingDistance ? '...' : 'Зберегти'}
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleAddClick}>
            + Створити тариф
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '70px' }}>Іконка</th>
                <th className="text-center" style={{ width: '50px' }}>ID</th>
                <th>Назва</th>
                <th className="text-center">Статус</th>
                <th className="text-center">База (₴)</th>
                <th className="text-center">1 км (Місто)</th>
                <th className="text-center">1 км (За місто)</th>
                <th className="text-center">Точка (₴)</th>
                <th className="text-center">Очікування</th>
                <th className="text-center">Очік. (₴/хв)</th>
                <th className="text-center" style={{ width: '210px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.length > 0 ? (
                tariffs.map((tariff) => (
                  <tr 
                    key={tariff.id} 
                    style={{ opacity: tariff.isUnavailable ? 0.5 : 1 }}
                  >
                    <td className="text-center">
                      {tariff.imageUrl ? (
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: 'rgba(0,0,0,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          padding: '2px'
                        }}>
                          <img 
                            src={tariff.imageUrl} 
                            alt={tariff.name} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="text-center text-subtle">#{tariff.id}</td>
                    
                    <td>
                      <strong className="font-medium">{tariff.name}</strong>
                      {tariff.bodyType && (
                        <span 
                          className="badge" 
                          style={{ 
                            padding: '0.15rem 0.4rem', 
                            fontSize: '0.7rem', 
                            marginLeft: '6px', 
                            backgroundColor: '#8b5cf6', 
                            color: '#fff',
                            borderRadius: '4px'
                          }}
                        >
                          {tariff.bodyType === 'UNIVERSAL' ? 'Універсал' : tariff.bodyType === 'MINIBUS' ? 'Мікроавтобус' : tariff.bodyType}
                        </span>
                      )}
                      {tariff.evosTariffName && (
                        <span 
                          className="badge" 
                          style={{ 
                            padding: '0.15rem 0.4rem', 
                            fontSize: '0.7rem', 
                            marginLeft: '6px', 
                            backgroundColor: '#2563eb', 
                            color: '#fff',
                            borderRadius: '4px'
                          }}
                        >
                          EvoS: {tariff.evosTariffName}
                        </span>
                      )}
                      {tariff.isBeta && (
                        <span className="badge badge-danger ml-2" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', marginLeft: '6px' }}>
                          BETA
                        </span>
                      )}
                      {tariff.isUnavailable && (
                        <div className="text-subtle text-xs" style={{ fontSize: '0.75rem' }}>
                          Недоступний
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${tariff.isActive ? 'badge-success' : 'badge-muted'}`}>
                        {tariff.isActive ? 'АКТИВНИЙ' : 'ВИМКНЕНО'}
                      </span>
                    </td>
                    <td className="text-center font-medium">{tariff.basePrice.toFixed(2)} ₴</td>
                    <td className="text-center font-medium">{tariff.pricePerKm.toFixed(2)} ₴</td>
                    <td className="text-center font-medium text-warning">
                      {tariff.pricePerKmOutCity ? `${tariff.pricePerKmOutCity.toFixed(2)} ₴` : '—'}
                    </td>
                    <td className="text-center font-medium text-success">
                      {tariff.extraWaypointPrice ? `${tariff.extraWaypointPrice.toFixed(2)} ₴` : '0.00 ₴'}
                    </td>
                    <td className="text-center text-subtle">{tariff.freeWaitingMinutes} хв</td>
                    <td className="text-center font-medium">{tariff.pricePerWaitingMinute.toFixed(2)} ₴</td>
                    <td className="text-center">
                      <div className="btn-group justify-center">
                        <div className="btn-group" style={{ gap: '2px' }}>
                          <button 
                            onClick={() => handleReorder(tariff.id, 'UP')}
                            className="btn btn-sm btn-outline"
                            title="Перемістити вгору"
                            style={{ padding: '0.2rem 0.4rem' }}
                          >
                            ↑
                          </button>
                          <button 
                            onClick={() => handleReorder(tariff.id, 'DOWN')}
                            className="btn btn-sm btn-outline"
                            title="Перемістити вниз"
                            style={{ padding: '0.2rem 0.4rem' }}
                          >
                            ↓
                          </button>
                        </div>

                        <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(tariff)}>
                          Ред.
                        </button>
                        <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDeleteClick(tariff.id)}>
                          Вид.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center text-subtle py-8">
                    Тарифи не знайдені. Створіть перший тариф.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingTariff ? 'Редагувати тариф' : 'Створити новий тариф'}
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
import React, { useState, useEffect } from 'react';
import {
  getAllTariffs,
  createTariff,
  updateTariff,
  deleteTariff
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

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllTariffs();
      setTariffs(data);
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

  if (loading) return <div>Loading tariffs...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Tariff Settings ({tariffs.length})</h2>
        <div className="controls">
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
              {/* --- НОВА КОЛОНКА --- */}
              <th>Waypoint $</th>
              {/* -------------------- */}
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
                  {/* --- НОВЕ ДАНІ ДЛЯ КОЛОНКИ --- */}
                  <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {tariff.extraWaypointPrice ? tariff.extraWaypointPrice.toFixed(2) : '0.00'}
                  </td>
                  {/* ----------------------------- */}
                  <td>{tariff.freeWaitingMinutes} min</td>
                  <td>{tariff.pricePerWaitingMinute.toFixed(2)}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleEditClick(tariff)}>
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
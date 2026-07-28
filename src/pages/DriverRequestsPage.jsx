import React, { useState, useEffect } from 'react';
import { getPendingDrivers, approveDriverRegistration, rejectDriverRegistration } from '../services/driverService';
import Modal from '../components/Modal';
import '../assets/DriverRequestsPage.css';

// Блок фотографій з миттєвим відкриттям у новій вкладці (0 мс затримки)
const PhotoBlock = ({ label, url }) => {
  if (!url) {
    return (
      <div className="photo-card">
        <div className="photo-card-label">{label}</div>
        <div className="photo-card-placeholder">Відсутнє</div>
      </div>
    );
  }

  return (
    <div className="photo-card">
      <div className="photo-card-label">{label}</div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="photo-card-link">
        <img src={url} alt={label} className="photo-card-img" />
      </a>
    </div>
  );
};

const DriverRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Модалка відмови
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const driversData = await getPendingDrivers();
      setRequests(driversData);
    } catch (err) {
      setError(err.message || 'Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Пряме схвалення (автоматичний розрахунок тарифів бекендом за класифікатором)
  const handleApproveDirectly = async (driverId, driverName) => {
    if (!window.confirm(`Підтвердити реєстрацію водія ${driverName}? Тарифи будуть призначені автоматично за класифікатором.`)) {
      return;
    }

    try {
      await approveDriverRegistration(driverId);
      alert("Водія успішно активовано!");
      setRequests(prev => prev.filter(r => r.id !== driverId));
    } catch (err) {
      alert(err.message || "Помилка при активації водія");
    }
  };

  // Логіка відмови
  const openRejectModal = (id) => {
    setSelectedDriverId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason) return alert("Вкажіть причину відмови");

    try {
      await rejectDriverRegistration(selectedDriverId, rejectReason);
      alert("Заявку відхилено.");
      setRequests(prev => prev.filter(r => r.id !== selectedDriverId));
      setRejectModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-spinner">Завантаження заявок...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Заявки на реєстрацію</h1>
          <span className="count-badge">{requests.length}</span>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          Оновити
        </button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {requests.length === 0 ? (
        <div className="empty-state-card">
          <h3>Нових заявок немає</h3>
          <p className="text-subtle">Усі нові заявки водіїв уже опрацьовані.</p>
        </div>
      ) : (
        <div className="request-card-list">
          {requests.map(driver => (
            <div key={driver.id} className="request-card">
              
              {/* ХЕДЕР КАРТКИ */}
              <div className="request-card-header">
                <div className="driver-main-info">
                  <h3 className="driver-name">{driver.fullName}</h3>
                  <div className="driver-meta">
                    <span style={{ fontWeight: '700', color: '#14B8A6' }}>📍 {driver.city || 'Київ'}</span>
                    <span className="meta-divider">•</span>
                    <span>Тел: {driver.phoneNumber}</span>
                    <span className="meta-divider">•</span>
                    <span>ID: #{driver.id}</span>
                  </div>
                </div>
                <div className="btn-group">
                  <button 
                    className="btn btn-sm btn-outline-danger" 
                    onClick={() => openRejectModal(driver.id)}
                  >
                    Відхилити
                  </button>
                  <button 
                    className="btn btn-sm btn-success" 
                    onClick={() => handleApproveDirectly(driver.id, driver.fullName)}
                  >
                    ✅ Схвалити заявку
                  </button>
                </div>
              </div>

              {/* ТІЛО КАРТКИ */}
              <div className="request-card-body">
                
                {/* ОСОБИСТІ ДАНІ */}
                <div className="request-section">
                  <h4 className="section-title">Персональні дані водія</h4>
                  <div className="photos-grid mb-3">
                    <PhotoBlock label="Селфі" url={driver.photoUrl} />
                    <PhotoBlock label="Права (Лице)" url={driver.driverLicenseFront} />
                    <PhotoBlock label="Права (Тил)" url={driver.driverLicenseBack} />
                  </div>
                  <div className="details-inline-grid">
                    <div className="detail-compact-item">
                      <span className="detail-compact-label">Місто роботи</span>
                      <span className="detail-compact-value">{driver.city || 'Київ'}</span>
                    </div>
                    <div className="detail-compact-item">
                      <span className="detail-compact-label">РНОКПП</span>
                      <span className="detail-compact-value">{driver.rnokpp || '—'}</span>
                    </div>
                    <div className="detail-compact-item">
                      <span className="detail-compact-label">№ Посвідчення</span>
                      <span className="detail-compact-value">{driver.driverLicense || '—'}</span>
                    </div>
                    <div className="detail-compact-item">
                      <span className="detail-compact-label">Email</span>
                      <span className="detail-compact-value">{driver.email || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* АВТОМОБІЛЬ */}
                {driver.car ? (
                  <div className="request-section">
                    <div className="car-header-row">
                      <h4 className="section-title">
                        Автомобіль: {driver.car.make} {driver.car.model} ({driver.car.year})
                      </h4>
                      <div className="car-meta-pills">
                        <span className="plate-badge">{driver.car.plateNumber}</span>
                        <span className="text-subtle text-sm">Колір: {driver.car.color}</span>
                        {driver.car.carType && (
                          <span className="text-subtle text-sm">• Кузов: {driver.car.carType}</span>
                        )}
                      </div>
                    </div>

                    <h5 className="docs-subtitle">Документи авто</h5>
                    <div className="photos-grid mb-3">
                      <PhotoBlock label="ТП (Лице)" url={driver.car.techPassportFront} />
                      <PhotoBlock label="ТП (Тил)" url={driver.car.techPassportBack} />
                      <PhotoBlock label="Страховка" url={driver.car.insurancePhoto} />
                    </div>

                    <h5 className="docs-subtitle">Фотографії авто</h5>
                    <div className="photos-grid">
                      <PhotoBlock label="Перед" url={driver.car.photoFront} />
                      <PhotoBlock label="Зад" url={driver.car.photoBack} />
                      <PhotoBlock label="Ліво" url={driver.car.photoLeft} />
                      <PhotoBlock label="Право" url={driver.car.photoRight} />
                      <PhotoBlock label="Салон (Пер)" url={driver.car.photoSeatsFront} />
                      <PhotoBlock label="Салон (Зад)" url={driver.car.photoSeatsBack} />
                    </div>
                  </div>
                ) : (
                  <div className="request-section text-subtle italic-text">
                    Автомобіль не вказано
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛКА ВІДМОВИ */}
      <Modal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)} 
        title="Відхилення заявки"
      >
        <form onSubmit={handleRejectSubmit} className="modal-inner-form">
          <div className="input-group-field mb-3">
            <label className="field-label">Причина відмови</label>
            <textarea
              rows="4"
              className="input-field textarea-field"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Наприклад: Нечитабельні фото техпаспорта або посвідчення водія..."
              required
            />
          </div>
          <div className="form-actions-row">
            <button type="button" className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-outline-danger">
              Відхилити
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DriverRequestsPage;
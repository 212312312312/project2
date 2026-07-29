import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllDrivers, 
  getPendingDeletionDrivers,
  createDriver, 
  updateDriver, 
  deleteDriver,
  blockDriverPermanently,
  blockDriverTemporarily,
  unblockDriver,
  changeDriverActivity,
  getDriverTransactions,
  manualBalanceUpdate
} from '../services/driverService';
import { getAllTariffs } from '../services/tariffService';
import '../assets/DriversPage.css';
import { photoControlService } from '../services/photoControlService';
import Modal from '../components/Modal';
import DriverForm from '../components/DriverForm';

// --- ХЕЛПЕР СТАТУСА АКТИВНОСТИ ---
const getActivityBadge = (score) => {
  const s = score !== undefined && score !== null ? score : 1000;
  if (s >= 701) return { className: 'badge-success', label: 'Високий' };
  if (s >= 401) return { className: 'badge-warning', label: 'Середній' };
  if (s >= 1) return { className: 'badge-danger', label: 'Низький' };
  return { className: 'badge-muted', label: 'Заблоковано' };
};

// --- КОМПОНЕНТ ФИНАНСОВ ---
const WalletEditor = ({ driverId, currentBalance, onUpdate }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('ALL');

  const loadHistory = async () => {
    try {
      const data = await getDriverTransactions(driverId);
      setHistory(data || []);
    } catch (e) {
      console.error("Не вдалося завантажити історію", e);
    }
  };

  useEffect(() => {
    if (driverId) loadHistory();
  }, [driverId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return alert("Вкажіть суму та коментар");

    setLoading(true);
    try {
      const updatedDriver = await manualBalanceUpdate(driverId, parseFloat(amount), description);
      onUpdate(updatedDriver);
      setAmount('');
      setDescription('');
      loadHistory();
    } catch (err) {
      alert(err.message || 'Помилка оновлення');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(tx => {
    if (filter === 'INCOME') return tx.amount > 0;
    if (filter === 'EXPENSE') return tx.amount < 0;
    return true;
  });

  return (
    <div className="wallet-container">
      <div className="wallet-grid">
        <div className="wallet-form-box">
          <span className="wallet-label">Поточний баланс</span>
          <div className={`wallet-amount ${(currentBalance || 0) < 0 ? 'text-danger' : 'text-success'}`}>
            {(currentBalance || 0).toFixed(2)} ₴
          </div>

          <form onSubmit={handleSubmit} className="form-group-compact">
            <label className="form-label">Ручне коригування</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="Сума (+100 або -50)" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              required
              className="input-field"
            />
            <input 
              type="text" 
              placeholder="Коментар..." 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              required
              className="input-field"
            />
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Обробка...' : 'Застосувати'}
            </button>
          </form>
        </div>

        <div className="wallet-history-box">
          <div className="history-filter-header">
            <span className="filter-title">Історія транзакцій</span>
            <div className="filter-buttons">
              <button 
                type="button" 
                className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilter('ALL')}
              >
                Всі
              </button>
              <button 
                type="button" 
                className={`filter-btn ${filter === 'INCOME' ? 'active' : ''}`}
                onClick={() => setFilter('INCOME')}
              >
                + Поповнення
              </button>
              <button 
                type="button" 
                className={`filter-btn ${filter === 'EXPENSE' ? 'active' : ''}`}
                onClick={() => setFilter('EXPENSE')}
              >
                - Списання
              </button>
            </div>
          </div>

          <div className="tx-list">
            {filteredHistory.length > 0 ? (
              filteredHistory.map(tx => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-row-top">
                    <div className="tx-meta">
                      <span className="tx-date">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                      <span className="tx-type-tag">{tx.operationType}</span>
                    </div>
                    <span className={`tx-amount ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                      {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} ₴
                    </span>
                  </div>
                  <div className="tx-description">{tx.description}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-subtle py-4">Транзакції відсутні</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const handleRequestPhotoControl = async (driverId) => {
  if (window.confirm('Запросити фотоконтроль у цього водія? (Буде надано 1 годину)')) {
    try {
      await photoControlService.requestPhotoControl(driverId);
      alert('Запит на фотоконтроль успішно надіслано водію!');
    } catch (err) {
      alert('Помилка при надсиланні запиту на фотоконтроль');
    }
  }
};

// --- КОМПОНЕНТ КОРРЕКТИРОВКИ БАЛЛОВ ---
const ActivityEditor = ({ driverId, currentScore, onUpdate }) => {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!points || !reason) return alert("Вкажіть бали та причину");

    setLoading(true);
    try {
      const updatedDriver = await changeDriverActivity(driverId, parseInt(points), reason);
      onUpdate(updatedDriver);
      setPoints('');
      setReason('');
    } catch (err) {
      alert(err.message || 'Помилка оновлення');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activity-embedded-editor">
      <span className="embedded-editor-title">Ручне коригування балів</span>
      <form onSubmit={handleSubmit} className="form-inline-compact">
        <input 
          type="number" 
          placeholder="Бали (+/-)" 
          value={points} 
          onChange={e => setPoints(e.target.value)}
          required
          className="input-field input-narrow"
        />
        <input 
          type="text" 
          placeholder="Причина (напр. Скарга клієнта)" 
          value={reason} 
          onChange={e => setReason(e.target.value)}
          required
          className="input-field input-wide"
        />
        <button type="submit" disabled={loading} className="btn btn-secondary btn-sm">
          {loading ? '...' : 'Зберегти'}
        </button>
      </form>
    </div>
  );
};

// --- БЛОК ФОТОГРАФИИ ---
const PhotoBlock = ({ label, url }) => (
  <div className="photo-card">
    <div className="photo-card-label">{label}</div>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="photo-card-link">
        <img src={url} alt={label} className="photo-card-img" />
      </a>
    ) : (
      <div className="photo-card-placeholder">Відсутнє</div>
    )}
  </div>
);

// --- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ВОДИТЕЛЯ ---
const DriverDetailsModal = ({ 
  driver, 
  isOpen, 
  onClose, 
  onDriverUpdated,
  onEditClick,
  onDeleteClick,
  onBlockTemp,
  onBlockPerm,
  onUnblock
}) => {
  const [isCarsExpanded, setIsCarsExpanded] = useState(false);
  const [isWalletExpanded, setIsWalletExpanded] = useState(false);

  if (!isOpen || !driver) return null;

  const actInfo = getActivityBadge(driver.activityScore);
  const carsList = driver.cars || (driver.car ? [driver.car] : []);

  return (
    <div className="details-overlay">
      <header className="details-header">
        <div className="details-header-title">
          <span>Картка водія</span>
          <h2>{driver.fullName}</h2>
        </div>
        <button className="btn btn-close" onClick={onClose}>Закрити ✕</button>
      </header>

      <div className="details-content">
        
        {/* 1. ГЛАВНЫЙ ПРОФИЛЬ */}
        <div className="card profile-hero-card">
          <div className="avatar-section">
            {driver.photoUrl ? (
              <img src={driver.photoUrl} alt="Avatar" className="avatar-large" />
            ) : (
              <div className="avatar-large avatar-placeholder">—</div>
            )}
            <span className={`badge ${driver.isOnline ? 'badge-success' : 'badge-muted'} avatar-status-badge`}>
              {driver.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="profile-details-grid">
            <div className="detail-item">
              <span className="detail-label">ID у системі</span>
              <span className="detail-value">{driver.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Номер телефону</span>
              <span className="detail-value">{driver.phoneNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{driver.email || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">РНОКПП</span>
              <span className="detail-value">{driver.rnokpp || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Посвідчення водія</span>
              <span className="detail-value">{driver.driverLicense || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Автомобіль</span>
              <span className="detail-value">
                {driver.car ? `${driver.car.make} ${driver.car.model} (${driver.car.plateNumber || 'без №'})` : '—'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Статус блокування</span>
              <span className="detail-value">
                {driver.isBlocked ? (
                  <span className="text-danger font-medium">Заблоковано</span>
                ) : driver.tempBlockExpiresAt ? (
                  <span className="text-warning font-medium">
                    Тимчасово до {new Date(driver.tempBlockExpiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                ) : (
                  <span className="text-success font-medium">Активний</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ И ДЕЙСТВИЙ (ДОБАВЛЕНО В КАРТОЧКУ ВОДИТЕЛЯ) */}
        <div className="card driver-actions-card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Управління та Дії</h3>
          <div className="driver-modal-actions-bar">
            <button className="btn btn-primary" onClick={(e) => { onClose(); onEditClick(driver, e); }}>
              ✏️ Редагувати
            </button>
            <button className="btn btn-warning" onClick={() => handleRequestPhotoControl(driver.id)}>
              📷 Фотоконтроль
            </button>
            <button className="btn btn-danger" onClick={(e) => { onDeleteClick(driver.id, e); onClose(); }}>
              🗑️ Видалити
            </button>
            
            <div className="modal-block-group">
              <button className="btn btn-outline" onClick={(e) => onBlockTemp(driver.id, e)}>
                Тимчасове блокування (Т)
              </button>
              <button className="btn btn-outline-danger" onClick={(e) => onBlockPerm(driver.id, e)}>
                Заблокувати назавжди (П)
              </button>
              <button className="btn btn-outline-success" onClick={(e) => onUnblock(driver.id, e)}>
                Розблокувати (Р)
              </button>
            </div>
          </div>
        </div>

        {/* 2. РЕЙТИНГ И АКТИВНОСТЬ */}
        <div className="grid-2col">
          <div className="card metric-card">
            <span className="card-subtitle">Рейтинг водія</span>
            <div className="metric-primary">{driver.rating ? driver.rating.toFixed(2) : "5.00"} ★</div>
            <div className="metric-secondary">На основі {driver.ratingCount || 0} оцінок</div>
          </div>

          <div className="card metric-card">
            <span className="card-subtitle">Рівень активності</span>
            <div className="metric-inline">
              <span className="metric-primary">{driver.activityScore !== undefined ? driver.activityScore : 1000} <span className="metric-max">/ 1000</span></span>
              <span className={`badge ${actInfo.className}`}>{actInfo.label}</span>
            </div>
            <div className="progress-bar mb-3">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.max(0, Math.min((driver.activityScore || 1000) / 10, 100))}%` }}
              ></div>
            </div>

            <ActivityEditor driverId={driver.id} currentScore={driver.activityScore} onUpdate={onDriverUpdated} />
          </div>
        </div>

        {/* 3. ТАРИФЫ И ОСОБЛИВОСТІ */}
        <div className="grid-2col-equal">
          <div className="card static-panel">
            <h3 className="card-title">Дозволені тарифи</h3>
            <ul className="bullet-list">
              {driver.allowedTariffs && driver.allowedTariffs.length > 0 ? (
                driver.allowedTariffs.map(t => (
                  <li key={t.id} className="bullet-item">
                    <span className="bullet-dot dot-primary"></span>
                    <span className="bullet-text">{t.name}</span>
                  </li>
                ))
              ) : (
                <li className="bullet-item text-subtle">Немає призначених тарифів</li>
              )}
            </ul>
          </div>

          <div className="card static-panel">
            <h3 className="card-title">Медичні особливості та порушення</h3>
            <ul className="bullet-list">
              {(!driver.hasMovementIssue && !driver.hasHearingIssue && !driver.isDeaf && !driver.hasSpeechIssue) ? (
                <li className="bullet-item">
                  <span className="bullet-dot dot-success"></span>
                  <span className="bullet-text text-subtle">Здоровий (Особливості відсутні)</span>
                </li>
              ) : (
                <>
                  {driver.hasMovementIssue && (
                    <li className="bullet-item">
                      <span className="bullet-dot dot-danger"></span>
                      <span className="bullet-text font-medium">Порушення опорно-рухового апарату</span>
                    </li>
                  )}
                  {driver.hasHearingIssue && (
                    <li className="bullet-item">
                      <span className="bullet-dot dot-warning"></span>
                      <span className="bullet-text font-medium">Порушення слуху</span>
                    </li>
                  )}
                  {driver.isDeaf && (
                    <li className="bullet-item">
                      <span className="bullet-dot dot-danger"></span>
                      <span className="bullet-text font-medium">Глухонімий</span>
                    </li>
                  )}
                  {driver.hasSpeechIssue && (
                    <li className="bullet-item">
                      <span className="bullet-dot dot-info"></span>
                      <span className="bullet-text font-medium">Порушення мовлення</span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>

        {/* 4. ГАМАНЕЦЬ И ТРАНЗАКЦИИ */}
        <div className="card collapsible-card">
          <div className="card-title-collapsible" onClick={() => setIsWalletExpanded(!isWalletExpanded)}>
            <h3 className="card-title" style={{ margin: 0 }}>Гаманець та транзакції</h3>
            <span className="collapse-icon">{isWalletExpanded ? '▲' : '▼'}</span>
          </div>

          {isWalletExpanded && (
            <div className="collapsible-content">
              <WalletEditor driverId={driver.id} currentBalance={driver.balance} onUpdate={onDriverUpdated} />
            </div>
          )}
        </div>

        {/* 5. ПРИЗНАЧЕНИЙ АВТОПАРК */}
        <div className="card collapsible-card">
          <div className="card-title-collapsible" onClick={() => setIsCarsExpanded(!isCarsExpanded)}>
            <h3 className="card-title" style={{ margin: 0 }}>Призначений автопарк ({carsList.length})</h3>
            <span className="collapse-icon">{isCarsExpanded ? '▲' : '▼'}</span>
          </div>

          {isCarsExpanded && (
            <div className="collapsible-content">
              {carsList.length > 0 ? carsList.map((car, index) => (
                <div key={car.id || index} className="car-card">
                  <div className="car-card-top-bar">
                    <div className="car-main-info">
                      <div className="car-title-group">
                        <h4 className="car-title">{car.make} {car.model}</h4>
                        <span className="car-id-badge">ID #{car.id}</span>
                      </div>
                      <span className={`badge ${car.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>
                        {car.status === 'ACTIVE' ? 'Активне авто' : car.status || 'Неактивне'}
                      </span>
                    </div>
                    <div className="car-plate-badge">{car.plateNumber}</div>
                  </div>

                  <div className="car-specs-tiles">
                    <div className="spec-tile">
                      <span className="spec-label">Колір</span>
                      <span className="spec-value">{car.color}</span>
                    </div>
                    <div className="spec-tile">
                      <span className="spec-label">Рік випуску</span>
                      <span className="spec-value">{car.year}</span>
                    </div>
                    <div className="spec-tile">
                      <span className="spec-label">Тип кузова</span>
                      <span className="spec-value">{car.carType || '—'}</span>
                    </div>
                    <div className="spec-tile">
                      <span className="spec-label">VIN-код</span>
                      <span className={`spec-value ${!car.vin ? 'text-subtle font-normal' : ''}`}>
                        {car.vin || 'Не вказано'}
                      </span>
                    </div>
                  </div>

                  <div className="car-documents">
                    <h5 className="docs-subtitle">Документи</h5>
                    <div className="photos-grid">
                      <PhotoBlock label="Тех. паспорт (Перед)" url={car.techPassportFront} />
                      <PhotoBlock label="Тех. паспорт (Зад)" url={car.techPassportBack} />
                      <PhotoBlock label="Страховка" url={car.insurancePhoto} />
                    </div>

                    <h5 className="docs-subtitle">Екстер'єр та салон</h5>
                    <div className="photos-grid">
                      <PhotoBlock label="Спереду" url={car.photoFront} />
                      <PhotoBlock label="Ззаду" url={car.photoBack} />
                      <PhotoBlock label="Зліва" url={car.photoLeft} />
                      <PhotoBlock label="Зправа (Головне)" url={car.photoRight} />
                      <PhotoBlock label="Салон (Перед)" url={car.photoSeatsFront} />
                      <PhotoBlock label="Салон (Зад)" url={car.photoSeatsBack} />
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-subtle text-center py-4">Автомобілі відсутні</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- ОСНОВНАЯ СТРАНИЦА ВОДИТЕЛЕЙ ---
const DriversPage = () => {
  const [drivers, setDrivers] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [availableTariffs, setAvailableTariffs] = useState([]);
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL', 'BLOCKED', 'PENDING_DELETE'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailsDriver, setDetailsDriver] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      let driversData = viewMode === 'PENDING_DELETE' 
        ? await getPendingDeletionDrivers() 
        : await getAllDrivers();

      const tariffsData = await getAllTariffs();
      
      setDrivers(driversData || []);
      setAvailableTariffs(tariffsData || []); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); 
  }, [viewMode]);

  useEffect(() => {
    if (drivers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get('openId');
      if (openId) {
        const targetDriver = drivers.find(d => d.id.toString() === openId.toString());
        if (targetDriver) setDetailsDriver(targetDriver);
      }
    }
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = !searchTerm || 
        driver.phoneNumber?.includes(searchTerm) || 
        driver.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

      if (viewMode === 'BLOCKED') {
        return matchesSearch && (driver.isBlocked || !!driver.tempBlockExpiresAt);
      }
      return matchesSearch;
    });
  }, [drivers, searchTerm, viewMode]);

  const handleAddClick = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (driver, e) => {
    if (e) e.stopPropagation();
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
  };

  const handleRowDoubleClick = (driver) => setDetailsDriver(driver);
  const closeDetails = () => setDetailsDriver(null);

  const handleDriverUpdateInModal = (updatedDriver) => {
    updateDriverState(updatedDriver);
    setDetailsDriver(updatedDriver);
  };

  const handleFormSubmit = async (formData, file, carFilesCollection) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData, file, carFilesCollection);
      } else {
        await createDriver(formData, file, carFilesCollection);
      }
      handleModalClose();
      fetchData(); 
    } catch (err) {
      setError(err.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (driverId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Видалити водія?')) {
      try {
        await deleteDriver(driverId);
        fetchData(); 
      } catch (err) {
        setError(err.message);
      }
    }
  };
  
  const updateDriverState = (updatedDriver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
  };

  const handleBlockTemp = async (id, e) => {
    if (e) e.stopPropagation();
    const hours = prompt('Годин заблокувати:', '24');
    if (hours && !isNaN(hours)) {
      try {
        const updatedDriver = await blockDriverTemporarily(id, parseInt(hours));
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };

  const handleBlockPerm = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Заблокувати водія назавжди?')) {
      try {
        const updatedDriver = await blockDriverPermanently(id);
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };

  const handleUnblock = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Розблокувати водія?')) {
      try {
        const updatedDriver = await unblockDriver(id);
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };

  if (loading) return <div className="loading-spinner">Завантаження...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Водії</h1>
          <span className="count-badge">{filteredDrivers.length}</span>
        </div>
        
        <div className="header-actions">
          <div className="toggle-group">
            <button 
              onClick={() => setViewMode('ALL')}
              className={`toggle-btn ${viewMode === 'ALL' ? 'active' : ''}`}
            >
              Всі водії
            </button>
            <button 
              onClick={() => setViewMode('BLOCKED')}
              className={`toggle-btn ${viewMode === 'BLOCKED' ? 'active' : ''}`}
            >
              Заблоковані
            </button>
            <button 
              onClick={() => setViewMode('PENDING_DELETE')}
              className={`toggle-btn ${viewMode === 'PENDING_DELETE' ? 'active' : ''}`}
            >
              На видалення
            </button>
          </div>

          <input
            type="text"
            placeholder="Пошук..."
            className="input-field search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="btn btn-primary" onClick={handleAddClick}>
            + Додати водія
          </button>
        </div>
      </header>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center">ID</th>
                <th className="text-center">Фото</th>
                <th>ПІБ</th>
                <th>Телефон</th>
                <th>Email</th>
                <th className="text-center">Баланс</th>
                <th className="text-center">Онлайн</th>
                <th className="text-center">Статус</th>
                <th className="text-center">Номер</th>
                <th className="text-center">Дії</th>
                <th className="text-center">Блокування</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => (
                  <tr 
                    key={driver.id} 
                    onDoubleClick={() => handleRowDoubleClick(driver)}
                    className="clickable-row"
                  >
                    <td className="text-center text-subtle">{driver.id}</td>
                    <td className="text-center">
                      {driver.photoUrl ? (
                        <img src={driver.photoUrl} alt="Driver" className="table-avatar" />
                      ) : (
                        <div className="table-avatar avatar-placeholder">—</div>
                      )}
                    </td>
                    <td className="font-medium">{driver.fullName}</td>
                    <td>{driver.phoneNumber}</td>
                    <td className="text-subtle">{driver.email || '—'}</td>
                    <td className={`text-center font-medium ${(driver.balance || 0) < 0 ? 'text-danger' : 'text-success'}`}>
                      {(driver.balance || 0).toFixed(2)} ₴
                    </td>
                    <td className="text-center">
                      <span className={`status-dot ${driver.isOnline ? 'online' : 'offline'}`}></span>
                    </td>
                    <td className="text-center">
                      {driver.isBlocked ? (
                        <span className="badge badge-danger">BLOCK</span>
                      ) : driver.tempBlockExpiresAt ? (
                        <span className="badge badge-warning">Тимчасово</span>
                      ) : (
                        <span className="badge badge-success">Активний</span>
                      )}
                    </td>
                    <td className="text-center">
                      {driver.car?.plateNumber ? (
                        <span className="plate-badge">{driver.car.plateNumber}</span>
                      ) : '—'}
                    </td>
                    <td className="text-center">
                      <div className="btn-group justify-center">
                        <button className="btn btn-sm btn-ghost" onClick={(e) => handleEditClick(driver, e)}>Ред.</button>
                        <button className="btn btn-sm btn-ghost-danger" onClick={(e) => handleDeleteClick(driver.id, e)}>Вид.</button>
                        <button 
                          className="btn-photocontrol-sm"
                          onClick={(e) => { e.stopPropagation(); handleRequestPhotoControl(driver.id); }}
                        >
                          Фотоконтроль
                        </button>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="btn-group justify-center">
                        <button className="btn btn-sm btn-outline" onClick={(e) => handleBlockTemp(driver.id, e)} title="Тимчасово">Т</button>
                        <button className="btn-sm btn-outline-danger" onClick={(e) => handleBlockPerm(driver.id, e)} title="Назавжди">П</button>
                        <button className="btn-sm btn-outline-success" onClick={(e) => handleUnblock(driver.id, e)} title="Розблокувати">Р</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center text-subtle py-8">Водії не знайдені</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingDriver ? 'Редагувати водія' : 'Додати нового водія'}
      >
        <DriverForm
          initialData={editingDriver}
          availableTariffs={availableTariffs} 
          onSubmit={handleFormSubmit}
          onCancel={handleModalClose}
          isLoading={isSubmitting}
        />
      </Modal>

      <DriverDetailsModal 
        driver={detailsDriver} 
        isOpen={!!detailsDriver} 
        onClose={closeDetails} 
        onDriverUpdated={handleDriverUpdateInModal}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onBlockTemp={handleBlockTemp}
        onBlockPerm={handleBlockPerm}
        onUnblock={handleUnblock}
      />
    </div>
  );
};

export default DriversPage;
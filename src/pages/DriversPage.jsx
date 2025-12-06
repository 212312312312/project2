import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllDrivers, 
  createDriver, 
  updateDriver, 
  deleteDriver,
  blockDriverPermanently,
  blockDriverTemporarily,
  unblockDriver
} from '../services/driverService';
import { getAllTariffs } from '../services/tariffService'; 

import Modal from '../components/Modal';
import DriverForm from '../components/DriverForm';

const DriversPage = () => {
  // --- Стани Списку ---
  const [drivers, setDrivers] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Стан Тарифів ---
  const [availableTariffs, setAvailableTariffs] = useState([]);

  // --- Стани Модального Вікна (CRUD) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Завантаження даних (Водії + Тарифи)
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [driversData, tariffsData] = await Promise.all([
        getAllDrivers(),
        getAllTariffs()
      ]);
      setDrivers(driversData);
      setAvailableTariffs(tariffsData); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); 
  }, []); 

  // 2. Логіка Пошуку (без змін)
  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    return drivers.filter((driver) =>
      driver.phoneNumber.includes(searchTerm)
    );
  }, [drivers, searchTerm]);

  // --- 3. Функції-обробники CRUD (без змін) ---
  const handleAddClick = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };
  const handleEditClick = (driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
  };
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData);
      } else {
        await createDriver(formData);
      }
      handleModalClose();
      fetchData(); 
    } catch (err) {
      setError(err.message); 
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteClick = async (driverId) => {
    if (window.confirm('Вы уверены? Это действие "отвяжет" активные заказы водителя.')) {
      try {
        await deleteDriver(driverId);
        fetchData(); 
      } catch (err) {
        setError(err.message);
      }
    }
  };
  
  // --- 4. Функції-обробники Блокувань (без змін) ---
  const updateDriverState = (updatedDriver) => {
    setDrivers(prevDrivers => 
      prevDrivers.map(d => d.id === updatedDriver.id ? updatedDriver : d)
    );
  };
  const handleBlockTemp = async (id) => {
    const hours = prompt('На сколько часов заблокировать водителя?', '24');
    if (hours && !isNaN(hours)) {
      try {
        const updatedDriver = await blockDriverTemporarily(id, parseInt(hours));
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };
  const handleBlockPerm = async (id) => {
    if (window.confirm('Заблокировать водителя НАВСЕГДА?')) {
      try {
        const updatedDriver = await blockDriverPermanently(id);
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };
  const handleUnblock = async (id) => {
    try {
      const updatedDriver = await unblockDriver(id);
      updateDriverState(updatedDriver);
    } catch (err) { setError(err.message); }
  };

  // 5. Відображення
  if (loading) return <div>Завантаження водіїв та тарифів...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Список Водіїв ({filteredDrivers.length})</h2>
        <div className="controls">
          <input
            type="text"
            placeholder="Пошук за номером..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-primary" onClick={handleAddClick}>
            + Додати водія
          </button>
        </div>
      </div>
      
      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ПІБ</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Блокування</th> {/* <-- ПОВЕРНУЛИ КОЛОНКУ */}
              <th>Тарифи</th>
              <th>Авто</th>
              <th>Держ. номер</th>
              <th>Дії (CRUD)</th>
              <th>Дії (Блок)</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>{driver.id}</td>
                  <td>{driver.fullName}</td>
                  <td>{driver.phoneNumber}</td>
                  <td>
                    <span className={driver.isOnline ? 'status-online' : 'status-offline'}>
                      {driver.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  {/* --- ПОВЕРНУЛИ ЛОГІКУ БЛОКУВАННЯ --- */}
                  <td>
                    {driver.isBlocked ? (
                      <strong style={{color: 'red'}}>НАЗАВЖДИ</strong>
                    ) : driver.tempBlockExpiresAt ? (
                      // Виводимо лише час, дата зазвичай зайва
                      `До ${new Date(driver.tempBlockExpiresAt).toLocaleTimeString()}`
                    ) : (
                      'Ні'
                    )}
                  </td>
                  {/* --- Кінець --- */}
                  <td>
                    {driver.allowedTariffs.length > 0 ? 
                      driver.allowedTariffs.map(t => t.name).join(', ') : 
                      'Немає'}
                  </td>
                  <td>{driver.car ? `${driver.car.make} ${driver.car.model}` : 'N/A'}</td>
                  <td>{driver.car?.plateNumber || 'N/A'}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleEditClick(driver)}>
                      Редаг.
                    </button>
                    <button className="btn-danger" onClick={() => handleDeleteClick(driver.id)}>
                      Видалити
                    </button>
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleBlockTemp(driver.id)}>Тимч.</button>
                    <button className="btn-danger" onClick={() => handleBlockPerm(driver.id)}>Наз.</button>
                    <button className="btn-primary" onClick={() => handleUnblock(driver.id)}>Зняти</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">Водії не знайдені.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Модальне вікно --- */}
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
    </div>
  );
};

export default DriversPage;
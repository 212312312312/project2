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
  const [drivers, setDrivers] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [availableTariffs, setAvailableTariffs] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    return drivers.filter((driver) =>
      driver.phoneNumber.includes(searchTerm)
    );
  }, [drivers, searchTerm]);

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

  // ПРИНИМАЕМ FILE
  const handleFormSubmit = async (formData, file) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData, file);
      } else {
        await createDriver(formData, file);
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
    if (window.confirm('Вы уверены?')) {
      try {
        await deleteDriver(driverId);
        fetchData(); 
      } catch (err) {
        setError(err.message);
      }
    }
  };
  
  const updateDriverState = (updatedDriver) => {
    setDrivers(prevDrivers => 
      prevDrivers.map(d => d.id === updatedDriver.id ? updatedDriver : d)
    );
  };
  const handleBlockTemp = async (id) => {
    const hours = prompt('Часов блокировки:', '24');
    if (hours && !isNaN(hours)) {
      try {
        const updatedDriver = await blockDriverTemporarily(id, parseInt(hours));
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };
  const handleBlockPerm = async (id) => {
    if (window.confirm('Заблокировать навсегда?')) {
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

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Список Водіїв ({filteredDrivers.length})</h2>
        <div className="controls">
          <input
            type="text"
            placeholder="Пошук..."
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
              <th>Фото</th>
              <th>ID</th>
              <th>ПІБ</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Блокування</th>
              <th>Тарифи</th>
              <th>Авто</th>
              <th>Держ. номер</th>
              <th>Дії</th>
              <th>Блок</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    {driver.photoUrl ? (
                        <img 
                            src={driver.photoUrl} 
                            alt="Foto"
                            style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}}
                        />
                    ) : (
                        <div style={{width: '40px', height: '40px', borderRadius: '50%', background: '#ccc'}}></div>
                    )}
                  </td>
                  <td>{driver.id}</td>
                  <td>{driver.fullName}</td>
                  <td>{driver.phoneNumber}</td>
                  <td>
                    <span className={driver.isOnline ? 'status-online' : 'status-offline'}>
                      {driver.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td>
                    {driver.isBlocked ? (
                      <strong style={{color: 'red'}}>BLOCK</strong>
                    ) : driver.tempBlockExpiresAt ? (
                      `До ${new Date(driver.tempBlockExpiresAt).toLocaleTimeString()}`
                    ) : (
                      'Ні'
                    )}
                  </td>
                  <td>
                    {driver.allowedTariffs.length > 0 ? 
                      driver.allowedTariffs.map(t => t.name).join(', ') : 
                      '—'}
                  </td>
                  <td>{driver.car ? `${driver.car.make} ${driver.car.model}` : '—'}</td>
                  <td>{driver.car?.plateNumber || '—'}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleEditClick(driver)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeleteClick(driver.id)}>Del</button>
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleBlockTemp(driver.id)}>T</button>
                    <button className="btn-danger" onClick={() => handleBlockPerm(driver.id)}>P</button>
                    <button className="btn-primary" onClick={() => handleUnblock(driver.id)}>U</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11">Водії не знайдені.</td>
              </tr>
            )}
          </tbody>
        </table>
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
    </div>
  );
};

export default DriversPage;
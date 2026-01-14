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

// --- КОМПОНЕНТ ДЕТАЛЬНОГО ПЕРЕГЛЯДУ (FULL SCREEN) ---
const DriverDetailsModal = ({ driver, isOpen, onClose }) => {
    if (!isOpen || !driver) return null;

    // Стилі для повноекранного режиму
    const fullScreenOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#f4f4f9', // Світлий фон контенту
        zIndex: 2000, // Поверх усього
        overflowY: 'auto', // Прокрутка
        display: 'flex',
        flexDirection: 'column'
    };

    const headerStyle = {
        backgroundColor: '#1E1E1E', // Темна шапка як в меню
        color: '#fff',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    };

    const closeBtnStyle = {
        background: '#e74c3c',
        color: '#fff',
        border: 'none',
        padding: '8px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    };

    const contentContainerStyle = {
        padding: '40px',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
    };

    const cardStyle = {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '25px',
        marginBottom: '30px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
    };

    const sectionTitleStyle = {
        borderBottom: '2px solid #eee',
        paddingBottom: '10px',
        marginBottom: '20px',
        color: '#333',
        marginTop: 0,
        fontSize: '20px'
    };

    const rowStyle = { display: 'flex', marginBottom: '12px', borderBottom: '1px dashed #eee', paddingBottom: '8px' };
    const labelStyle = { fontWeight: 'bold', width: '200px', color: '#555' };
    const valueStyle = { color: '#000', fontWeight: '500' };

    // Компонент для фото (трохи збільшений)
    const PhotoBlock = ({ label, url }) => (
        <div style={{marginRight: '20px', marginBottom: '20px', textAlign: 'center'}}>
            <div style={{fontSize:'14px', color:'#555', marginBottom:'8px', fontWeight:'bold'}}>{label}</div>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <img 
                        src={url} 
                        alt={label} 
                        style={{
                            width:'200px', 
                            height:'140px', 
                            objectFit:'cover', 
                            borderRadius:'8px', 
                            border:'1px solid #ddd',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            cursor: 'zoom-in'
                        }} 
                    />
                </a>
            ) : (
                <div style={{
                    width:'200px', 
                    height:'140px', 
                    background:'#f0f0f0', 
                    display:'flex', 
                    alignItems:'center', 
                    justifyContent:'center', 
                    color:'#999', 
                    fontSize:'14px', 
                    borderRadius:'8px',
                    border: '1px dashed #ccc'
                }}>
                    Немає фото
                </div>
            )}
        </div>
    );

    return (
        <div style={fullScreenOverlayStyle}>
            {/* ШАПКА */}
            <div style={headerStyle}>
                <div style={{fontSize: '24px', fontWeight: 'bold'}}>
                    👤 Картка водія: <span style={{color: '#4CAF50'}}>{driver.fullName}</span>
                </div>
                <button style={closeBtnStyle} onClick={onClose}>
                    Закрити ✕
                </button>
            </div>

            {/* КОНТЕНТ */}
            <div style={contentContainerStyle}>
                
                {/* 1. Основна інформація */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Особисті дані</h3>
                    <div style={{display:'flex', gap:'40px', alignItems: 'flex-start'}}>
                        <div style={{flexShrink:0, textAlign: 'center'}}>
                            {driver.photoUrl ? (
                                <img 
                                    src={driver.photoUrl} 
                                    alt="Avatar" 
                                    style={{
                                        width:'150px', 
                                        height:'150px', 
                                        borderRadius:'50%', 
                                        objectFit:'cover', 
                                        border: '4px solid #fff',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                    }} 
                                />
                            ) : (
                                <div style={{width:'150px', height:'150px', background:'#ddd', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                    Немає фото
                                </div>
                            )}
                            <div style={{marginTop: '15px'}}>
                                <span style={{
                                    padding: '5px 10px', 
                                    borderRadius: '15px', 
                                    background: driver.isOnline ? '#e8f5e9' : '#ffebee',
                                    color: driver.isOnline ? '#2e7d32' : '#c62828',
                                    fontWeight: 'bold'
                                }}>
                                    {driver.isOnline ? '🟢 ONLINE' : '⚪ OFFLINE'}
                                </span>
                            </div>
                        </div>

                        <div style={{flexGrow:1}}>
                            <div style={rowStyle}><span style={labelStyle}>ID в системі:</span> <span style={valueStyle}>{driver.id}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Номер телефону:</span> <span style={valueStyle}>{driver.phoneNumber}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Email:</span> <span style={valueStyle}>{driver.email || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>РНОКПП:</span> <span style={valueStyle}>{driver.rnokpp || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Посвідчення водія:</span> <span style={valueStyle}>{driver.driverLicense || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Статус блокування:</span> 
                                {driver.isBlocked ? (
                                    <span style={{color: 'red', fontWeight:'bold'}}>ЗАБЛОКОВАНИЙ</span>
                                ) : driver.tempBlockExpiresAt ? (
                                    <span style={{color: 'orange', fontWeight:'bold'}}>Тимчасово до {new Date(driver.tempBlockExpiresAt).toLocaleString()}</span>
                                ) : (
                                    <span style={{color: 'green'}}>Активний</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Автомобіль */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Автомобіль</h3>
                    {driver.car ? (
                        <div>
                            <div style={rowStyle}><span style={labelStyle}>Модель:</span> <span style={valueStyle}>{driver.car.make} {driver.car.model}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Держ. номер:</span> <span style={{background:'#f0f0f0', padding:'2px 8px', borderRadius:'4px', fontWeight:'bold', border: '1px solid #ccc'}}>{driver.car.plateNumber}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Тип кузова:</span> <span style={valueStyle}>{driver.car.carType}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Колір:</span> <span style={valueStyle}>{driver.car.color}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Рік випуску:</span> <span style={valueStyle}>{driver.car.year}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>VIN код:</span> <span style={valueStyle}>{driver.car.vin}</span></div>
                        </div>
                    ) : <p style={{color:'#999'}}>Автомобіль не призначено</p>}
                </div>

                {/* 3. Документи та Фото */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Фото та Документи</h3>
                    
                    <h4 style={{marginTop:0, color:'#666'}}>📂 Основні документи</h4>
                    <div style={{display:'flex', flexWrap:'wrap', paddingBottom: '20px', borderBottom: '1px solid #eee', marginBottom: '20px'}}>
                        <PhotoBlock label="Головне фото авто" url={driver.car?.photoUrl} />
                        <PhotoBlock label="Тех. паспорт (Перед)" url={driver.car?.techPassportFront} />
                        <PhotoBlock label="Тех. паспорт (Зад)" url={driver.car?.techPassportBack} />
                        <PhotoBlock label="Страховка (ОСАГО)" url={driver.car?.insurancePhoto} />
                    </div>

                    <h4 style={{marginTop:0, color:'#666'}}>🚗 Огляд автомобіля (6 сторін)</h4>
                    <div style={{display:'flex', flexWrap:'wrap'}}>
                        <PhotoBlock label="Вид спереду" url={driver.car?.photoFront} />
                        <PhotoBlock label="Вид ззаду" url={driver.car?.photoBack} />
                        <PhotoBlock label="Вид зліва" url={driver.car?.photoLeft} />
                        <PhotoBlock label="Вид справа" url={driver.car?.photoRight} />
                        <PhotoBlock label="Салон (Передні)" url={driver.car?.photoSeatsFront} />
                        <PhotoBlock label="Салон (Задні)" url={driver.car?.photoSeatsBack} />
                    </div>
                </div>

                {/* 4. Тарифи */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Доступні тарифи</h3>
                    <div>
                        {driver.allowedTariffs && driver.allowedTariffs.length > 0 ? (
                            driver.allowedTariffs.map(t => (
                                <span key={t.id} style={{
                                    display:'inline-block', 
                                    background:'#e3f2fd', 
                                    color:'#1565c0', 
                                    padding:'8px 16px', 
                                    borderRadius:'20px', 
                                    marginRight:'10px', 
                                    marginBottom: '10px',
                                    fontSize:'14px',
                                    fontWeight: 'bold',
                                    border: '1px solid #90caf9'
                                }}>
                                    {t.name}
                                </span>
                            ))
                        ) : 'Немає активних тарифів'}
                    </div>
                </div>

            </div>
        </div>
    );
};


// --- ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ (Без змін логіки) ---
const DriversPage = () => {
  const [drivers, setDrivers] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [availableTariffs, setAvailableTariffs] = useState([]);

  // Модалка редагування
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Модалка деталей
  const [detailsDriver, setDetailsDriver] = useState(null);

  // --- ЗАВАНТАЖЕННЯ ДАНИХ ---
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

  // --- ФІЛЬТРАЦІЯ ---
  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    return drivers.filter((driver) =>
      driver.phoneNumber.includes(searchTerm) || 
      driver.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

  // --- МОДАЛЬНЕ ВІКНО РЕДАГУВАННЯ ---
  const handleAddClick = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };
  const handleEditClick = (driver, e) => {
    e.stopPropagation();
    setEditingDriver(driver);
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
  };

  // --- ДЕТАЛЬНИЙ ПЕРЕГЛЯД ---
  const handleRowDoubleClick = (driver) => {
      setDetailsDriver(driver);
  };
  const closeDetails = () => {
      setDetailsDriver(null);
  };

  // --- CRUD ОПЕРАЦІЇ ---
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
    e.stopPropagation();
    if (window.confirm('Ви впевнені, що хочете видалити водія?')) {
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

  // --- ЛОГІКА БЛОКУВАННЯ ---
  const handleBlockTemp = async (id, e) => {
    e.stopPropagation();
    const hours = prompt('На скільки годин заблокувати?', '24');
    if (hours && !isNaN(hours)) {
      try {
        const updatedDriver = await blockDriverTemporarily(id, parseInt(hours));
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };

  const handleBlockPerm = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Заблокувати водія назавжди?')) {
      try {
        const updatedDriver = await blockDriverPermanently(id);
        updateDriverState(updatedDriver);
      } catch (err) { setError(err.message); }
    }
  };

  const handleUnblock = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Розблокувати водія?')) {
        try {
        const updatedDriver = await unblockDriver(id);
        updateDriverState(updatedDriver);
        } catch (err) { setError(err.message); }
    }
  };

  if (loading) return <div>Завантаження...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Список Водіїв ({filteredDrivers.length})</h2>
        <div className="controls">
          <input
            type="text"
            placeholder="Пошук (Телефон або ПІБ)..."
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
              <th>Фото</th>
              <th>ПІБ</th>
              <th>Телефон</th>
              <th>Email</th>
              <th>Статус</th>
              <th>Стан Блоку</th>
              <th>Авто (Фото)</th>
              <th>Тип</th>
              <th>Авто</th>
              <th>Номер</th>
              <th>Ред./Вид.</th>
              <th>Блокування</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <tr 
                    key={driver.id} 
                    onDoubleClick={() => handleRowDoubleClick(driver)}
                    style={{cursor: 'pointer'}}
                    title="Подвійний клік для деталей"
                    className="table-row-hover"
                >
                  <td>{driver.id}</td>
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
                  <td>{driver.fullName}</td>
                  <td>{driver.phoneNumber}</td>
                  <td>{driver.email || '-'}</td>
                  <td>
                    <span className={driver.isOnline ? 'status-online' : 'status-offline'}>
                      {driver.isOnline ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td>
                    {driver.isBlocked ? (
                      <strong style={{color: 'red'}}>BLOCK</strong>
                    ) : driver.tempBlockExpiresAt ? (
                      <small style={{color: 'orange'}}>До {new Date(driver.tempBlockExpiresAt).toLocaleTimeString()}</small>
                    ) : (
                      <span style={{color: 'green'}}>Активний</span>
                    )}
                  </td>
                  <td>
                    {driver.car?.photoUrl ? (
                        <img 
                            src={driver.car.photoUrl} 
                            alt="Car"
                            style={{width: '60px', height: '40px', borderRadius: '4px', objectFit: 'cover'}}
                        />
                    ) : (
                        <span style={{color:'#ccc'}}>—</span>
                    )}
                  </td>
                  <td>{driver.car?.carType || 'Седан'}</td>
                  <td>{driver.car ? `${driver.car.make} ${driver.car.model}` : '—'}</td>
                  <td>{driver.car?.plateNumber || '—'}</td>
                  <td>
                    <button className="btn-secondary" onClick={(e) => handleEditClick(driver, e)} style={{marginRight:'5px'}}>Edit</button>
                    <button className="btn-danger" onClick={(e) => handleDeleteClick(driver.id, e)}>Del</button>
                  </td>
                  <td>
                    <div style={{display:'flex', gap:'2px'}}>
                        <button className="btn-secondary" onClick={(e) => handleBlockTemp(driver.id, e)} title="Тимчасово">T</button>
                        <button className="btn-danger" onClick={(e) => handleBlockPerm(driver.id, e)} title="Назавжди">P</button>
                        <button className="btn-primary" onClick={(e) => handleUnblock(driver.id, e)} title="Розблокувати">U</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="14">Водії не знайдені.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка редагування (маленька) */}
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

      {/* Модалка деталей (FULL SCREEN) */}
      <DriverDetailsModal 
        driver={detailsDriver} 
        isOpen={!!detailsDriver} 
        onClose={closeDetails} 
      />
    </div>
  );
};

export default DriversPage;
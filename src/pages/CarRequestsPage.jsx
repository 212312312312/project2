import React, { useState, useEffect } from 'react';
import * as driverService from '../services/driverService';
import '../assets/CarRequestsPage.css';

const CarRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await driverService.getPendingCars();
      setRequests(data);
    } catch (error) {
      console.error("Помилка завантаження:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (car) => {
    if (expandedId === car.id) {
      setExpandedId(null);
      setEditData({});
    } else {
      setExpandedId(car.id);
      setEditData({
        make: car.make || '',
        model: car.model || '',
        plateNumber: car.plateNumber || '',
        color: car.color || '',
        year: car.year || '',
        carType: car.carType || 'Standard',
        vin: car.vin || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (id) => {
    try {
      await driverService.updateCarDetails(id, editData);
      alert("Дані успішно збережено!");
      loadRequests();
    } catch (e) {
      alert("Помилка збереження: " + e.message);
    }
  };

  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (expandedId === id) {
      try {
        await driverService.updateCarDetails(id, editData);
      } catch (err) {
        alert("Помилка при збереженні даних перед схваленням");
        return;
      }
    }

    if (!window.confirm("Схвалити це авто та призначити водію?")) return;
    
    try {
      await driverService.approveCar(id);
      alert("Авто схвалено!");
      setExpandedId(null);
      loadRequests();
    } catch (e) {
      alert("Помилка: " + e.message);
    }
  };

  const handleReject = async (id, e) => {
    if (e) e.stopPropagation();
    const reason = prompt("Вкажіть причину відмови:");
    if (!reason) return;
    
    try {
      await driverService.rejectCar(id, reason);
      alert("Заявку відхилено.");
      loadRequests();
    } catch (e) {
      alert("Помилка: " + e.message);
    }
  };

  // Блок фотографій без емодзі
  const PhotoBlock = ({ label, url }) => {
    if (!url) {
      return (
        <div className="photo-card">
          <div className="photo-card-label">{label}</div>
          <div className="photo-card-placeholder">Відсутнє</div>
        </div>
      );
    }

    const fullUrl = url.startsWith('http') ? url : `http://localhost:8080/uploads/${url}`;

    return (
      <div className="photo-card">
        <div className="photo-card-label">{label}</div>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="photo-card-link">
          <img src={fullUrl} alt={label} className="photo-card-img" />
        </a>
      </div>
    );
  };

  if (loading) return <div className="loading-spinner">Завантаження заявок...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Заявки на авто</h1>
          <span className="count-badge">{requests.length}</span>
        </div>
        <button onClick={loadRequests} className="btn btn-secondary">
          Оновити
        </button>
      </header>

      {requests.length === 0 ? (
        <div className="empty-state-card">
          <h3>Немає нових заявок</h3>
          <p className="text-subtle">Усі нові автомобілі вже перевірені та опрацьовані.</p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="main-table">
              <thead>
                <tr>
                  <th className="text-center">ID</th>
                  <th>Водій</th>
                  <th>Автомобіль</th>
                  <th className="text-center">Держ. номер</th>
                  <th className="text-center">Дії</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((car) => {
                  const isExpanded = expandedId === car.id;
                  return (
                    <React.Fragment key={car.id}>
                      {/* ОСНОВНИЙ РЯДОК */}
                      <tr 
                        onClick={() => toggleRow(car)} 
                        className={`clickable-row ${isExpanded ? 'row-expanded' : ''}`}
                      >
                        <td className="text-center text-subtle">{car.id}</td>
                        <td>
                          <div className="font-medium">{car.driver?.fullName || 'N/A'}</div>
                          <div className="text-subtle text-sm">{car.driver?.phoneNumber}</div>
                        </td>
                        <td>
                          {isExpanded ? (
                            <div className="inline-edit-group" onClick={e => e.stopPropagation()}>
                              <input 
                                name="make" 
                                value={editData.make} 
                                onChange={handleInputChange} 
                                className="input-field input-sm" 
                                placeholder="Марка"
                              />
                              <input 
                                name="model" 
                                value={editData.model} 
                                onChange={handleInputChange} 
                                className="input-field input-sm" 
                                placeholder="Модель"
                              />
                            </div>
                          ) : (
                            <div className="font-medium">{car.make} {car.model}</div>
                          )}
                        </td>
                        <td className="text-center">
                          {isExpanded ? (
                            <input 
                              name="plateNumber" 
                              value={editData.plateNumber} 
                              onChange={handleInputChange} 
                              className="input-field input-sm text-center font-mono uppercase" 
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className="plate-badge">{car.plateNumber}</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group justify-center" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => handleApprove(car.id, e)} 
                              className="btn btn-sm btn-outline-success"
                              title="Схвалити"
                            >
                              Схвалити
                            </button>
                            <button 
                              onClick={(e) => handleReject(car.id, e)} 
                              className="btn btn-sm btn-outline-danger"
                              title="Відхилити"
                            >
                              Відхилити
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* РОЗГОРНУТА ФОРМА ПЕРЕВІРКИ */}
                      {isExpanded && (
                        <tr className="expanded-details-row">
                          <td colSpan="5" className="p-0">
                            <div className="expanded-content-box">
                              
                              <div className="expanded-header-bar">
                                <h4 className="expanded-title">Перевірка та редагування даних</h4>
                                <div className="expanded-actions">
                                  <button onClick={() => handleSaveChanges(car.id)} className="btn btn-primary btn-sm">
                                    Зберегти зміни
                                  </button>
                                  <span className="text-subtle text-sm">
                                    (Натисніть "Схвалити" вище після перевірки)
                                  </span>
                                </div>
                              </div>

                              {/* СЕТКА ПОЛЕЙ ВВОДА */}
                              <div className="edit-grid">
                                <div className="input-group-field">
                                  <label className="field-label">Колір</label>
                                  <input 
                                    name="color" 
                                    value={editData.color} 
                                    onChange={handleInputChange} 
                                    className="input-field" 
                                  />
                                </div>

                                <div className="input-group-field">
                                  <label className="field-label">Рік випуску</label>
                                  <input 
                                    name="year" 
                                    type="number" 
                                    value={editData.year} 
                                    onChange={handleInputChange} 
                                    className="input-field" 
                                  />
                                </div>

                                <div className="input-group-field">
                                  <label className="field-label">Тип авто (Тариф)</label>
                                  <select 
                                    name="carType" 
                                    value={editData.carType} 
                                    onChange={handleInputChange} 
                                    className="input-field"
                                  >
                                    <option value="Standard">Standard</option>
                                    <option value="Comfort">Comfort</option>
                                    <option value="Business">Business</option>
                                    <option value="Minivan">Minivan</option>
                                  </select>
                                </div>

                                <div className="input-group-field">
                                  <label className="field-label">VIN-код</label>
                                  <input 
                                    name="vin" 
                                    value={editData.vin} 
                                    onChange={handleInputChange} 
                                    className="input-field" 
                                    placeholder="Введіть VIN" 
                                  />
                                </div>
                              </div>

                              {/* ФОТОГРАФИИ ПО КАТЕГОРИЯМ */}
                              <div className="photos-section">
                                <h5 className="docs-subtitle">Документи</h5>
                                <div className="photos-grid">
                                  <PhotoBlock label="Техпаспорт (Лице)" url={car.techPassportFront} />
                                  <PhotoBlock label="Техпаспорт (Тил)" url={car.techPassportBack} />
                                  <PhotoBlock label="Страховка" url={car.insurancePhoto} />
                                </div>

                                <h5 className="docs-subtitle">Екстер'єр</h5>
                                <div className="photos-grid">
                                  <PhotoBlock label="Спереду" url={car.photoFront} />
                                  <PhotoBlock label="Ззаду" url={car.photoBack} />
                                  <PhotoBlock label="Зліва" url={car.photoLeft} />
                                  <PhotoBlock label="Справа" url={car.photoRight} />
                                </div>

                                <h5 className="docs-subtitle">Салон та багажник</h5>
                                <div className="photos-grid">
                                  <PhotoBlock label="Передні сидіння" url={car.photoSeatsFront} />
                                  <PhotoBlock label="Задні сидіння" url={car.photoSeatsBack} />
                                  <PhotoBlock label="Багажник" url={car.photoTrunk} />
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRequestsPage;
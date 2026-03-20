import React, { useState, useEffect } from 'react';
import * as driverService from '../services/driverService';
import '../assets/TableStyles.css';

const CarRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedId, setExpandedId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // --- НОВОЕ: Данные для редактирования ---
  const [editData, setEditData] = useState({}); 

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await driverService.getPendingCars();
      setRequests(data);
    } catch (error) {
      console.error("Помилка завантаження:", error);
    } finally {
      setLoading(false);
    }
  };

  // При разворачивании строки копируем данные в форму редактирования
  const toggleRow = (car) => {
    if (expandedId === car.id) {
      setExpandedId(null);
      setEditData({}); // Очищаем
    } else {
      setExpandedId(car.id);
      // Заполняем форму текущими данными
      setEditData({
        make: car.make,
        model: car.model,
        plateNumber: car.plateNumber,
        color: car.color,
        year: car.year,
        carType: car.carType || 'Standard',
        vin: car.vin || ''
      });
    }
  };

  // Обработчик изменения инпутов
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // 1. Сохранить изменения (без одобрения)
  const handleSaveChanges = async (id) => {
    try {
      await driverService.updateCarDetails(id, editData);
      alert("💾 Дані збережено!");
      // Обновляем список локально, чтобы не дергать сервер лишний раз, или перезагружаем
      loadRequests(); 
    } catch (e) {
      alert("Помилка збереження: " + e.message);
    }
  };

  // 2. Одобрить (Сначала сохраняет, потом одобряет)
  const handleApprove = async (id, e) => {
    if (e) e.stopPropagation();
    
    // Если мы редактировали эту машину, сначала сохраним изменения
    if (expandedId === id) {
       try {
           await driverService.updateCarDetails(id, editData);
       } catch (err) {
           alert("Помилка при збереженні даних перед схваленням");
           return;
       }
    }

    if (!window.confirm("Схвалити це авто?")) return;
    
    try {
      await driverService.approveCar(id);
      alert("✅ Авто схвалено!");
      loadRequests();
      setExpandedId(null);
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
      alert("⛔ Авто відхилено.");
      loadRequests();
    } catch (e) {
      alert("Помилка: " + e.message);
    }
  };

  const PhotoPreview = ({ url, label }) => {
    if (!url) return <div style={styles.noPhoto}>{label}<br/>(Немає)</div>;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:8080/uploads/${url}`; 
    return (
      <div style={styles.photoContainer} onClick={() => setSelectedImage({ url: fullUrl, label })}>
        <img src={fullUrl} alt={label} style={styles.photoImg} />
        <div style={styles.photoLabel}>{label}</div>
      </div>
    );
  };

  const ImageViewer = () => {
      if (!selectedImage) return null;
      return (
          <div style={styles.lightboxOverlay} onClick={() => setSelectedImage(null)}>
              <button style={styles.closeBtn} onClick={() => setSelectedImage(null)}>✕</button>
              <img src={selectedImage.url} alt="Full" style={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
              <div style={styles.lightboxLabel}>{selectedImage.label}</div>
          </div>
      );
  };

  if (loading) return <div>Завантаження заявок...</div>;

  return (
    <div className="page-container">
      <ImageViewer />
      <div className="page-header">
        <h1>Заявки на авто ({requests.length})</h1>
        <button onClick={loadRequests} className="secondary-button">Оновити</button>
      </div>

      {requests.length === 0 ? (
        <div style={{textAlign:'center', marginTop:'50px', color:'#777'}}>
            <h3>Немає нових заявок 🎉</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Водій</th>
              <th>Авто</th>
              <th>Держ. номер</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(car => (
              <React.Fragment key={car.id}>
                {/* ОСНОВНИЙ РЯДОК */}
                <tr 
                    onClick={() => toggleRow(car)} 
                    style={{cursor: 'pointer', background: expandedId === car.id ? '#e3f2fd' : 'white'}}
                >
                  <td>{car.id}</td>
                  <td>
                      <div style={{fontWeight:'bold'}}>{car.driver?.fullName || 'N/A'}</div>
                      <div style={{fontSize:'12px', color:'#666'}}>{car.driver?.phoneNumber}</div>
                  </td>
                  <td>
                      {/* Если развернуто - показываем инпуты, иначе текст */}
                      {expandedId === car.id ? (
                          <div style={{display:'flex', gap:'5px'}}>
                              <input 
                                name="make" value={editData.make} onChange={handleInputChange} 
                                style={styles.miniInput} placeholder="Марка" onClick={e=>e.stopPropagation()}
                              />
                              <input 
                                name="model" value={editData.model} onChange={handleInputChange} 
                                style={styles.miniInput} placeholder="Модель" onClick={e=>e.stopPropagation()}
                              />
                          </div>
                      ) : (
                          <div style={{fontWeight:'bold'}}>{car.make} {car.model}</div>
                      )}
                  </td>
                  <td>
                      {expandedId === car.id ? (
                          <input 
                            name="plateNumber" value={editData.plateNumber} onChange={handleInputChange} 
                            style={{...styles.miniInput, width:'100px', textTransform:'uppercase'}} 
                            onClick={e=>e.stopPropagation()}
                          />
                      ) : (
                          <div className="license-plate">{car.plateNumber}</div>
                      )}
                  </td>
                  <td>
                    <div style={{display:'flex', gap:'10px'}}>
                      <button onClick={(e) => handleApprove(car.id, e)} style={styles.btnApprove}>✔ Ок</button>
                      <button onClick={(e) => handleReject(car.id, e)} style={styles.btnReject}>✖ Ні</button>
                    </div>
                  </td>
                </tr>

                {/* РОЗГОРНУТА ФОРМА РЕДАГУВАННЯ */}
                {expandedId === car.id && (
                    <tr>
                        <td colSpan="5" style={{padding: 0}}>
                            <div style={{padding: '20px', background: '#f8f9fa', borderBottom:'2px solid #ddd'}}>
                                
                                <h4 style={{marginTop:0, color:'#333'}}>📝 Перевірка та Редагування даних</h4>
                                
                                {/* ГРІД З ПОЛЯМИ РЕДАГУВАННЯ */}
                                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px', marginBottom:'20px'}}>
                                    
                                    <div style={styles.inputGroup}>
                                        <label>Колір:</label>
                                        <input name="color" value={editData.color} onChange={handleInputChange} style={styles.input} />
                                    </div>
                                    
                                    <div style={styles.inputGroup}>
                                        <label>Рік випуску:</label>
                                        <input name="year" type="number" value={editData.year} onChange={handleInputChange} style={styles.input} />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label>Тип авто:</label>
                                        <select name="carType" value={editData.carType} onChange={handleInputChange} style={styles.input}>
                                            <option value="Standard">Standard</option>
                                            <option value="Comfort">Comfort</option>
                                            <option value="Business">Business</option>
                                            <option value="Minivan">Minivan</option>
                                        </select>
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label>VIN-код:</label>
                                        <input name="vin" value={editData.vin} onChange={handleInputChange} style={styles.input} placeholder="Введіть VIN" />
                                    </div>
                                </div>

                                {/* КНОПКА ЗБЕРЕГТИ (Проміжна) */}
                                <div style={{textAlign:'right', marginBottom:'20px'}}>
                                    <button onClick={() => handleSaveChanges(car.id)} style={styles.btnSave}>
                                        💾 Зберегти зміни
                                    </button>
                                    <span style={{marginLeft:'10px', fontSize:'12px', color:'#666'}}>
                                        (Натисніть "Ок" вище, щоб схвалити)
                                    </span>
                                </div>

                                <hr style={{border:'0', borderTop:'1px solid #ddd', margin:'20px 0'}} />

                                {/* ФОТОГРАФІЇ */}
                                <h4 style={{color:'#1976D2'}}>📂 Документи</h4>
                                <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'15px'}}>
                                    <PhotoPreview url={car.techPassportFront} label="Техпаспорт (Лице)" />
                                    <PhotoPreview url={car.techPassportBack} label="Техпаспорт (Тил)" />
                                    <PhotoPreview url={car.insurancePhoto} label="Страховка" />
                                </div>

                                <h4 style={{color:'#388E3C'}}>🚗 Екстер'єр</h4>
                                <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'15px'}}>
                                    <PhotoPreview url={car.photoFront} label="Спереду" />
                                    <PhotoPreview url={car.photoBack} label="Ззаду" />
                                    <PhotoPreview url={car.photoLeft} label="Зліва" />
                                    <PhotoPreview url={car.photoRight} label="Справа" />
                                </div>

                                <h4 style={{color:'#F57C00'}}>💺 Салон</h4>
                                <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                                    <PhotoPreview url={car.photoSeatsFront} label="Передні сидіння" />
                                    <PhotoPreview url={car.photoSeatsBack} label="Задні сидіння" />
                                    <PhotoPreview url={car.photoTrunk} label="Багажник" />
                                </div>

                            </div>
                        </td>
                    </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// СТИЛИ (CSS-in-JS для зручності)
const styles = {
    miniInput: { padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', width: '80px' },
    inputGroup: { display: 'flex', flexDirection: 'column' },
    input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' },
    
    btnApprove: { background:'#4CAF50', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold' },
    btnReject: { background:'#f44336', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold' },
    btnSave: { background:'#2196F3', color:'white', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer', fontSize:'14px' },

    photoContainer: { textAlign: 'center', cursor: 'zoom-in', border: '1px solid #ddd', padding: '4px', background: 'white', borderRadius: '4px' },
    photoImg: { width: '120px', height: '90px', objectFit: 'cover', borderRadius: '2px' },
    photoLabel: { fontSize:'11px', color:'#555', marginTop:'2px', fontWeight:'bold' },
    noPhoto: { width: '120px', height: '90px', background: '#f0f0f0', border: '1px dashed #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#999' },

    lightboxOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
    closeBtn: { position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: 'white', fontSize: '30px', cursor: 'pointer' },
    lightboxImg: { maxWidth: '90%', maxHeight: '80%', borderRadius: '4px', boxShadow: '0 0 20px rgba(255,255,255,0.2)' },
    lightboxLabel: { marginTop: '15px', color: 'white', fontSize: '18px' }
};

export default CarRequestsPage;
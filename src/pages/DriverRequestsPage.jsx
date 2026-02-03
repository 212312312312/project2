import React, { useState, useEffect } from 'react';
import { getPendingDrivers, approveDriverRegistration, rejectDriverRegistration } from '../services/driverService';
import { getTariffs } from '../services/publicService'; // Предполагаю, у тебя есть метод получения тарифов
import Modal from '../components/Modal';

// Компонент для отображения фото (с зумом по клику)
const PhotoPreview = ({ url, label, onZoom }) => {
    if (!url) return <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>{label}: Немає</div>;
    return (
        <div style={{ marginRight: '10px', marginBottom: '5px', cursor: 'pointer' }} onClick={() => onZoom(url)}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', color: '#555' }}>{label}</div>
            <img 
                src={url} 
                alt={label} 
                style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd', transition: 'transform 0.2s' }} 
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            />
        </div>
    );
};

const DriverRequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [tariffs, setTariffs] = useState([]); // Список всех тарифов
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- МОДАЛКИ ---
    
    // 1. Модалка ОДОБРЕНИЯ (Выбор тарифов)
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [selectedTariffs, setSelectedTariffs] = useState([]); // ID выбранных тарифов

    // 2. Модалка ОТКАЗА
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // 3. Модалка ПРОСМОТРА ФОТО (Zoom)
    const [zoomPhotoUrl, setZoomPhotoUrl] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [driversData, tariffsData] = await Promise.all([
                getPendingDrivers(),
                getTariffs() // Загружаем тарифы
            ]);
            setRequests(driversData);
            setTariffs(tariffsData);
        } catch (err) {
            setError(err.message || 'Помилка завантаження');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- ЛОГИКА ОДОБРЕНИЯ ---

    const openApproveModal = (id) => {
        setSelectedDriverId(id);
        setSelectedTariffs([]); // Сбрасываем выбор
        setApproveModalOpen(true);
    };

    const toggleTariff = (tariffId) => {
        setSelectedTariffs(prev => 
            prev.includes(tariffId) 
                ? prev.filter(id => id !== tariffId) // Убрать
                : [...prev, tariffId] // Добавить
        );
    };

    const handleApproveSubmit = async () => {
        if (selectedTariffs.length === 0) {
            alert("Оберіть хоча б один тариф!");
            return;
        }

        try {
            // Передаем ID и массив тарифов
            await approveDriverRegistration(selectedDriverId, selectedTariffs);
            alert("Водія успішно активовано!");
            setRequests(prev => prev.filter(r => r.id !== selectedDriverId));
            setApproveModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // --- ЛОГИКА ОТКАЗА ---

    const openRejectModal = (id) => {
        setSelectedDriverId(id);
        setRejectReason('');
        setRejectModalOpen(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectReason) return alert("Вкажіть причину");

        try {
            await rejectDriverRegistration(selectedDriverId, rejectReason);
            alert("Заявку відхилено.");
            setRequests(prev => prev.filter(r => r.id !== selectedDriverId));
            setRejectModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div>Завантаження...</div>;

    return (
        <div className="table-page-container">
            <div className="table-header">
                <h2>📋 Заявки на реєстрацію ({requests.length})</h2>
                <button className="btn-secondary" onClick={loadData}>🔄 Оновити</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <h3>Нових заявок немає</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {requests.map(driver => (
                        <div key={driver.id} style={{
                            background: '#fff', padding: '20px', borderRadius: '8px', 
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #FFC107'
                        }}>
                            {/* Заголовок + Кнопки */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#333' }}>{driver.fullName}</h3>
                                    <div style={{ color: '#666', marginTop: '5px' }}>
                                        📞 {driver.phoneNumber} | 🆔 ID: {driver.id}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-danger" onClick={() => openRejectModal(driver.id)}>Відхилити</button>
                                    <button 
                                        className="btn-primary" 
                                        onClick={() => openApproveModal(driver.id)}
                                        style={{ backgroundColor: '#4CAF50' }}
                                    >
                                        ✅ Прийняти
                                    </button>
                                </div>
                            </div>

                            {/* Контент: Фото и Данные */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                                
                                {/* 1. Особисті дані */}
                                <div style={{ flex: 1, minWidth: '250px' }}>
                                    <h4 style={{ color: '#1976D2', marginTop: 0 }}>👤 Водій</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        <PhotoPreview url={driver.photoUrl} label="Селфі" onZoom={setZoomPhotoUrl} />
                                        <PhotoPreview url={driver.driverLicenseFront} label="Права (Лице)" onZoom={setZoomPhotoUrl} />
                                        <PhotoPreview url={driver.driverLicenseBack} label="Права (Тил)" onZoom={setZoomPhotoUrl} />
                                    </div>
                                    <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.6' }}>
                                        <div><strong>РНОКПП:</strong> {driver.rnokpp || '-'}</div>
                                        <div><strong>№ Посвідчення:</strong> {driver.driverLicense || '-'}</div>
                                        <div><strong>Email:</strong> {driver.email || '-'}</div>
                                    </div>
                                </div>

                                {/* 2. Автомобіль */}
                                {driver.car ? (
                                    <div style={{ flex: 2, minWidth: '300px' }}>
                                        <h4 style={{ color: '#388E3C', marginTop: 0 }}>
                                            🚘 {driver.car.make} {driver.car.model} ({driver.car.year})
                                        </h4>
                                        <div style={{ marginBottom: '10px' }}>
                                            <span style={{ background: '#333', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                {driver.car.plateNumber}
                                            </span>
                                            <span style={{ marginLeft: '10px', color: '#666' }}>Колір: {driver.car.color}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#777', marginBottom: '5px' }}>ДОКУМЕНТИ АВТО</div>
                                                <div style={{ display: 'flex' }}>
                                                    <PhotoPreview url={driver.car.techPassportFront} label="ТП (Лице)" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.techPassportBack} label="ТП (Тил)" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.insurancePhoto} label="Страховка" onZoom={setZoomPhotoUrl} />
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#777', marginBottom: '5px' }}>ФОТО АВТО</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                    <PhotoPreview url={driver.car.photoFront} label="Перед" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.photoBack} label="Зад" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.photoLeft} label="Ліво" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.photoRight} label="Право" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.photoSeatsFront} label="Салон (Пер)" onZoom={setZoomPhotoUrl} />
                                                    <PhotoPreview url={driver.car.photoSeatsBack} label="Салон (Зад)" onZoom={setZoomPhotoUrl} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ flex: 1, color: '#999', fontStyle: 'italic' }}>Автомобіль не вказано</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- МОДАЛКА ЗУМУ ФОТО --- */}
            {zoomPhotoUrl && (
                <div 
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'rgba(0,0,0,0.9)', zIndex: 9999, 
                        display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                    }}
                    onClick={() => setZoomPhotoUrl(null)}
                >
                    <img 
                        src={zoomPhotoUrl} 
                        style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', boxShadow: '0 0 20px rgba(255,255,255,0.2)' }} 
                        alt="Zoom" 
                    />
                    <div style={{ position: 'absolute', top: '20px', right: '30px', color: 'white', fontSize: '30px' }}>&times;</div>
                </div>
            )}

            {/* --- МОДАЛКА ОДОБРЕННЯ (ТАРИФИ) --- */}
            <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)} title="✅ Активація водія">
                <div style={{ padding: '10px' }}>
                    <p>Оберіть тарифи, доступні для цього водія:</p>
                    
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
                        {tariffs.map(tariff => (
                            <label key={tariff.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedTariffs.includes(tariff.id)}
                                    onChange={() => toggleTariff(tariff.id)}
                                    style={{ transform: 'scale(1.2)', marginRight: '10px' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{tariff.name}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>Базовий: {tariff.basePrice} грн</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button className="btn-secondary" onClick={() => setApproveModalOpen(false)}>Скасувати</button>
                        <button 
                            className="btn-primary" 
                            onClick={handleApproveSubmit}
                            style={{ backgroundColor: '#4CAF50' }}
                            disabled={selectedTariffs.length === 0}
                        >
                            Підтвердити
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- МОДАЛКА ВІДМОВИ --- */}
            <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="❌ Відхилення">
                <form onSubmit={handleRejectSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Причина відмови:</label>
                        <textarea
                            rows="4"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Наприклад: Нечитабельні фото техпаспорта..."
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn-secondary" onClick={() => setRejectModalOpen(false)}>Скасувати</button>
                        <button type="submit" className="btn-danger">Відхилити</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DriverRequestsPage;
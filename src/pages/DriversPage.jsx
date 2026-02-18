import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllDrivers, 
  createDriver, 
  updateDriver, 
  deleteDriver,
  blockDriverPermanently,
  blockDriverTemporarily,
  unblockDriver,
  changeDriverActivity,
  getDriverTransactions, // NEW
  manualBalanceUpdate // NEW
} from '../services/driverService';
import { getAllTariffs } from '../services/tariffService'; 

import Modal from '../components/Modal';
import DriverForm from '../components/DriverForm';

// --- ХЕЛПЕР: КОЛЬОРИ АКТИВНОСТІ ---
const getActivityColor = (score) => {
    const s = score !== undefined && score !== null ? score : 1000;
    
    if (s >= 701) return { color: '#2e7d32', bg: '#e8f5e9', label: 'Зелений (Високий)', barColor: '#4CAF50' };
    if (s >= 401) return { color: '#f9a825', bg: '#fffde7', label: 'Жовтий (Середній)', barColor: '#FFC107' };
    if (s >= 1) return { color: '#c62828', bg: '#ffebee', label: 'Червоний (Низький)', barColor: '#F44336' };
    return { color: '#fff', bg: '#333', label: 'ЗАБЛОКОВАНО', barColor: '#000' };
};

// --- КОМПОНЕНТ ФІНАНСІВ ВОДІЯ (НОВИЙ) ---
const WalletEditor = ({ driverId, currentBalance, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    // Завантаження історії при відкритті
    useEffect(() => {
        if (driverId) {
        loadHistory();
        }            
    }, [driverId]);

    const loadHistory = async () => {
        try {
            const data = await getDriverTransactions(driverId);
            setHistory(data);
        } catch (e) {
            console.error("Не вдалося завантажити історію", e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !description) return alert("Вкажіть суму та опис");

        setLoading(true);
        try {
            // Відправляємо amount як є (позитивне = плюс, негативне = мінус)
            const updatedDriver = await manualBalanceUpdate(driverId, parseFloat(amount), description);
            onUpdate(updatedDriver); // Оновлюємо батьківський компонент
            setAmount('');
            setDescription('');
            loadHistory(); // Оновлюємо таблицю історії
            alert('Баланс оновлено!');
        } catch (err) {
            alert(err.message || 'Помилка оновлення');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{marginTop: '20px'}}>
            <div style={{display:'flex', gap:'20px', alignItems:'flex-start'}}>
                {/* ЛІВА КОЛОНКА: БАЛАНС ТА ДІЇ */}
                <div style={{flex: 1, padding: '20px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9'}}>
                    <h3 style={{marginTop:0, color: '#2e7d32'}}>💰 Баланс: {currentBalance ? currentBalance.toFixed(2) : "0.00"} ₴</h3>
                    
                    <form onSubmit={handleSubmit} style={{marginTop:'15px', display:'flex', flexDirection:'column', gap:'10px'}}>
                        <label style={{fontSize:'14px', fontWeight:'bold'}}>Ручне коригування:</label>
                        <input 
                            type="number" 
                            step="0.01"
                            placeholder="Сума (напр. 100 або -50)" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            required
                            style={{padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
                        />
                        <input 
                            type="text" 
                            placeholder="Коментар (напр. Поповнення через термінал)" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            required
                            style={{padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
                        />
                        <button type="submit" disabled={loading} className="btn-primary" style={{background:'#2e7d32'}}>
                            {loading ? 'Обробка...' : 'Застосувати'}
                        </button>
                    </form>
                </div>

                {/* ПРАВА КОЛОНКА: ІСТОРІЯ */}
                <div style={{flex: 2, maxHeight:'300px', overflowY:'auto', border:'1px solid #eee', borderRadius:'8px'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead style={{background:'#f5f5f5', position:'sticky', top:0}}>
                            <tr>
                                <th style={{padding:'8px', textAlign:'left'}}>Дата</th>
                                <th style={{padding:'8px', textAlign:'left'}}>Тип</th>
                                <th style={{padding:'8px', textAlign:'right'}}>Сума</th>
                                <th style={{padding:'8px', textAlign:'left'}}>Опис</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(tx => (
                                <tr key={tx.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:'8px'}}>
    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}
</td>
                                    <td style={{padding:'8px'}}>{tx.operationType}</td>
                                    <td style={{padding:'8px', textAlign:'right', fontWeight:'bold', color: tx.amount >= 0 ? 'green' : 'red'}}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₴
                                    </td>
                                    <td style={{padding:'8px', color:'#555'}}>{tx.description}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{padding:'10px', textAlign:'center'}}>Історія порожня</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- КОМПОНЕНТ РЕДАГУВАННЯ АКТИВНОСТІ ---
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
            alert('Бали успішно оновлено!');
        } catch (err) {
            alert(err.message || 'Помилка оновлення');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{marginTop: '15px', padding: '15px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee'}}>
            <h4 style={{marginTop:0, marginBottom:'10px', fontSize:'16px'}}>🛠 Ручне коригування балів</h4>
            <form onSubmit={handleSubmit} style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'12px', color:'#666', marginBottom:'4px'}}>Бали (+/-)</label>
                    <input 
                        type="number" 
                        placeholder="-50 або 10" 
                        value={points} 
                        onChange={e => setPoints(e.target.value)}
                        required
                        style={{width:'100px', padding:'8px', borderRadius:'4px', border:'1px solid #ddd'}}
                    />
                </div>
                <div style={{display:'flex', flexDirection:'column', flexGrow:1}}>
                    <label style={{fontSize:'12px', color:'#666', marginBottom:'4px'}}>Причина зміни</label>
                    <input 
                        type="text" 
                        placeholder="Напр: Скарга клієнта або Бонус за роботу" 
                        value={reason} 
                        onChange={e => setReason(e.target.value)}
                        required
                        style={{padding:'8px', borderRadius:'4px', border:'1px solid #ddd'}}
                    />
                </div>
                <div style={{display:'flex', alignItems:'end'}}>
                    <button type="submit" disabled={loading} className="btn-primary" style={{height:'35px', marginTop:'auto'}}>
                        {loading ? '...' : 'Зберегти'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- КОМПОНЕНТ ДЕТАЛЬНОГО ПЕРЕГЛЯДУ (FULL SCREEN) ---
const DriverDetailsModal = ({ driver, isOpen, onClose, onDriverUpdated }) => {
    const [isCarsExpanded, setIsCarsExpanded] = useState(true);

    if (!isOpen || !driver) return null;

    const actInfo = getActivityColor(driver.activityScore);

    const renderStars = (score) => {
        const rounded = Math.round(score || 0);
        return "★".repeat(rounded) + "☆".repeat(5 - rounded);
    };

    const fullScreenOverlayStyle = {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: '#f4f4f9', zIndex: 2000, overflowY: 'auto',
        display: 'flex', flexDirection: 'column'
    };

    const headerStyle = {
        backgroundColor: '#1E1E1E', color: '#fff', padding: '15px 30px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    };

    const contentContainerStyle = {
        padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box'
    };

    const cardStyle = {
        backgroundColor: '#fff', borderRadius: '8px', padding: '25px', marginBottom: '30px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
    };

    const sectionTitleStyle = {
        borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px',
        color: '#333', marginTop: 0, fontSize: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    };

    const rowStyle = { display: 'flex', marginBottom: '12px', borderBottom: '1px dashed #eee', paddingBottom: '8px' };
    const labelStyle = { fontWeight: 'bold', width: '200px', color: '#555' };
    const valueStyle = { color: '#000', fontWeight: '500' };

    const PhotoBlock = ({ label, url }) => (
        <div style={{marginRight: '20px', marginBottom: '20px', textAlign: 'center'}}>
            <div style={{fontSize:'12px', color:'#555', marginBottom:'8px', fontWeight:'bold'}}>{label}</div>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={label} style={{width:'160px', height:'110px', objectFit:'cover', borderRadius:'8px', border:'1px solid #ddd', cursor: 'zoom-in'}} />
                </a>
            ) : (
                <div style={{width:'160px', height:'110px', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', color:'#999', fontSize:'12px', borderRadius:'8px', border: '1px dashed #ccc'}}>
                    Немає
                </div>
            )}
        </div>
    );

    const carsList = driver.cars || (driver.car ? [driver.car] : []);

    return (
        <div style={fullScreenOverlayStyle}>
            <div style={headerStyle}>
                <div style={{fontSize: '24px', fontWeight: 'bold'}}>
                    👤 Картка водія: <span style={{color: '#4CAF50'}}>{driver.fullName}</span>
                </div>
                <button style={{background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'}} onClick={onClose}>Закрити ✕</button>
            </div>

            <div style={contentContainerStyle}>
                
                {/* 1. Основна інформація */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Особисті дані</h3>
                    <div style={{display:'flex', gap:'40px', alignItems: 'flex-start'}}>
                        <div style={{flexShrink:0, textAlign: 'center'}}>
                            {driver.photoUrl ? (
                                <img src={driver.photoUrl} alt="Avatar" style={{width:'150px', height:'150px', borderRadius:'50%', objectFit:'cover', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}} />
                            ) : (
                                <div style={{width:'150px', height:'150px', background:'#ddd', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>Немає фото</div>
                            )}
                            <div style={{marginTop: '15px'}}>
                                <span style={{padding: '5px 10px', borderRadius: '15px', background: driver.isOnline ? '#e8f5e9' : '#ffebee', color: driver.isOnline ? '#2e7d32' : '#c62828', fontWeight: 'bold'}}>
                                    {driver.isOnline ? '🟢 ONLINE' : '⚪ OFFLINE'}
                                </span>
                            </div>
                        </div>

                        <div style={{flexGrow:1}}>
                            <div style={rowStyle}><span style={labelStyle}>ID в системі:</span> <span style={valueStyle}>{driver.id}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Номер телефону:</span> <span style={valueStyle}>{driver.phoneNumber}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Email:</span> <span style={valueStyle}>{driver.email || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>РНОКПП:</span> <span style={valueStyle}>{driver.rnokpp || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Посвідчення:</span> <span style={valueStyle}>{driver.driverLicense || '-'}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Баланс:</span> <span style={{...valueStyle, color: (driver.balance || 0) < 0 ? 'red' : 'green', fontSize: '18px'}}>{(driver.balance || 0).toFixed(2)} ₴</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Статус блоку:</span> 
                                {driver.isBlocked ? <span style={{color: 'red', fontWeight:'bold'}}>ЗАБЛОКОВАНИЙ</span> : 
                                 driver.tempBlockExpiresAt ? <span style={{color: 'orange', fontWeight:'bold'}}>Тимчасово до {new Date(driver.tempBlockExpiresAt).toLocaleString()}</span> : 
                                 <span style={{color: 'green'}}>Активний</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. НОВИЙ БЛОК: ГАМАНЕЦЬ */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>💳 Гаманець та Транзакції</h3>
                    <WalletEditor 
                        driverId={driver.id} 
                        currentBalance={driver.balance} 
                        onUpdate={onDriverUpdated} 
                    />
                </div>

                {/* 3. Медичні особливості */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>🏥 Медичні особливості</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {(!driver.hasMovementIssue && !driver.hasHearingIssue && !driver.isDeaf && !driver.hasSpeechIssue) ? (
                            <div style={{ color: '#666', fontStyle: 'italic', padding: '10px 0' }}>Немає інформації про порушення функцій (Здоровий)</div>
                        ) : (
                            <>
                                {driver.hasMovementIssue && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#FFEBEE', color: '#D32F2F', borderRadius: '24px', border: '1px solid #FFCDD2', fontWeight: '600' }}>
                                        <span style={{ fontSize: '20px' }}>♿</span> Порушення опорно-рухового апарату
                                    </div>
                                )}
                                {driver.hasHearingIssue && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#FFF3E0', color: '#EF6C00', borderRadius: '24px', border: '1px solid #FFE0B2', fontWeight: '600' }}>
                                        <span style={{ fontSize: '20px' }}>🦻</span> Порушення слуху
                                    </div>
                                )}
                                {driver.isDeaf && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#FFF8E1', color: '#FF8F00', borderRadius: '24px', border: '1px solid #FFECB3', fontWeight: '700' }}>
                                        <span style={{ fontSize: '20px' }}>🔇</span> Глухонімий
                                    </div>
                                )}
                                {driver.hasSpeechIssue && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#E3F2FD', color: '#1976D2', borderRadius: '24px', border: '1px solid #BBDEFB', fontWeight: '600' }}>
                                        <span style={{ fontSize: '20px' }}>🗣️</span> Порушення мовлення
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 4. Рейтинг */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>⭐ Рейтинг та Відгуки</h3>
                    <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                        <div style={{fontSize: '48px', fontWeight: 'bold', color: '#FFD700', textShadow: '1px 1px 2px rgba(0,0,0,0.1)'}}>
                            {driver.rating ? driver.rating.toFixed(2) : "5.00"}
                        </div>
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <div style={{fontSize: '24px', color: '#FFD700', letterSpacing: '2px'}}>
                                {renderStars(driver.rating || 5)}
                            </div>
                            <div style={{color: '#666', fontSize: '14px', marginTop: '4px'}}>
                                На основі {driver.ratingCount || 0} оцінок
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. БЛОК АКТИВНОСТІ */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>📊 Активність водія</h3>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px'}}>
                        <div>
                            <div style={{fontSize: '32px', fontWeight: 'bold', color: actInfo.color}}>
                                {driver.activityScore !== undefined ? driver.activityScore : 1000}
                                <span style={{fontSize: '16px', color: '#666', fontWeight: 'normal'}}> / 1000</span>
                            </div>
                            <div style={{display: 'inline-block', marginTop: '5px', padding: '4px 12px', borderRadius: '12px', backgroundColor: actInfo.bg, color: actInfo.color, fontWeight: 'bold', border: `1px solid ${actInfo.color}`}}>
                                {actInfo.label}
                            </div>
                        </div>
                        <div style={{width: '60%', background: '#eee', height: '20px', borderRadius: '10px', overflow: 'hidden'}}>
                            <div style={{width: `${Math.max(0, Math.min((driver.activityScore || 1000) / 10, 100))}%`, height: '100%', background: actInfo.barColor, transition: 'width 0.5s ease-in-out'}}></div>
                        </div>
                    </div>
                    <ActivityEditor 
                        driverId={driver.id} 
                        currentScore={driver.activityScore} 
                        onUpdate={onDriverUpdated} 
                    />
                </div>

                {/* 6. АВТОМОБІЛІ */}
                <div style={cardStyle}>
                    <div 
                        style={{...sectionTitleStyle, cursor: 'pointer', marginBottom: isCarsExpanded ? '20px' : '0', borderBottom: isCarsExpanded ? '2px solid #eee' : 'none'}}
                        onClick={() => setIsCarsExpanded(!isCarsExpanded)}
                    >
                        <span>🚘 Автопарк водія ({carsList.length})</span>
                        <span style={{fontSize: '18px', color: '#666'}}>{isCarsExpanded ? '▲' : '▼'}</span>
                    </div>

                    {isCarsExpanded && (
                        <div>
                            {carsList.length > 0 ? carsList.map((car, index) => (
                                <div key={car.id || index} style={{
                                    border: '1px solid #ddd', 
                                    borderRadius: '8px', 
                                    padding: '20px', 
                                    marginBottom: '20px',
                                    backgroundColor: car.status === 'ACTIVE' ? '#f0fdf4' : '#fafafa',
                                    borderLeft: car.status === 'ACTIVE' ? '5px solid #4CAF50' : '1px solid #ddd'
                                }}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                                        <div>
                                            <h3 style={{margin:'0 0 5px 0', fontSize:'18px'}}>
                                                {car.make} {car.model}
                                                {car.status === 'ACTIVE' && <span style={{color:'green', marginLeft:'10px', fontSize:'14px', fontWeight:'normal'}}>(АКТИВНЕ)</span>}
                                            </h3>
                                            <div style={{fontSize:'12px', color:'#777'}}>ID: {car.id}</div>
                                        </div>
                                        <div style={{textAlign:'right'}}>
                                            <div style={{background: '#333', color:'#fff', padding: '4px 12px', borderRadius:'4px', fontSize:'16px', fontWeight:'bold', letterSpacing:'1px'}}>{car.plateNumber}</div>
                                            <div style={{marginTop:'5px', fontSize:'12px', fontWeight:'bold', color: car.status==='REJECTED'?'red':car.status==='PENDING'?'orange':'green'}}>
                                                {car.status}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px', marginBottom:'20px', fontSize:'14px'}}>
                                        <div>Колір: <b>{car.color}</b></div>
                                        <div>Рік випуску: <b>{car.year}</b></div>
                                        <div>Тип кузова: <b>{car.carType}</b></div>
                                        <div>VIN-код: <b>{car.vin || 'Не вказано'}</b></div>
                                    </div>
                                    <div style={{background:'#fff', padding:'15px', borderRadius:'8px', border:'1px solid #eee'}}>
                                        <h5 style={{marginTop:0, marginBottom:'10px', color:'#1976D2', borderBottom:'1px solid #e3f2fd', paddingBottom:'5px'}}>📂 Документи</h5>
                                        <div style={{display:'flex', flexWrap:'wrap'}}>
                                            <PhotoBlock label="Тех. паспорт (Перед)" url={car.techPassportFront} />
                                            <PhotoBlock label="Тех. паспорт (Зад)" url={car.techPassportBack} />
                                            <PhotoBlock label="Страховка" url={car.insurancePhoto} />
                                        </div>
                                        <h5 style={{marginTop:'15px', marginBottom:'10px', color:'#388E3C', borderBottom:'1px solid #e8f5e9', paddingBottom:'5px'}}>🚗 Екстер'єр</h5>
                                        <div style={{display:'flex', flexWrap:'wrap'}}>
                                            <PhotoBlock label="Спереду" url={car.photoFront} />
                                            <PhotoBlock label="Ззаду" url={car.photoBack} />
                                            <PhotoBlock label="Зліва" url={car.photoLeft} />
                                            <PhotoBlock label="Справа" url={car.photoRight} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{color:'#999', textAlign:'center', padding:'20px'}}>Автомобілі не призначено</p>
                            )}
                        </div>
                    )}
                </div>

                {/* 7. Тарифи */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Доступні тарифи</h3>
                    <div>
                        {driver.allowedTariffs && driver.allowedTariffs.length > 0 ? (
                            driver.allowedTariffs.map(t => (
                                <span key={t.id} style={{display:'inline-block', background:'#e3f2fd', color:'#1565c0', padding:'8px 16px', borderRadius:'20px', marginRight:'10px', marginBottom:'10px', fontSize:'14px', fontWeight:'bold', border: '1px solid #90caf9'}}>
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

// --- ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ ---
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
      driver.phoneNumber.includes(searchTerm) || 
      driver.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

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

  const handleRowDoubleClick = (driver) => {
      setDetailsDriver(driver);
  };
  const closeDetails = () => {
      setDetailsDriver(null);
  };

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
              <th>Баланс</th> {/* НОВА КОЛОНКА */}
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
                  
                  {/* НОВА КОЛОНКА БАЛАНС */}
                  <td style={{fontWeight: 'bold', color: (driver.balance || 0) < 0 ? 'red' : '#2e7d32'}}>
                      {(driver.balance || 0).toFixed(2)} ₴
                  </td>

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
      />
    </div>
  );
};



export default DriversPage;
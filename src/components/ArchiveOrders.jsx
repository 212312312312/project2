import React, { useState, useEffect } from 'react';
import '../assets/TableStyles.css';

// Импорт необходимых сервисов из orderService
import { getArchivedOrders, searchArchiveByPhone, getCancellationStats, getOrderTrackHistory } from '../services/orderService';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';


// --- ИКОНКИ ---
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
const waypointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});

const driverHistoryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});
// Розумне визначення етапу замовлення на основі часу конкретного тика координат
const getTimelineStatus = (tickTimeStr, order) => {
  if (!tickTimeStr || !order) return { text: 'Дані відсутні', color: '#6c757d' };
  const tickTime = new Date(tickTimeStr);
  
  const arrived = order.arrivedAt ? new Date(order.arrivedAt) : null;
  const started = order.startedAt ? new Date(order.startedAt) : null;
  const completed = order.completedAt ? new Date(order.completedAt) : null;

  if (completed && tickTime >= completed) {
    return { text: '🏁 Поїздку завершено', color: '#212529' };
  }
  if (started && tickTime >= started) {
    return { text: '🟢 У дорозі з пасажиром', color: '#2b8a3e' };
  }
  if (arrived && tickTime >= arrived) {
    return { text: '🔵 Водій на місці (Очікування)', color: '#1c7ed6' };
  }
  return { text: '🟡 Водій їде до клієнта', color: '#fcc419' };
};
// --- Focus Controller ---
const MapFocusController = ({ order }) => {
  const map = useMap();
  useEffect(() => {
    if (order && order.originLat && order.destLat) {
      const bounds = [
        [order.originLat, order.originLng],
        [order.destLat, order.destLng]
      ];
      if (order.stops && order.stops.length > 0) {
        order.stops.forEach(stop => {
            if (stop.lat && stop.lng) bounds.push([stop.lat, stop.lng]);
        });
      }
      try {
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch(e) {}
    }
  }, [order, map]);
  return null;
};

const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('uk-UA', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

const ArchiveOrders = () => {
  const [allOrders, setAllOrders] = useState([]); 
  const [filteredOrders, setFilteredOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackHistory, setTrackHistory] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const [dateFrom, setDateFrom] = useState(getTodayStr());
  const [dateTo, setDateTo] = useState(getTodayStr());


  useEffect(() => {
    if (selectedOrder) {
      getOrderTrackHistory(selectedOrder.idLong || selectedOrder.id)
        .then(res => {
          setTrackHistory(res);
          if (res && res.length > 0) {
            setCurrentTrackIndex(res.length - 1); // Ставимо повзунок в кінець за замовчуванням
          } else {
            setCurrentTrackIndex(0);
          }
        })
        .catch(err => console.error("Помилка історії координат:", err));
    } else {
      setTrackHistory([]);
      setCurrentTrackIndex(0);
    }
  }, [selectedOrder]);
  useEffect(() => {
    if (selectedOrder) {
      getOrderTrackHistory(selectedOrder.idLong || selectedOrder.id)
        .then(res => {
          setTrackHistory(res);
          if (res && res.length > 0) {
            setCurrentTrackIndex(res.length - 1); // По умолчанию ставим ползунок на финальную точку
          } else {
            setCurrentTrackIndex(0);
          }
        })
        .catch(err => console.error("Помилка історії координат:", err));
    } else {
      setTrackHistory([]);
      setCurrentTrackIndex(0);
    }
  }, [selectedOrder]);

  const [stats, setStats] = useState({ completed: 0, cancelled: 0, total: 0, sum: 0 });

  // Стейт для модалки статистики
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [cancelStatsData, setCancelStatsData] = useState([]);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getArchivedOrders();
      const sorted = data.sort((a, b) => b.id - a.id);
      setAllOrders(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  useEffect(() => {
    if (!allOrders.length) {
        setFilteredOrders([]);
        setStats({ completed: 0, cancelled: 0, total: 0, sum: 0 });
        return;
    }

    let result = allOrders;

    if (searchTerm) {
        result = result.filter(o => o.client.phoneNumber.includes(searchTerm));
    }

    if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        from.setHours(0,0,0,0);
        
        const to = new Date(dateTo);
        to.setHours(23,59,59,999);

        result = result.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= from && orderDate <= to;
        });
    }

    setFilteredOrders(result);

    let comp = 0, canc = 0, money = 0;
    result.forEach(o => {
        if (o.status === 'COMPLETED') {
            comp++;
            money += o.price;
        } else if (o.status === 'CANCELLED') {
            canc++;
        }
    });
    setStats({ completed: comp, cancelled: canc, total: result.length, sum: money });

  }, [allOrders, searchTerm, dateFrom, dateTo]);


  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      fetchArchive();
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await searchArchiveByPhone(searchTerm);
      setAllOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setDateFilter = (days) => {
      if (days === -1) {
          setDateFrom('');
          setDateTo('');
          return;
      }

      const end = new Date();
      const start = new Date();
      
      if (days === 0) { 
      } else if (days === 1) { 
         start.setDate(start.getDate() - 1);
         end.setDate(end.getDate() - 1);
      } else {
         start.setDate(start.getDate() - days);
      }
      
      setDateFrom(start.toISOString().split('T')[0]);
      setDateTo(end.toISOString().split('T')[0]);
  };

  const handleOpenStats = async () => {
    try {
        const data = await getCancellationStats();
        setCancelStatsData(data);
        setStatsModalOpen(true);
    } catch (err) {
        alert(err.message);
    }
  };

  // --- РЕНДЕР: ДЕТАЛЬНИЙ ПЕРЕГЛЯД ---
  if (selectedOrder) {
    const isCancelled = selectedOrder.status === 'CANCELLED';

    let distKm = 0;
    let pricePerKm = 0;
    if (selectedOrder.distanceMeters && selectedOrder.distanceMeters > 0) {
        distKm = selectedOrder.distanceMeters / 1000;
        pricePerKm = selectedOrder.price / distKm;
    }
    let plannedRoutePath = [];
    if (selectedOrder.originLat && selectedOrder.originLng) {
        // 1. Добавляем точку старта (А)
        plannedRoutePath.push([selectedOrder.originLat, selectedOrder.originLng]);
        
        // 2. Добавляем все промежуточные точки (Stops)
        if (selectedOrder.stops && selectedOrder.stops.length > 0) {
            // Сортируем на всякий случай по порядку, если сервер прислал иначе
            const sortedStops = [...selectedOrder.stops].sort((a, b) => a.stopOrder - b.stopOrder);
            sortedStops.forEach(stop => {
                if (stop.lat && stop.lng) plannedRoutePath.push([stop.lat, stop.lng]);
            });
        }
        
        // 3. Добавляем точку финиша (Б)
        if (selectedOrder.destLat && selectedOrder.destLng) {
            plannedRoutePath.push([selectedOrder.destLat, selectedOrder.destLng]);
        }
    }
    // Расчет времени выполнения или времени ожидания до отмены
    const calculateDuration = (start, end) => {
        if (!start || !end) return '—';
        const diffMs = new Date(end) - new Date(start);
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins} хв ${diffSecs} с`;
    };

    return (
        <div className="detail-view-container" style={{ 
            padding: '20px', 
            height: 'calc(100vh - 80px)', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden' 
        }}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button 
                    onClick={() => setSelectedOrder(null)} 
                    className="btn-secondary"
                    style={{ padding: '8px 20px', fontSize: '16px', cursor: 'pointer' }}
                >
                    ← Назад
                </button>
                
                <h2>Замовлення #{selectedOrder.id}</h2>

                <span style={{ 
                    backgroundColor: isCancelled ? '#d32f2f' : '#388e3c', 
                    color: '#fff', 
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    {isCancelled ? 'СКАСОВАНО' : 'ВИКОНАНО'}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                
                <div style={{ 
    width: '420px', 
    backgroundColor: '#ffffff', 
    border: '1px solid #dee2e6', 
    borderRadius: '10px', 
    padding: '20px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px',
    maxHeight: '100%',
    overflowY: 'auto'
}}>
    {/* Заголовок замовлення та Тариф */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f3f5', paddingBottom: '12px' }}>
        <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#868e96', textTransform: 'uppercase', tracking: '1px' }}>Замовлення</span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#212529' }}>#{selectedOrder.idLong || selectedOrder.id}</h2>
        </div>
        <span style={{ 
            backgroundColor: '#212529', 
            color: '#fff', 
            padding: '6px 14px', 
            borderRadius: '6px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold',
            textTransform: 'uppercase'
        }}>
            ✨ {selectedOrder.tariff || 'Стандарт'}
        </span>
    </div>

    {/* Блок 1: Учасники поїздки */}
    <div style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fdfdfd' }}>
        <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#adb5bd', textTransform: 'uppercase', marginBottom: '4px' }}>Пасажир</div>
            <div style={{ fontWeight: '700', color: '#495057', fontSize: '1rem' }}>{selectedOrder.clientName || selectedOrder.client?.fullName || 'Гість'}</div>
            <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '2px' }}>📞 {selectedOrder.clientPhone || selectedOrder.client?.phoneNumber || '—'}</div>
        </div>
        
        <div style={{ borderTop: '1px dashed #e9ecef', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#adb5bd', textTransform: 'uppercase', marginBottom: '4px' }}>Водій та Авто</div>
            {selectedOrder.driver ? (
                <>
                    <div style={{ fontWeight: '700', color: '#495057', fontSize: '1rem' }}>{selectedOrder.driver.fullName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>📞 {selectedOrder.driver.phoneNumber || '—'}</span>
                        <span style={{ backgroundColor: '#e9ecef', color: '#212529', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #ced4da' }}>
                            {selectedOrder.carNumber || selectedOrder.driver.carLicensePlate || 'AA1111AA'}
                        </span>
                    </div>
                </>
            ) : (
                <div style={{ color: '#aeb5bd', fontStyle: 'italic', fontSize: '0.95rem' }}>Водія не було призначено</div>
            )}
        </div>
    </div>

    {/* Блок 2: Маршрут */}
    <div style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#adb5bd', textTransform: 'uppercase' }}>Маршрут поїздки</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ backgroundColor: '#e6fcf5', color: '#2b8a3e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '3px' }}>А</span>
            <div style={{ fontSize: '0.95rem', color: '#343a40', fontWeight: '500' }}>{selectedOrder.fromAddress}</div>
        </div>
        {selectedOrder.stops && selectedOrder.stops.map((stop, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingLeft: '8px', borderLeft: '2px dashed #ced4da' }}>
                <span style={{ backgroundColor: '#fff9db', color: '#fcc419', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>•</span>
                <div style={{ fontSize: '0.9rem', color: '#495057' }}>{stop.address}</div>
            </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ backgroundColor: '#fff5f5', color: '#c92a2a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '3px' }}>Б</span>
            <div style={{ fontSize: '0.95rem', color: '#343a40', fontWeight: '500' }}>{selectedOrder.toAddress}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f3f5', paddingTop: '8px', marginTop: '4px', fontSize: '0.85rem', color: '#6c757d' }}>
            <span>Відстань: <b>{selectedOrder.distance || '0'} км</b></span>
            <span>Тариф за км: <b>{selectedOrder.pricePerKm || '—'} грн/км</b></span>
        </div>
    </div>

    {/* Блок 3: Хронологія */}
    <div style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8f9fa' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#adb5bd', textTransform: 'uppercase', marginBottom: '2px' }}>Таймлайни подій</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#495057' }}>
            <span>📅 Створено:</span>
            <span style={{ fontWeight: '500' }}>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('uk-UA') : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#495057' }}>
            <span>🚀 Старт поїздки:</span>
            <span style={{ fontWeight: '500' }}>{selectedOrder.startedAt ? new Date(selectedOrder.startedAt).toLocaleString('uk-UA') : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#495057' }}>
            <span>🏁 Завершено:</span>
            <span style={{ fontWeight: '500' }}>{selectedOrder.completedAt ? new Date(selectedOrder.completedAt).toLocaleString('uk-UA') : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ced4da', paddingTop: '6px', marginTop: '2px', fontSize: '0.9rem', fontWeight: 'bold', color: '#212529' }}>
            <span>⏱️ Час виконання:</span>
            <span>{selectedOrder.duration || '0 хв'}</span>
        </div>
    </div>

    {/* Блок 4: Вартість та оплата */}
    <div style={{ border: '2px solid #212529', borderRadius: '8px', padding: '16px', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#868e96', textTransform: 'uppercase' }}>Спосіб оплати</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#212529', marginTop: '2px' }}>
                {selectedOrder.paymentMethod === 'CASH' ? '💵 Готівка' : '💳 Картка'}
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#868e96', textTransform: 'uppercase' }}>Вартість</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#2b8a3e', lineHeight: '1' }}>
                {selectedOrder.price || '0'} ₴
            </div>
        </div>
    </div>
</div>

                <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Карта ізольована на рівні z-index: 1 */}
                    <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                        <MapContainer center={[50.45, 30.52]} zoom={11} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {selectedOrder.originLat && (
                                <Marker position={[selectedOrder.originLat, selectedOrder.originLng]} icon={originIcon}>
                                    <Popup>Звідки: {selectedOrder.fromAddress}</Popup>
                                </Marker>
                            )}
                            {selectedOrder.destLat && (
                                <Marker position={[selectedOrder.destLat, selectedOrder.destLng]} icon={destIcon}>
                                    <Popup>Куди: {selectedOrder.toAddress}</Popup>
                                </Marker>
                            )}
                            {selectedOrder.stops && selectedOrder.stops.map((s, i) => (
                                 <Marker key={i} position={[s.lat, s.lng]} icon={waypointIcon}>
                                     <Popup>{s.address}</Popup>
                                 </Marker>
                            ))}

                            {/* Загальний фактичний маршрут (сірий пунктир) */}
                            {trackHistory.length > 0 && (
                                <Polyline 
                                    positions={trackHistory.map(p => [p.lat, p.lng])} 
                                    color="#9e9e9e" 
                                    weight={3} 
                                    dashArray="5, 5"
                                />
                            )}    

                            {/* Лінія пройденого шляху строго до поточного стану слайдера */}
                            {trackHistory.length > 0 && (
                                <Polyline 
                                    positions={trackHistory.slice(0, currentTrackIndex + 1).map(p => [p.lat, p.lng])} 
                                    color="#d32f2f" 
                                    weight={5} 
                                />
                            )}

                            {/* Історичний маркер машини */}
                            {trackHistory.length > 0 && trackHistory[currentTrackIndex] && (
                                <Marker 
                                    position={[trackHistory[currentTrackIndex].lat, trackHistory[currentTrackIndex].lng]} 
                                    icon={driverHistoryIcon}
                                >
                                    <Popup>
                                        🚗 Водій був тут об:<br/>
                                        <strong>{new Date(trackHistory[currentTrackIndex].timestamp).toLocaleTimeString('uk-UA')}</strong>
                                    </Popup>
                                </Marker>
                            )}

                            <MapFocusController order={selectedOrder} />
                        </MapContainer>
                    </div>

                    {/* 🔥 ПАНЕЛЬ КЕРУВАННЯ ТАЙМЛАЙНОМ З ВИСОКИМ Z-INDEX */}
                    {trackHistory.length > 0 && (
                        <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '15px', 
                            borderTop: '1px solid #ccc',
                            position: 'relative',
                            zIndex: 9999
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#333' }}>
                                    ⏱️ Хронологія поїздки (Тик {currentTrackIndex + 1} з {trackHistory.length})
                                </span>
                                
                                {/* Інтерактивний кольоровий бейдж статусу поїздки */}
                                {trackHistory[currentTrackIndex] && (() => {
                                    const currentStatus = getTimelineStatus(trackHistory[currentTrackIndex].timestamp, selectedOrder);
                                    return (
                                        <span style={{
                                            backgroundColor: currentStatus.color,
                                            color: currentStatus.color === '#fcc419' ? '#000' : '#fff',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}>
                                            {currentStatus.text}
                                        </span>
                                    );
                                })()}
                            </div>

                            <input 
                                type="range" 
                                min="0" 
                                max={trackHistory.length - 1} 
                                value={currentTrackIndex} 
                                onChange={(e) => setCurrentTrackIndex(Number(e.target.value))}
                                style={{ 
                                    width: '100%', 
                                    cursor: 'pointer', 
                                    accentColor: '#d32f2f',
                                    position: 'relative',
                                    zIndex: 10000
                                }}
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.85rem', color: '#666' }}>
                                <span>Точний час тика: <b>{new Date(trackHistory[currentTrackIndex]?.timestamp).toLocaleTimeString('uk-UA')}</b></span>
                                <span>Дата: <b>{new Date(trackHistory[currentTrackIndex]?.timestamp).toLocaleDateString('uk-UA')}</b></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  }

  // --- РЕНДЕР: ТАБЛИЦЯ ---
  if (loading && allOrders.length === 0) return <div>Завантаження архіву...</div>;

  return (
    <div className="table-page-container">
      
      {/* ХЕДЕР СТОРІНКИ */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <h2 style={{margin: 0}}>Архів Замовлень</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handleOpenStats}>
                📊 Статистика скасувань
            </button>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
                ℹ️ Подвійний клік по рядку відкриває деталі
            </div>
          </div>
      </div>

      {/* ПАНЕЛЬ КЕРУВАННЯ (Фільтри + Статистика) */}
      <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '20px', 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ddd'
      }}>
          
          {/* 1. Блок фільтрів */}
          <div style={{flex: 2, minWidth: '300px'}}>
              <h4 style={{marginTop: 0, marginBottom: '10px'}}>📅 Період та пошук</h4>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={e => setDateFrom(e.target.value)} 
                    style={{padding: '6px', borderRadius: '4px', border: '1px solid #ccc'}} 
                  />
                  <span style={{alignSelf: 'center'}}>—</span>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={e => setDateTo(e.target.value)} 
                    style={{padding: '6px', borderRadius: '4px', border: '1px solid #ccc'}} 
                  />
              </div>

              <div style={{display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap'}}>
                  <button className="btn-secondary" style={{fontSize: '0.8rem', padding: '4px 8px'}} onClick={() => setDateFilter(0)}>Сьогодні</button>
                  <button className="btn-secondary" style={{fontSize: '0.8rem', padding: '4px 8px'}} onClick={() => setDateFilter(1)}>Вчора</button>
                  <button className="btn-secondary" style={{fontSize: '0.8rem', padding: '4px 8px'}} onClick={() => setDateFilter(7)}>Тиждень</button>
                  <button className="btn-secondary" style={{fontSize: '0.8rem', padding: '4px 8px'}} onClick={() => setDateFilter(30)}>Місяць</button>
                  <button className="btn-secondary" style={{fontSize: '0.8rem', padding: '4px 8px'}} onClick={() => setDateFilter(90)}>3 міс.</button>
                  
                  <button 
                    className="btn-secondary" 
                    style={{fontSize: '0.8rem', padding: '4px 8px', backgroundColor: '#6c757d', color: 'white'}} 
                    onClick={() => setDateFilter(-1)}
                  >
                    За весь час
                  </button>
              </div>

              <form onSubmit={handleSearch} style={{display: 'flex', gap: '10px'}}>
                  <input
                    type="text"
                    placeholder="🔍 Пошук за телефоном..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{flex: 1}}
                  />
                  <button type="submit" className="btn-primary">Знайти</button>
              </form>
          </div>

          {/* 2. Блок Статистики */}
          <div style={{
              flex: 1, 
              minWidth: '200px', 
              backgroundColor: '#fff', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #eee',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
              <h4 style={{marginTop: 0, marginBottom: '10px', color: '#333'}}>📊 Статистика за період</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.95rem'}}>
                  <div>Всього замовлень: <strong>{stats.total}</strong></div>
                  <div style={{color: '#388e3c'}}>✅ Виконано: <strong>{stats.completed}</strong></div>
                  <div style={{color: '#d32f2f'}}>❌ Скасовано: <strong>{stats.cancelled}</strong></div>
                  <hr style={{width: '100%', border: '0', borderTop: '1px solid #eee', margin: '5px 0'}}/>
                  <div style={{fontSize: '1.1rem'}}>💰 Сума: <strong>{Math.round(stats.sum)} ₴</strong></div>
              </div>
          </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Статус</th>
              <th>Створено</th>
              <th>Завершено</th>
              <th>Клієнт</th>
              <th>Водій</th>
              <th>Звідки</th>
              <th>Дод. точки</th>
              <th>Куди</th>
              <th>Ціна</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr 
                    key={order.id} 
                    onDoubleClick={() => setSelectedOrder(order)}
                    style={{ cursor: 'pointer' }}
                    title="Двічі клікніть для деталей"
                    className="archive-row"
                >
                  <td>{order.id}</td>
                  <td>
                    <span style={{ 
                      color: order.status === 'CANCELLED' ? 'red' : 'green', 
                      fontWeight: 'bold', fontSize: '0.9em'
                    }}>
                      {order.status === 'CANCELLED' ? 'СКАС' : 'ОК'}
                    </span>
                  </td>
                  
                  <td style={{ fontSize: '0.85em' }}>{formatDate(order.createdAt)}</td>
                  <td style={{ fontSize: '0.85em' }}>{formatDate(order.completedAt)}</td>

                  <td>{order.client.phoneNumber}</td>
                  <td>{order.driver ? order.driver.fullName : '—'}</td>
                  
                  <td>{order.fromAddress}</td>
                  <td style={{ fontSize: '0.85em', color: '#555', fontStyle: 'italic', maxWidth: '150px' }}>
                      {order.formattedWaypoints ? order.formattedWaypoints : '—'}
                  </td>
                  <td>{order.toAddress}</td>
                  <td><strong>{Math.round(order.price)} ₴</strong></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{textAlign: 'center', padding: '20px'}}>
                    Записів не знайдено за вказаними фільтрами.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- МОДАЛЬНЕ ВІКНО СТАТИСТИКИ СКАСУВАНЬ --- */}
      {statsModalOpen && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content" style={{ maxWidth: '500px' }}>
                  <div className="modal-header">
                      <h3>📊 Статистика скасувань (Загальна)</h3>
                      <button className="close-button" onClick={() => setStatsModalOpen(false)}>&times;</button>
                  </div>
                  <div className="modal-body" style={{ marginTop: '15px' }}>
                      {cancelStatsData.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#666' }}>Немає даних про скасовані замовлення з вказаною причиною.</p>
                      ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                              <thead style={{ backgroundColor: '#f4f4f4' }}>
                                  <tr>
                                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Причина</th>
                                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '100px' }}>Кількість</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {cancelStatsData.map((stat, index) => (
                                      <tr key={index}>
                                          <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{stat.reason}</td>
                                          <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                                              {stat.count}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                      <button 
                          className="btn-secondary" 
                          style={{ marginTop: '20px', width: '100%', padding: '10px' }} 
                          onClick={() => setStatsModalOpen(false)}
                      >
                          Закрити
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ArchiveOrders;
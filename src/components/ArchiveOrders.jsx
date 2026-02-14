import React, { useState, useEffect } from 'react';
import { getArchivedOrders, searchArchiveByPhone } from '../services/orderService';
import '../assets/TableStyles.css';

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

  const [dateFrom, setDateFrom] = useState(getTodayStr());
  const [dateTo, setDateTo] = useState(getTodayStr());

  const [stats, setStats] = useState({ completed: 0, cancelled: 0, total: 0, sum: 0 });

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

  // --- РЕНДЕР: ДЕТАЛЬНИЙ ПЕРЕГЛЯД ---
  if (selectedOrder) {
    let routePositions = null;
    if (selectedOrder.googleRoutePolyline) {
        try {
            routePositions = polyline.decode(selectedOrder.googleRoutePolyline);
        } catch (e) {}
    }

    const isCancelled = selectedOrder.status === 'CANCELLED';

    let distKm = 0;
    let pricePerKm = 0;
    if (selectedOrder.distanceMeters && selectedOrder.distanceMeters > 0) {
        distKm = selectedOrder.distanceMeters / 1000;
        pricePerKm = selectedOrder.price / distKm;
    }

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
                
                <div style={{ flex: '0 0 400px', overflowY: 'auto', paddingRight: '5px' }}>
                    
                    {/* --- ВІДОБРАЖЕННЯ ПРИЧИНИ СКАСУВАННЯ --- */}
                    {isCancelled && selectedOrder.cancellationReason && (
                        <div style={{ 
                            backgroundColor: '#ffebee', 
                            color: '#c62828',
                            padding: '10px', 
                            borderRadius: '5px', 
                            marginBottom: '15px', 
                            border: '1px solid #ef9a9a',
                            fontSize: '1.05rem'
                        }}>
                            <strong>⚠️ Причина скасування:</strong><br/>
                            {selectedOrder.cancellationReason}
                        </div>
                    )}
                    {/* ---------------------------------------- */}

                    <div className="order-card" style={{ cursor: 'default', backgroundColor: '#fff', border: '1px solid #ddd', height: 'auto' }}>
                        
                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <p><strong>Клієнт:</strong> {selectedOrder.client.fullName}</p>
                            <p><strong>Телефон:</strong> {selectedOrder.client.phoneNumber}</p>
                            <hr style={{margin: '10px 0', border: '0', borderTop: '1px solid #eee'}}/>
                            <p><strong>Водій:</strong> {selectedOrder.driver ? `${selectedOrder.driver.fullName} (${selectedOrder.driver.carPlateNumber})` : '—'}</p>
                            <p><strong>Тариф:</strong> {selectedOrder.tariffName}</p>
                        </div>

                        <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                            <p>🕐 <strong>Створено:</strong> {formatDate(selectedOrder.createdAt)}</p>
                            <p>🏁 <strong>Завершено:</strong> {formatDate(selectedOrder.completedAt)}</p>
                        </div>

                        <div className="route-details" style={{ marginBottom: '15px' }}>
                            <div>🟢 <b>Звідки:</b> {selectedOrder.fromAddress}</div>
                            {selectedOrder.stops && selectedOrder.stops.map((stop, i) => (
                                <div key={i} style={{marginLeft: '15px', color: '#666'}}>📍 <i>{stop.address}</i></div>
                            ))}
                            <div style={{marginTop: '5px'}}>🔴 <b>Куди:</b> {selectedOrder.toAddress}</div>
                        </div>

                        <div style={{ fontSize: '1.1em', marginBottom: '15px' }}>
                            <p>💵 <strong>Ціна:</strong> {Math.round(selectedOrder.price)} ₴</p>
                            
                            {distKm > 0 && (
                                <p style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                    📏 {distKm.toFixed(1)} км • <strong>{pricePerKm.toFixed(2)} грн/км</strong>
                                </p>
                            )}

                            {selectedOrder.addedValue > 0 && (
                                <p style={{ color: '#d32f2f' }}>🔥 Надбавка: +{Math.round(selectedOrder.addedValue)} ₴</p>
                            )}
                            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                Метод: {selectedOrder.paymentMethod === 'CARD' ? '💳 Картка' : '💵 Готівка'}
                            </p>
                        </div>

                        {selectedOrder.services && selectedOrder.services.length > 0 && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                                <strong>🛠 Послуги:</strong>
                                <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                                    {selectedOrder.services.map(s => <li key={s.id}>{s.name} ({Math.round(s.price)} ₴)</li>)}
                                </ul>
                            </div>
                        )}
                        {selectedOrder.comment && (
                            <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeeba' }}>
                                <strong>📝 Коментар:</strong><br/>
                                {selectedOrder.comment}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid #ccc', position: 'relative' }}>
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
                        {routePositions && <Polyline positions={routePositions} color="blue" weight={4} />}
                        <MapFocusController order={selectedOrder} />
                    </MapContainer>
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
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            ℹ️ Подвійний клік по рядку відкриває деталі
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
    </div>
  );
};

export default ArchiveOrders;
import React, { useState, useEffect } from 'react';
import '../assets/ClientsPage.css';

import { getArchivedOrders, searchArchiveByPhone, getCancellationStats, getOrderTrackHistory } from '../services/orderService';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- ИКОНКИ КАРТЫ ---
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});

const driverHistoryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});

const getTimelineStatus = (tickTimeStr, order) => {
  if (!tickTimeStr || !order) return { text: 'Дані відсутні', color: '#6c757d' };
  const tickTime = new Date(tickTimeStr);
  
  const arrived = order.arrivedAt ? new Date(order.arrivedAt) : null;
  const started = order.startedAt ? new Date(order.startedAt) : null;
  const completed = order.completedAt ? new Date(order.completedAt) : null;

  if (completed && tickTime >= completed) return { text: '🏁 Поїздку завершено', color: '#212529' };
  if (started && tickTime >= started) return { text: '🟢 У дорозі з пасажиром', color: '#2b8a3e' };
  if (arrived && tickTime >= arrived) return { text: '🔵 Водій на місці (Очікування)', color: '#1c7ed6' };
  return { text: '🟡 Водій їде до клієнта', color: '#fcc419' };
};

const MapFocusController = ({ order, trackHistory }) => {
  const map = useMap();
  useEffect(() => {
    const bounds = [];
    if (trackHistory && trackHistory.length > 0) {
      trackHistory.forEach(p => {
        const lat = p.latitude ?? p.lat;
        const lng = p.longitude ?? p.lng;
        if (lat && lng) bounds.push([lat, lng]);
      });
    }

    if (order && order.originLat && order.destLat) {
      bounds.push([order.originLat, order.originLng]);
      bounds.push([order.destLat, order.destLng]);
      if (order.stops && order.stops.length > 0) {
        order.stops.forEach(stop => {
          if (stop.lat && stop.lng) bounds.push([stop.lat, stop.lng]);
        });
      }
    }

    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [60, 60] }); } catch(e) {}
    }
  }, [order, trackHistory, map]);
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

  const [stats, setStats] = useState({ completed: 0, cancelled: 0, total: 0, sum: 0 });
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [cancelStatsData, setCancelStatsData] = useState([]);

  useEffect(() => {
    if (selectedOrder) {
      getOrderTrackHistory(selectedOrder.idLong || selectedOrder.id)
        .then(res => {
          setTrackHistory(res);
          if (res && res.length > 0) {
            setCurrentTrackIndex(res.length - 1);
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

  const fetchArchive = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getArchivedOrders();
      const sorted = data.sort((a, b) => (b.idLong || 0) - (a.idLong || 0));
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
      result = result.filter(o => 
        o.client?.phoneNumber?.includes(searchTerm) || 
        o.clientPhone?.includes(searchTerm) ||
        o.idLong?.toString().includes(searchTerm) ||
        o.id?.toString().includes(searchTerm) ||
        o.uuid?.includes(searchTerm) ||
        o.evosOrderUid?.includes(searchTerm)
      );
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
    if (days === 1) { 
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (days > 1) {
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

  // --- ДЕТАЛЬНЫЙ ПРОСМОТР ЗАКАЗА ---
  if (selectedOrder) {
    const isCancelled = selectedOrder.status === 'CANCELLED';
    const isEvos = selectedOrder.isSentToEvos || !!selectedOrder.evosOrderUid;

    return (
      <div className="page-wrapper" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setSelectedOrder(null)} className="btn btn-close">
            ← Назад до списку
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>
              Замовлення #{selectedOrder.id} {isEvos && <span title="Перекинуто в EvoS">🌐</span>}
            </h2>
          </div>

          <span className={`badge ${isCancelled ? 'badge-danger' : 'badge-success'}`}>
            {isCancelled ? 'СКАСОВАНО' : 'ВИКОНАНО'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 160px)' }}>
          
          <div className="card" style={{ width: '420px', margin: 0, overflowY: 'auto' }}>
            
            {/* БЛОК ИДЕНТИФИКАТОРОВ */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-subtle" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>ID замовлення</span>
                <span className="badge" style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  {selectedOrder.tariff || 'Стандарт'}
                </span>
              </div>
              <h2 style={{ margin: '4px 0 8px 0', color: '#0f172a' }}>
                #{selectedOrder.id} {isEvos && <span title="Мережа EvoS">🌐</span>}
              </h2>
              
              {/* Показываем полный системный UUID */}
              {selectedOrder.uuid && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-all', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#475569' }}>UUID:</strong> {selectedOrder.uuid}
                </div>
              )}

              {/* Если заказ перекинут в EvoS — показываем партнерский UID */}
              {selectedOrder.evosOrderUid && (
                <div style={{ fontSize: '0.8rem', color: '#0284c7', wordBreak: 'break-all', backgroundColor: '#f0f9ff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bae6fd', marginTop: '6px' }}>
                  <strong>EvoS UID:</strong> {selectedOrder.evosOrderUid}
                </div>
              )}
            </div>

            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <span className="detail-label">Пасажир</span>
              <span className="detail-value">{selectedOrder.clientName || selectedOrder.client?.fullName || 'Гість'}</span>
              <span className="text-subtle" style={{ fontSize: '0.85rem' }}>📞 {selectedOrder.clientPhone || selectedOrder.client?.phoneNumber || '—'}</span>
            </div>

            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <span className="detail-label">Водій та Авто</span>
              {selectedOrder.driver && selectedOrder.driver.id !== -1 ? (
                <>
                  <span className="detail-value">{selectedOrder.driver.fullName}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="text-subtle" style={{ fontSize: '0.85rem' }}>📞 {selectedOrder.driver.phoneNumber || '—'}</span>
                    <span className="badge" style={{ background: '#e2e8f0', color: '#0f172a' }}>
                      {selectedOrder.driver.carPlateNumber || selectedOrder.carNumber || selectedOrder.driver.carLicensePlate || '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    🚗 {selectedOrder.driver.carModel} {selectedOrder.driver.carColor ? `(${selectedOrder.driver.carColor})` : ''}
                  </div>
                </>
              ) : (selectedOrder.isSentToEvos || selectedOrder.evosDriverCarInfo || (selectedOrder.driver && selectedOrder.driver.id === -1)) ? (
                <div style={{ backgroundColor: '#f8f0fc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #eebefa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#862e9c', fontSize: '0.9rem' }}>🤝 Водій СОЗ (EvoS)</span>
                    <span className="badge" style={{ background: '#e599f7', color: '#3b0764', fontSize: '0.75rem' }}>
                      {selectedOrder.driver?.carPlateNumber || selectedOrder.evosDriverCarInfo?.split(',')[0] || 'ПАРТНЕР'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b', marginTop: '3px' }}>
                    🚗 {selectedOrder.driver?.carModel || selectedOrder.evosDriverCarInfo || 'Партнерське авто'}
                  </div>
                  {(selectedOrder.driver?.phoneNumber || selectedOrder.evosDriverPhone) && (
                    <div className="text-subtle" style={{ fontSize: '0.85rem', marginTop: '2px', color: '#0284c7' }}>
                      📞 {selectedOrder.driver?.phoneNumber || selectedOrder.evosDriverPhone}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-subtle" style={{ fontStyle: 'italic' }}>
                  Водія не було призначено
                </span>
              )}
            </div>

            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <span className="detail-label">Маршрут</span>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#16a34a' }}>🟢 {selectedOrder.fromAddress}</div>
              {selectedOrder.stops?.map((stop, index) => (
                <div key={index} style={{ fontSize: '0.85rem', color: '#475569', paddingLeft: '12px' }}>• {stop.address}</div>
              ))}
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#dc2626' }}>🔴 {selectedOrder.toAddress}</div>
            </div>

            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <span className="detail-label">Вартість та Оплата</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-medium">{selectedOrder.paymentMethod === 'CASH' ? '💵 Готівка' : '💳 Картка'}</span>
                <span className="text-success" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round(selectedOrder.price || 0)} ₴</span>
              </div>
            </div>
          </div>

          <div className="table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative' }}>
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
                {trackHistory.length > 0 && (
                  <Polyline 
                    positions={trackHistory.slice(0, currentTrackIndex + 1).map(p => [p.latitude ?? p.lat, p.longitude ?? p.lng])} 
                    color="#dc2626" 
                    weight={5} 
                  />
                )}
                {trackHistory.length > 0 && trackHistory[currentTrackIndex] && (
                  <Marker 
                    position={[
                      trackHistory[currentTrackIndex].latitude ?? trackHistory[currentTrackIndex].lat, 
                      trackHistory[currentTrackIndex].longitude ?? trackHistory[currentTrackIndex].lng
                    ]} 
                    icon={driverHistoryIcon}
                  />
                )}
                <MapFocusController order={selectedOrder} trackHistory={trackHistory} />
              </MapContainer>
            </div>

            {trackHistory.length > 0 && (
              <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    ⏱️ Хронологія: Тик {currentTrackIndex + 1} з {trackHistory.length}
                  </span>
                  {trackHistory[currentTrackIndex] && (() => {
                    const currentStatus = getTimelineStatus(trackHistory[currentTrackIndex].timestamp, selectedOrder);
                    return (
                      <span className="badge" style={{ backgroundColor: currentStatus.color, color: currentStatus.color === '#fcc419' ? '#000' : '#fff' }}>
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
                  style={{ width: '100%', accentColor: '#0284c7' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading && allOrders.length === 0) return <div className="page-wrapper"><div className="text-subtle">Завантаження архіву...</div></div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Архів Замовлень</h1>
          <span className="count-badge">{filteredOrders.length}</span>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-outline-danger" onClick={handleOpenStats}>
            📊 Статистика скасувань
          </button>
        </div>
      </header>

      {/* ПАНЕЛЬ ФИЛЬТРОВ И СТАТИСТИКИ */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          <div style={{ flex: 2, minWidth: '300px' }}>
            <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Період та пошук</span>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" />
              <span style={{ alignSelf: 'center' }}>—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-close" onClick={() => setDateFilter(0)}>Сьогодні</button>
              <button className="btn btn-sm btn-close" onClick={() => setDateFilter(1)}>Вчора</button>
              <button className="btn btn-sm btn-close" onClick={() => setDateFilter(7)}>Тиждень</button>
              <button className="btn btn-sm btn-close" onClick={() => setDateFilter(30)}>Місяць</button>
              <button className="btn btn-sm btn-close" onClick={() => setDateFilter(-1)}>За весь час</button>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="🔍 Пошук (ID, UUID, тел)..."
                className="input-field search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-close">Знайти</button>
            </form>
          </div>

          <div style={{ flex: 1, minWidth: '220px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Статистика за період</span>
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Всього: <strong>{stats.total}</strong></div>
              <div className="text-success">✅ Виконано: <strong>{stats.completed}</strong></div>
              <div className="text-danger">❌ Скасовано: <strong>{stats.cancelled}</strong></div>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px', fontSize: '1.1rem' }}>
                💰 Сума: <strong className="text-primary">{Math.round(stats.sum)} ₴</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {error && <div className="text-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ТАБЛИЦА АРХИВА - ТОЧНЫЕ ИЗОЛИРОВАННЫЕ ШИРИНЫ КОЛОНОК */}
      <div className="table-card">
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', width: '100px' }}>ID</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'center', width: '90px' }}>Статус</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', width: '130px' }}>Створено</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', width: '130px' }}>Завершено</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', width: '130px' }}>Клієнт</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left', width: '150px' }}>Водій</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left' }}>Звідки</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'left' }}>Куди</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'center', width: '90px' }}>Ціна</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isEvos = order.isSentToEvos || !!order.evosOrderUid;
                  const driverDisplayName = order.driver && order.driver.id !== -1
                    ? order.driver.fullName 
                    : (order.driver?.carModel || order.evosDriverCarInfo ? `🤝 EvoS: ${order.driver?.carModel || order.evosDriverCarInfo}` : '—');

                  return (
                    <tr 
                      key={order.id} 
                      onDoubleClick={() => setSelectedOrder(order)}
                      className="clickable-row"
                      style={{ borderBottom: '1px solid #cbd5e1' }}
                      title="Подвійний клік для деталей"
                    >
                      <td className="font-medium" style={{ padding: '0.9rem 1.1rem', whiteSpace: 'nowrap' }}>
                        #{order.idLong || order.id} {isEvos && <span title="Перекинуто в EvoS">🌐</span>}
                      </td>
                      <td className="text-center" style={{ padding: '0.9rem 1.1rem' }}>
                        <span className={`badge ${order.status === 'CANCELLED' ? 'badge-danger' : 'badge-success'}`}>
                          {order.status === 'CANCELLED' ? 'СКАС' : 'ОК'}
                        </span>
                      </td>
                      <td className="text-subtle" style={{ padding: '0.9rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="text-subtle" style={{ padding: '0.9rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(order.completedAt)}
                      </td>
                      <td className="font-medium" style={{ padding: '0.9rem 1.1rem', whiteSpace: 'nowrap' }}>
                        {order.client?.phoneNumber || '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                        {driverDisplayName}
                      </td>
                      <td style={{ padding: '0.9rem 1.1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.fromAddress}
                      </td>
                      <td style={{ padding: '0.9rem 1.1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.toAddress}
                      </td>
                      <td className="text-center font-medium text-success" style={{ padding: '0.9rem 1.1rem', whiteSpace: 'nowrap' }}>
                        {Math.round(order.price)} ₴
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center text-subtle py-8">
                    Записів не знайдено за вказаними фільтрами.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО СТАТИСТИКИ СКАСУВАНИЙ (СТРОГАЯ СЕТКА GRID) */}
      {statsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{ width: '460px', maxWidth: '90vw', margin: 0, padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            
            {/* Хедер модалки */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>📊 Статистика скасувань</h3>
              <button 
                onClick={() => setStatsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            
            {cancelStatsData.length === 0 ? (
              <p className="text-subtle" style={{ margin: '1.5rem 0', textAlign: 'center' }}>Немає даних про скасовані замовлення.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', overflowX: 'hidden', marginBottom: '1.5rem', paddingRight: '4px' }}>
                
                {/* Шапка списка (Grid 2 колонки) */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 100px', 
                  alignItems: 'center',
                  padding: '10px 14px', 
                  backgroundColor: '#f1f5f9', 
                  borderRadius: '6px', 
                  fontWeight: 700, 
                  fontSize: '0.8rem', 
                  color: '#475569', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em' 
                }}>
                  <span>Причина</span>
                  <span style={{ textAlign: 'center' }}>Кількість</span>
                </div>

                {/* Строки списка (Grid 2 колонки: левая — текст, правая 100px — бейдж строго под "Кількість") */}
                {cancelStatsData.map((stat, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 100px', 
                      alignItems: 'center', 
                      padding: '10px 14px', 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px' 
                    }}
                  >
                    <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.95rem', paddingRight: '12px', wordBreak: 'break-word' }}>
                      {stat.reason || 'Без причини'}
                    </span>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ 
                        backgroundColor: '#e0f2fe', 
                        color: '#0369a1', 
                        fontWeight: 700, 
                        fontSize: '0.85rem', 
                        padding: '4px 12px', 
                        borderRadius: '12px',
                        minWidth: '32px',
                        textAlign: 'center'
                      }}>
                        {stat.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="btn btn-close" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }} onClick={() => setStatsModalOpen(false)}>
              Закрити
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ArchiveOrders;
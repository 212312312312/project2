import React, { useState, useEffect, useRef } from 'react';
import { getActiveOrders, cancelOrder, assignDriverToOrder } from '../services/orderService';
import { getOnlineDriversForMap } from '../services/driverService'; 
import { getAllSettings } from '../services/settingsService';

import useInterval from '../hooks/useInterval'; 

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet'; 
import polyline from '@mapbox/polyline';

import 'leaflet/dist/leaflet.css';
import '../assets/ActiveOrders.css';

// --- ИКОНКИ ---
const defaultOnlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// СЕРАЯ ИКОНКА (Для активных, но не онлайн)
const offlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

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

// --- HELPER ---
const getCoords = (driver) => {
    const lat = driver.latitude ?? driver.lat ?? driver.currentLatitude ?? null;
    const lng = driver.longitude ?? driver.lng ?? driver.currentLongitude ?? null;
    return { lat, lng };
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'REQUESTED': return 'Пошук водія';
        case 'ACCEPTED': return 'Водій їде';
        case 'DRIVER_ARRIVED': return 'Водій чекає';
        case 'IN_PROGRESS': return 'В дорозі';
        case 'COMPLETED': return 'Завершено';
        case 'CANCELLED': return 'Скасовано';
        default: return status;
    }
};

// --- КОНТРОЛЛЕР ФОКУСА ---
const MapFocusController = ({ selectedOrder, drivers }) => {
  const map = useMap(); 
  const hasInitialZoom = useRef(false);

  useEffect(() => {
    const bounds = [];
    if (selectedOrder && selectedOrder.originLat && selectedOrder.destLat) {
      bounds.push([selectedOrder.originLat, selectedOrder.originLng]);
      bounds.push([selectedOrder.destLat, selectedOrder.destLng]);
      if (selectedOrder.stops) {
        selectedOrder.stops.forEach(s => { if(s.lat) bounds.push([s.lat, s.lng]) });
      }
    } 
    else if (!hasInitialZoom.current && drivers && drivers.length > 0) {
      drivers.forEach(d => {
        const { lat, lng } = getCoords(d);
        // Зуммируемся ко всем валидным водителям (и серым, и зеленым)
        if (lat && lng && lat !== 0) {
          bounds.push([lat, lng]);
        }
      });
      if (bounds.length > 0) hasInitialZoom.current = true;
    }

    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 }); } catch (e) {}
    }
  }, [selectedOrder, drivers, map]);
  return null;
};

// --- КАРТА ---
const DriverMap = ({ drivers, selectedOrder, customOnlineIcon }) => {
  const position = [50.45, 30.52]; 
  
  let routePath = null;
  if (selectedOrder) {
    if (selectedOrder.googleRoutePolyline) {
      try { routePath = polyline.decode(selectedOrder.googleRoutePolyline); } catch (e) {}
    } else if (selectedOrder.originLat && selectedOrder.destLat) {
      routePath = [[selectedOrder.originLat, selectedOrder.originLng]];
      if (selectedOrder.stops) selectedOrder.stops.forEach(s => routePath.push([s.lat, s.lng]));
      routePath.push([selectedOrder.destLat, selectedOrder.destLng]);
    }
  }

  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  return (
    <MapContainer center={position} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      
      {!selectedOrder && safeDrivers.map(driver => {
        const { lat, lng } = getCoords(driver);

        // Проверка координат
        if (lat === null || lng === null || lat === 0) return null;
        
        // --- ОШИБКА БЫЛА ТУТ ---
        // Удали или закомментируй эту строку:
        // if (!driver.isOnline) return null; 
        // ------------------------

        // Логика иконки
        let iconToUse;
        if (driver.isOnline) {
             iconToUse = defaultOnlineIcon;
             if (customOnlineIcon) {
                 const [w, h] = customOnlineIcon.options.iconSize;
                 if (w > 0 && h > 0) iconToUse = customOnlineIcon;
             }
        } else {
             iconToUse = offlineIcon; // Используем серую иконку для "активных"
        }

        return (
            <Marker key={`driver-${driver.id}-${lat}-${lng}`} position={[lat, lng]} icon={iconToUse}>
              <Popup>
                <strong>{driver.fullName}</strong><br/>
                ID: {driver.id}<br/>
                {driver.isOnline ? '🟢 НА ЛИНИИ' : '⚪ АКТИВЕН (НЕ НА СМЕНЕ)'}
              </Popup>
            </Marker>
        );
      })}

      {selectedOrder && (
        <>
          <Marker position={[selectedOrder.originLat, selectedOrder.originLng]} icon={originIcon}>
             <Popup>А: {selectedOrder.fromAddress}</Popup>
          </Marker>
          {selectedOrder.stops?.map((stop, i) => (
             <Marker key={i} position={[stop.lat, stop.lng]} icon={waypointIcon}><Popup>{stop.address}</Popup></Marker>
          ))}
          <Marker position={[selectedOrder.destLat, selectedOrder.destLng]} icon={destIcon}>
             <Popup>Б: {selectedOrder.toAddress}</Popup>
          </Marker>
          {routePath && <Polyline positions={routePath} color="blue" />}
        </>
      )}
      
      <MapFocusController selectedOrder={selectedOrder} drivers={safeDrivers} />
    </MapContainer>
  );
};

// --- СПИСОК ЗАКАЗОВ ---
const OrderList = ({ orders, onCancel, onAssign, onSelectOrder, selectedOrderId }) => {
  return (
    <div className="orders-list">
      {orders.length === 0 && <p style={{padding: '1.5rem'}}>Активних замовлень немає.</p>}
      {orders.map(order => (
        <div key={order.id} className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`} onClick={() => onSelectOrder(order)}>
          <div className="order-card-header">
            <h4>#{order.id} ({order.tariffName})</h4>
            <span className={`status status-${order.status}`}>{getStatusLabel(order.status)}</span>
          </div>
          <div className="order-card-body">
            <p><strong>Клієнт:</strong> {order.client.fullName}</p>
            <div className="route-details" style={{marginTop: '5px'}}>
                <div>🟢 {order.fromAddress}</div>
                <div>🔴 {order.toAddress}</div>
            </div>
            <p><strong>Ціна:</strong> {Math.round(order.price)} грн {order.paymentMethod === 'CARD' ? '💳' : '💵'}</p>
            <p><strong>Водій:</strong> {order.driver ? order.driver.fullName : '---'}</p>
          </div>
          <div className="order-card-actions">
            {order.status === 'REQUESTED' && <button className="btn-primary" onClick={(e) => { e.stopPropagation(); onAssign(order.id); }}>Призначити</button>}
            <button className="btn-danger" onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}>Скасувати</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [mapDrivers, setMapDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [onlineIcon, setOnlineIcon] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getAllSettings();
        if (settings && settings.driver_map_icon) {
          let w = parseInt(settings.driver_map_icon_width);
          let h = parseInt(settings.driver_map_icon_height);
          if (!w || isNaN(w) || w <= 0) w = 40;
          if (!h || isNaN(h) || h <= 0) h = 40;

          const imageUrl = `${settings.driver_map_icon}?t=${new Date().getTime()}`;
          const customIcon = new L.Icon({
            iconUrl: imageUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [w, h],          
            iconAnchor: [w / 2, h / 2], 
            popupAnchor: [0, -(h / 2)], 
            shadowSize: [w + 5, h + 5] 
          });
          setOnlineIcon(customIcon);
        }
      } catch (err) {
        console.error("Не удалось загрузить иконку:", err);
      }
    };
    fetchSettings();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const data = await getActiveOrders();
      setOrders(data.sort((a, b) => b.id - a.id));
    } catch (err) {}
  };
  
  const fetchMapDrivers = async () => {
    try {
      const data = await getOnlineDriversForMap();
      
      // БЫЛО (ОШИБКА): 
      // const onlineOnly = (data || []).filter(d => d.isOnline);
      // setMapDrivers(onlineOnly);

      // СТАЛО (ПРАВИЛЬНО):
      // Мы берем ВСЕХ, кого прислал сервер. Иконочкой (серой/зеленой) управляет компонент карты.
      setMapDrivers(data || []); 
      
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchActiveOrders(); fetchMapDrivers(); }, []);
  useInterval(fetchActiveOrders, 10000); 
  useInterval(fetchMapDrivers, 5000);
  
  const handleCancel = async (orderId) => { if (window.confirm(`Скасувати #${orderId}?`)) try { await cancelOrder(orderId); setOrders(prev => prev.filter(o => o.id !== orderId)); if (selectedOrder?.id === orderId) setSelectedOrder(null); } catch (err) { alert(err.message); } };
  const handleAssign = async (orderId) => { const did = prompt(`ID водія:`); if (did) try { await assignDriverToOrder(orderId, parseInt(did)); fetchActiveOrders(); } catch (err) { alert(err.message); } };

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.client.phoneNumber.includes(searchTerm);
    let matchStatus = true;
    if (statusFilter === 'REQUESTED') matchStatus = o.status === 'REQUESTED';
    else if (statusFilter === 'ACTIVE') matchStatus = ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(o.status);
    return matchSearch && matchStatus;
  });

  // --- СТАТИСТИКА ВОДИТЕЛЕЙ ---
  const totalDrivers = mapDrivers.length;
  const onlineDrivers = mapDrivers.filter(d => d.isOnline).length;
  const activeDrivers = totalDrivers - onlineDrivers; // Те, кто серые

  return (
    <div className="active-orders-layout">
      <div className="orders-list-container">
        <div className="orders-list-header" style={{flexDirection: 'column', gap: '10px'}}>
          <h3>Замовлення ({filteredOrders.length})</h3>
          <div style={{display: 'flex', gap: '5px', width: '100%'}}>
              <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex: 1}}/>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">Всі</option>
                  <option value="REQUESTED">Пошук</option>
                  <option value="ACTIVE">В роботі</option>
              </select>
          </div>
        </div>
        <OrderList orders={filteredOrders} onCancel={handleCancel} onAssign={handleAssign} onSelectOrder={setSelectedOrder} selectedOrderId={selectedOrder?.id} />
      </div>
      <div className="map-container">
        <div className="orders-list-header">
           {/* НОВАЯ ШАПКА СО СТАТИСТИКОЙ */}
          {selectedOrder ? (
              <h3>Маршрут #{selectedOrder.id}</h3>
          ) : (
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Водії:</h3>
                  <span style={{ color: 'green', fontWeight: 'bold' }}>🟢 {onlineDrivers}</span>
                  <span style={{ color: 'gray', fontWeight: 'bold' }}>⚪ {activeDrivers}</span>
              </div>
          )}
          
          {selectedOrder && <button onClick={() => setSelectedOrder(null)}>Скинути</button>}
        </div>
        <DriverMap drivers={mapDrivers} selectedOrder={selectedOrder} customOnlineIcon={onlineIcon} />
      </div>
    </div>
  );
};

export default ActiveOrders;
import React, { useState, useEffect, useRef } from 'react';
import { getActiveOrders, cancelOrder, assignDriverToOrder } from '../services/orderService';
import { getOnlineDriversForMap } from '../services/driverService'; 
import { getAllSettings } from '../services/settingsService';

// WebSocket
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

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
        case 'SCHEDULED': return 'Заплановано'; // <--- НОВЫЙ СТАТУС
        case 'REQUESTED': return 'Пошук водія';
        case 'OFFERING': return 'Пропонуємо';
        case 'ACCEPTED': return 'Водій їде';
        case 'DRIVER_ARRIVED': return 'Водій чекає';
        case 'IN_PROGRESS': return 'В дорозі';
        case 'COMPLETED': return 'Завершено';
        case 'CANCELLED': return 'Скасовано';
        default: return status;
    }
};

const formatScheduledTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

const formatTime = (isoString) => {
    if(!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
        if (lat === null || lng === null || lat === 0) return null;

        let iconToUse;
        if (driver.isOnline) {
             iconToUse = defaultOnlineIcon;
             if (customOnlineIcon) {
                 const [w, h] = customOnlineIcon.options.iconSize;
                 if (w > 0 && h > 0) iconToUse = customOnlineIcon;
             }
        } else {
             iconToUse = offlineIcon; 
        }

        return (
            <Marker key={`driver-${driver.id}-${lat}-${lng}`} position={[lat, lng]} icon={iconToUse}>
              <Popup>
                <strong>{driver.fullName}</strong><br/>
                ID: {driver.id}<br/>
                {driver.isOnline ? '🟢 НА ЛІНІЇ' : '⚪ АКТИВЕН (НЕ НА СМЕНЕ)'}
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
      {orders.length === 0 && <p style={{padding: '1.5rem', textAlign: 'center', color: '#888'}}>Список порожній.</p>}
      {orders.map(order => (
        <div key={order.id} className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`} onClick={() => onSelectOrder(order)}>
          <div className="order-card-header">
            <h4>#{order.id} ({order.tariffName})</h4>
            <span className={`status status-${order.status}`}>{getStatusLabel(order.status)}</span>
          </div>
          
          {/* ЕСЛИ ЭТО ЗАПЛАНИРОВАННЫЙ ЗАКАЗ - ПОКАЗЫВАЕМ ВРЕМЯ */}
          {order.status === 'SCHEDULED' && order.scheduledAt && (
              <div className="scheduled-time-badge">
                  🕒 {formatScheduledTime(order.scheduledAt)}
              </div>
          )}

          <div className="order-card-body">
            {/* ДОБАВЛЕНО: Время для запланированных */}
    {order.status === 'SCHEDULED' && (
        <div style={{marginBottom: '8px', color: '#d9480f', fontWeight: 'bold', background: '#fff4e6', padding: '4px', borderRadius: '4px', display: 'inline-block'}}>
            ⏰ Час подачі: {formatTime(order.scheduledAt)}
        </div>
    )}
            <p><strong>Клієнт:</strong> {order.client.fullName} ({order.client.userPhone})</p>
            <div className="route-details" style={{marginTop: '5px'}}>
                <div>🟢 {order.fromAddress}</div>
                <div>🔴 {order.toAddress}</div>
            </div>
            <p><strong>Ціна:</strong> {Math.round(order.price)} грн {order.paymentMethod === 'CARD' ? '💳' : '💵'}</p>
            <p><strong>Водій:</strong> {order.driver ? order.driver.fullName : (order.status === 'SCHEDULED' ? 'Буде призначено' : 'Пошук...')}</p>
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
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'SCHEDULED'
  const [statusFilter, setStatusFilter] = useState('ALL'); // For Active tab
  
  const [onlineIcon, setOnlineIcon] = useState(null);
  
  const stompClientRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getAllSettings();
        if (settings && settings.driver_map_icon) {
          let w = parseInt(settings.driver_map_icon_width);
          let h = parseInt(settings.driver_map_icon_height);
          if (!w) w = 40;
          if (!h) h = 40;

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
      setMapDrivers(data || []); 
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchActiveOrders(); 
    fetchMapDrivers(); 

    // WebSocket подключение
    const socket = new SockJS('http://localhost:8080/ws-taxi');
    
    const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log('Connected to Dispatcher WebSocket');
            client.subscribe('/topic/admin/orders', (message) => {
                const msg = JSON.parse(message.body);
                handleSocketMessage(msg);
            });
        },
        onStompError: (frame) => {
            console.error('WS Error:', frame);
        },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
        if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, []);

  const handleSocketMessage = (msg) => {
    if (msg.action === 'ADD') {
        setOrders(prevOrders => {
            // Если такой заказ уже есть - обновляем его
            const existingIndex = prevOrders.findIndex(o => o.id === msg.orderId);
            if (existingIndex !== -1) {
                const updated = [...prevOrders];
                updated[existingIndex] = msg.order;
                return updated;
            }
            return [msg.order, ...prevOrders];
        });
    } else if (msg.action === 'REMOVE') {
        setOrders(prevOrders => prevOrders.filter(o => o.id !== msg.orderId));
    }
  };

  useInterval(fetchMapDrivers, 5000);

  const handleCancel = async (orderId) => { 
      if (window.confirm(`Скасувати #${orderId}?`)) {
          try { 
              await cancelOrder(orderId); 
              if (selectedOrder?.id === orderId) setSelectedOrder(null); 
          } catch (err) { alert(err.message); } 
      }
  };

  const handleAssign = async (orderId) => { 
      const did = prompt(`ID водія:`); 
      if (did) {
          try { await assignDriverToOrder(orderId, parseInt(did)); } 
          catch (err) { alert(err.message); }
      }
  };

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.client.phoneNumber.includes(searchTerm) || o.id.toString().includes(searchTerm);
    
    if (activeTab === 'SCHEDULED') {
        return matchSearch && o.status === 'SCHEDULED';
    } else {
        // ACTIVE TAB
        if (o.status === 'SCHEDULED') return false; // Hide scheduled from active tab

        let matchStatus = true;
        if (statusFilter === 'REQUESTED') matchStatus = o.status === 'REQUESTED';
        else if (statusFilter === 'ACTIVE') matchStatus = ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'OFFERING'].includes(o.status);
        
        return matchSearch && matchStatus;
    }
  });

  const totalDrivers = mapDrivers.length;
  const onlineDrivers = mapDrivers.filter(d => d.isOnline).length;
  const activeDrivers = totalDrivers - onlineDrivers;

  return (
    <div className="active-orders-layout">
      <div className="orders-list-container">
        
        {/* --- TABS --- */}
        <div className="tabs-container">
            <button 
                className={`tab-button ${activeTab === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setActiveTab('ACTIVE')}
            >
                Активні
            </button>
            <button 
                className={`tab-button ${activeTab === 'SCHEDULED' ? 'active' : ''}`}
                onClick={() => setActiveTab('SCHEDULED')}
            >
                Заплановані
            </button>
        </div>

        <div className="orders-list-header" style={{flexDirection: 'column', gap: '10px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
             <h3>{activeTab === 'SCHEDULED' ? 'Заплановані' : 'В ефірі'} ({filteredOrders.length})</h3>
          </div>
          
          <div style={{display: 'flex', gap: '5px', width: '100%'}}>
              <input type="text" placeholder="Пошук (телефон, ID)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex: 1}}/>
              
              {activeTab === 'ACTIVE' && (
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="ALL">Всі</option>
                      <option value="REQUESTED">Пошук</option>
                      <option value="ACTIVE">В роботі</option>
                  </select>
              )}
          </div>
        </div>
        
        <OrderList orders={filteredOrders} onCancel={handleCancel} onAssign={handleAssign} onSelectOrder={setSelectedOrder} selectedOrderId={selectedOrder?.id} />
      </div>
      
      <div className="map-container">
        <div className="orders-list-header">
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
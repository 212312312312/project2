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
        case 'SCHEDULED': return 'Заплановано';
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

// --- КОМПОНЕНТ ПЛАВНОГО МАРКЕРА ВОДИТЕЛЯ ---
const SmoothDriverMarker = ({ position, icon, children }) => {
  const markerRef = useRef(null);
  const prevPositionRef = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const startPos = prevPositionRef.current;
    const endPos = position;

    // Если координаты не изменились, ничего не анимируем
    if (startPos[0] === endPos[0] && startPos[1] === endPos[1]) {
      return;
    }

    let startTime = null;
    const duration = 2500; // Анимация движения займет 2.5 секунды

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Линейная интерполяция (LERP) между старой и новой точкой
      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * progress;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * progress;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevPositionRef.current = endPos;
      }
    };

    requestAnimationFrame(animate);

    return () => {
      // Если координаты поменялись во время движения, фиксируем промежуточную точку как старт
      if (marker && marker.getLatLng) {
        const currentLatLng = marker.getLatLng();
        prevPositionRef.current = [currentLatLng.lat, currentLatLng.lng];
      }
    };
  }, [position]);

  return (
    <Marker ref={markerRef} position={prevPositionRef.current} icon={icon}>
      {children}
    </Marker>
  );
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
            /* ИСПРАВЛЕНО: Заменили стандартный Marker на кастомный SmoothDriverMarker */
            <SmoothDriverMarker key={`driver-${driver.id}`} position={[lat, lng]} icon={iconToUse}>
              <Popup>
                <strong>{driver.fullName}</strong><br/>
                ID: {driver.id}<br/>
                {driver.isOnline ? '🟢 НА ЛІНІЇ' : '⚪ АКТИВЕН (НЕ НА СМЕНЕ)'}
              </Popup>
            </SmoothDriverMarker>
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
  // --- ДОБАВЛЕНО: Состояние для таймера реального времени ---
  const [now, setNow] = useState(new Date());

  useInterval(() => {
    setNow(new Date());
  }, 1000);

  // --- ДОБАВЛЕНО: Вычисляем и рисуем статус ожидания ---
  const renderWaitingInfo = (order) => {
    // 1. Водитель приехал, идет таймер ожидания
    if (order.status === 'DRIVER_ARRIVED' && order.arrivedAt) {
        const arrivedTime = new Date(order.arrivedAt).getTime();
        const diffMs = now.getTime() - arrivedTime;
        
        if (diffMs < 0) return null; // Защита от расхождения времени сервера и клиента

        const diffMinutesFull = diffMs / (1000 * 60);
        const freeMinutes = order.freeWaitingMinutes || 3;
        const pricePerMin = order.pricePerWaitingMinute || 0;

        if (diffMinutesFull <= freeMinutes) {
            // Бесплатное ожидание (зеленая плашка)
            const remainingMs = (freeMinutes * 60 * 1000) - diffMs;
            const remMin = Math.floor(remainingMs / (1000 * 60));
            const remSec = Math.floor((remainingMs / 1000) % 60);
            return (
                <div style={{ color: '#2b8a3e', fontSize: '0.9em', fontWeight: 'bold', marginTop: '8px', padding: '6px', backgroundColor: '#ebfbee', borderRadius: '4px', border: '1px solid #b2f2bb' }}>
                    ⏱ Безкоштовне очікування: {remMin}хв {remSec}с
                </div>
            );
        } else {
            // Платное ожидание (красная плашка)
            const paidMinutes = Math.floor(diffMinutesFull - freeMinutes);
            const currentExtraCost = paidMinutes * pricePerMin;
            return (
                <div style={{ color: '#c92a2a', fontSize: '0.9em', fontWeight: 'bold', marginTop: '8px', padding: '6px', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #ffc9c9' }}>
                    ⏳ Платне очікування: {paidMinutes} хв (+{currentExtraCost.toFixed(2)} грн)
                </div>
            );
        }
    } 
    
    // 2. Заказ уже в пути или завершен — показываем финальную сумму за ожидание
    if ((order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') && order.waitingPrice > 0) {
        return (
            <div style={{ color: '#d9480f', fontSize: '0.9em', fontWeight: 'bold', marginTop: '8px', padding: '6px', backgroundColor: '#fff4e6', borderRadius: '4px', border: '1px solid #ffd8a8' }}>
                💰 Додано за очікування: {order.waitingPrice.toFixed(2)} грн
            </div>
        );
    }

    return null;
  };

  // Функція для відображення статусу підтвердження водієм
  const renderConfirmationStatus = (order) => {
      if (order.status !== 'SCHEDULED') return null;
      if (!order.driver) return <span style={{fontSize: '0.85em', color: '#666'}}>🔍 Пошук водія...</span>;

      if (order.isDriverConfirmed) {
          return <span style={{color: 'green', fontWeight: 'bold', fontSize: '0.9em'}}>✅ Водій підтвердив</span>;
      } else {
          const nowTime = new Date();
          const scheduled = new Date(order.scheduledAt);
          const diffMinutes = (scheduled - nowTime) / 1000 / 60;

          if (diffMinutes < 35) {
              return <span style={{color: 'red', fontWeight: 'bold', fontSize: '0.9em', animation: 'blink 1s infinite'}}>⚠️ НЕ ПІДТВЕРДЖЕНО!</span>;
          } else {
              return <span style={{color: '#d9480f', fontSize: '0.9em'}}>⏳ Очікує підтвердження</span>;
          }
      }
  };

  return (
    <div className="orders-list">
      {orders.length === 0 && <p style={{padding: '1.5rem', textAlign: 'center', color: '#888'}}>Список порожній.</p>}
      {orders.map(order => (
        <div key={order.id} className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`} onClick={() => onSelectOrder(order)}>
          <div className="order-card-header">
            <h4>#{order.id} ({order.tariffName})</h4>
            <span className={`status status-${order.status}`}>{getStatusLabel(order.status)}</span>
          </div>
          
          {order.status === 'SCHEDULED' && order.scheduledAt && (
              <div className="scheduled-time-badge">
                  🕒 {formatScheduledTime(order.scheduledAt)}
              </div>
          )}

          <div className="order-card-body">
            {order.status === 'SCHEDULED' && (
                <div style={{marginBottom: '8px', padding: '5px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #eee'}}>
                    <div style={{color: '#d9480f', fontWeight: 'bold'}}>
                        ⏰ Подача: {formatTime(order.scheduledAt)}
                    </div>
                    <div style={{marginTop: '4px'}}>
                        {renderConfirmationStatus(order)}
                    </div>
                </div>
            )}

            <p><strong>Клієнт:</strong> {order.client.fullName} ({order.client.userPhone})</p>
            <div className="route-details" style={{marginTop: '5px'}}>
                <div>🟢 {order.fromAddress}</div>
                <div>🔴 {order.toAddress}</div>
            </div>
            
            <p><strong>Ціна:</strong> {Math.round(order.price)} грн {order.paymentMethod === 'CARD' ? '💳' : '💵'}</p>
            <p><strong>Водій:</strong> {order.driver ? order.driver.fullName : (order.status === 'SCHEDULED' ? 'Буде призначено' : 'Пошук...')}</p>

            {/* ВЫВОД ИНФОРМАЦИИ ОБ ОЖИДАНИИ */}
            {renderWaitingInfo(order)}

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

          // ИСПРАВЛЕНО: Подставляем хост бэкенда для корректной загрузки кастомного маркера на карте
          const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.host}`;
          const imageUrl = `${backendHost}${settings.driver_map_icon}?t=${new Date().getTime()}`;
          
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

    // Динамичне формування URL для WebSocket (працює і локально, і на сервері)
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    // Якщо ми локально на Vite (порт 5173), стукаємо на 8080. Якщо на сервері - використовуємо поточний домен
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws-taxi`;
    
    // WebSocket підключення
    const socket = new SockJS(wsUrl);
    
    const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log('Connected to Dispatcher WebSocket');
            client.subscribe('/topic/admin/orders', (message) => {
                const msg = JSON.parse(message.body);
                handleSocketMessage(msg);
            });

          client.subscribe('/topic/admin/drivers/locations', (message) => {
                const driverUpdate = JSON.parse(message.body);
                setMapDrivers(prevDrivers => {
                    const driverId = driverUpdate.driverId;
                    const exists = prevDrivers.some(d => (d.id === driverId || d.driverId === driverId));
                    
                    if (exists) {
                        return prevDrivers.map(d => 
                            (d.id === driverId || d.driverId === driverId)
                                ? { 
                                    ...d, 
                                    ...driverUpdate, 
                                    id: driverId, 
                                    latitude: driverUpdate.lat, 
                                    longitude: driverUpdate.lng 
                                  }
                                : d
                        );
                    }
                    // Если водителя почему-то не было в стартовом списке, добавляем его на карту
                    return [...prevDrivers, { 
                        ...driverUpdate, 
                        id: driverId, 
                        latitude: driverUpdate.lat, 
                        longitude: driverUpdate.lng 
                    }];
                });
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
    // Тепер ми обробляємо і ADD (нове замовлення), і UPDATE (зміна статусу/ціни/водія)
    if (msg.action === 'ADD' || msg.action === 'UPDATE') {
        setOrders(prevOrders => {
            // Шукаємо, чи є вже таке замовлення в нашому списку
            const existingIndex = prevOrders.findIndex(o => o.id === msg.orderId);
            
            if (existingIndex !== -1) {
                // Если есть — мгновенно обновляем его данные (чтобы не прыгало по экрану)
                const updated = [...prevOrders];
                updated[existingIndex] = msg.order;
                return updated;
            }
            // Если заказа не было — добавляем его на самый верх списка
            return [msg.order, ...prevOrders];
        });
    } else if (msg.action === 'REMOVE') {
        // Замовлення скасували або воно зникло з ефіру
        setOrders(prevOrders => prevOrders.filter(o => o.id !== msg.orderId));
    }
  };


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
    // ИСПРАВЛЕНО: заменено phoneNumber на userPhone + добавлена защита от undefined
    const clientPhone = o.client?.userPhone || '';
    const orderIdStr = o.id?.toString() || '';
    
    const matchSearch = clientPhone.includes(searchTerm) || orderIdStr.includes(searchTerm);
    
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
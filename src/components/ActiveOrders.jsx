import React, { useState, useEffect, useRef } from 'react';
import { getActiveOrders, cancelOrder, assignDriverToOrder, getOrderTrack } from '../services/orderService'; // 👈 ИЗМЕНЕНО
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
        case 'ARRIVED_AT_WAYPOINT': return 'На проміжній точці'; // 👈 ДОБАВЛЕНО
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

// --- ХЕЛПЕР РАСЧЕТА НАПРАВЛЕНИЯ (BEARING) НА ФРОНТЕНДЕ ---
const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

// --- КАРТА ---
const DriverMap = ({ drivers, selectedOrder, customOnlineIcon, dbTrack }) => {
  const position = [50.45, 30.52]; 
  
  // Хранилище предыдущих позиций и углов для каждого водителя
  const prevPositionsRef = useRef({});

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

  // Функция генерации иконки с углом поворота
  const getRotatedIcon = (driver, lat, lng) => {
    const driverId = driver.id || driver.driverId;
    let bearing = 0;
    
    const prev = prevPositionsRef.current[driverId];
    if (prev) {
      // Если координаты изменились — считаем новый угол, если нет — сохраняем старый
      if (prev.lat === lat && prev.lng === lng) {
        bearing = prev.bearing || 0;
      } else {
        bearing = calculateBearing(prev.lat, prev.lng, lat, lng);
        prevPositionsRef.current[driverId] = { lat, lng, bearing };
      }
    } else {
      prevPositionsRef.current[driverId] = { lat, lng, bearing: 0 };
    }

    let iconUrl = driver.isOnline 
      ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
      : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png';
    let size = [25, 41];
    
    if (driver.isOnline && customOnlineIcon) {
      iconUrl = customOnlineIcon.options.iconUrl;
      size = customOnlineIcon.options.iconSize || [40, 40];
    }
    
    // Оборачиваем маркер в divIcon и плавно крутим через CSS transform
    return L.divIcon({
      html: `<div style="transform: rotate(${Math.round(bearing)}deg); transform-origin: center; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center; transition: transform 0.5s ease;">
               <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
             </div>`,
      className: 'rotated-driver-container',
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2],
      popupAnchor: [0, -size[1] / 2]
    });
  };

 return (
    <MapContainer center={position} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      
      {/* 1. Если заказ НЕ выбран — показываем абсолютно всех водителей на карте */}
      {!selectedOrder && safeDrivers.map(driver => {
        const { lat, lng } = getCoords(driver);
        if (lat === null || lng === null || lat === 0) return null;

        const rotatedIcon = getRotatedIcon(driver, lat, lng);

        return (
          <SmoothDriverMarker key={`driver-${driver.id || driver.driverId}`} position={[lat, lng]} icon={rotatedIcon}>
            <Popup>
              <strong>{driver.fullName}</strong><br/>
              ID: {driver.id}<br/>
              {driver.isOnline ? '🟢 НА ЛІНІЇ' : '⚪ АКТИВЕН (НЕ НА СМЕНЕ)'}
            </Popup>
          </SmoothDriverMarker>
        );
      })}

      {/* 2. Если заказ выбран — рисуем его маршрут, точечные маркеры и ТОЛЬКО привязанную машину */}
      {selectedOrder && (
        <>
          {/* Рендеринг назначенного водителя на маршруте с поворотом */}
          {selectedOrder.driver && (() => {
              const assignedDriver = safeDrivers.find(d => (d.id === selectedOrder.driver.id || d.driverId === selectedOrder.driver.id));
              if (!assignedDriver) return null;

              const { lat, lng } = getCoords(assignedDriver);
              if (lat === null || lng === null || lat === 0) return null;

              const rotatedIcon = getRotatedIcon(assignedDriver, lat, lng);

              return (
                  <SmoothDriverMarker key={`driver-assigned-${assignedDriver.id}`} position={[lat, lng]} icon={rotatedIcon}>
                    <Popup>
                      <strong>{assignedDriver.fullName} (Призначений)</strong><br/>
                      ID водія: {assignedDriver.id}<br/>
                      Статус поїздки: {getStatusLabel(selectedOrder.status)}
                    </Popup>
                  </SmoothDriverMarker>
              );
          })()}

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

          {/* 🔥 НАШ НОВЫЙ ДОВЕСОК: Рисуем реальный пройденный путь водителя из БД зеленой пунктирной линией */}
          {dbTrack && dbTrack.length > 0 && (
            <Polyline 
              positions={dbTrack.map(p => [p.lat, p.lng])} 
              color="#2b8a3e" 
              weight={5} 
              dashArray="5, 10" 
            />
          )}
        </>
      )}
      
      <MapFocusController selectedOrder={selectedOrder} drivers={safeDrivers} />
    </MapContainer>
  );
};

// --- СПИСОК ЗАКАЗОВ ---
const OrderList = ({ orders, onCancel, onAssign, onSelectOrder, selectedOrderId }) => {
  const [now, setNow] = useState(new Date());

  useInterval(() => {
    setNow(new Date());
  }, 1000);

  const renderWaitingInfo = (order) => {
    if (order.status === 'DRIVER_ARRIVED' && (order.waitingStartTime || order.arrivedAt)) {
        const targetTime = new Date(order.waitingStartTime || order.arrivedAt).getTime();
        const diffMs = now.getTime() - targetTime;
        
        if (diffMs < 0) {
            const absDiffMs = Math.abs(diffMs);
            const remMin = Math.floor(absDiffMs / (1000 * 60));
            const remSec = Math.floor((absDiffMs / 1000) % 60);
            return (
                <div style={{ color: '#1c7ed6', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '8px', padding: '8px', backgroundColor: '#ebf5ff', borderRadius: '6px', border: '1px solid #d0ebff', textAlign: 'center' }}>
                    ⏱ До початку очікування: {remMin}хв {remSec}с
                </div>
            );
        }

        const diffMinutesFull = diffMs / (1000 * 60);
        const freeMinutes = order.freeWaitingMinutes || 3;
        const pricePerMin = order.pricePerWaitingMinute || 0;

        if (diffMinutesFull <= freeMinutes) {
            const remainingMs = (freeMinutes * 60 * 1000) - diffMs;
            const remMin = Math.floor(remainingMs / (1000 * 60));
            const remSec = Math.floor((remainingMs / 1000) % 60);
            return (
                <div style={{ color: '#2b8a3e', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '8px', padding: '8px', backgroundColor: '#ebfbee', borderRadius: '6px', border: '1px solid #b2f2bb', textAlign: 'center' }}>
                    ⏱ Безкоштовне очікування: {remMin}хв {remSec}с
                </div>
            );
        } else {
            const paidMinutes = Math.floor(diffMinutesFull - freeMinutes);
            const currentExtraCost = paidMinutes * pricePerMin;
            return (
                <div style={{ color: '#c92a2a', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '8px', padding: '8px', backgroundColor: '#fff5f5', borderRadius: '6px', border: '1px solid #ffc9c9', textAlign: 'center' }}>
                    ⏳ Платне очікування: {paidMinutes} хв (+{currentExtraCost.toFixed(2)} грн)
                </div>
            );
        }
    } 
    
    if ((order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') && order.waitingPrice > 0) {
        return (
            <div style={{ color: '#d9480f', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '8px', padding: '8px', backgroundColor: '#fff4e6', borderRadius: '6px', border: '1px solid #ffd8a8', textAlign: 'center' }}>
                💰 Додано за очікування: {order.waitingPrice.toFixed(2)} грн
            </div>
        );
    }
    return null;
  };

  const renderConfirmationStatus = (order) => {
      if (order.status !== 'SCHEDULED') return null;
      if (!order.driver) return <span style={{fontSize: '0.8rem', color: '#868e96', fontWeight: '700'}}>🔍 ПОШУК ВОДІЯ...</span>;

      if (order.isDriverConfirmed) {
          return <span style={{color: '#2b8a3e', fontWeight: 'bold', fontSize: '0.85rem'}}>✅ Підтверджено водієм</span>;
      } else {
          const nowTime = new Date();
          const scheduled = new Date(order.scheduledAt);
          const diffMinutes = (scheduled - nowTime) / 1000 / 60;

          if (diffMinutes < 35) {
              return <span style={{color: '#c92a2a', fontWeight: 'bold', fontSize: '0.85rem', animation: 'blink 1s infinite'}}>⚠️ НЕ ПІДТВЕРДЖЕНО!</span>;
          } else {
              return <span style={{color: '#d9480f', fontSize: '0.85rem', fontWeight: '500'}}>⏳ Очікує підтвердження</span>;
          }
      }
  };

  return (
    <div className="orders-list">
      {orders.length === 0 && <p style={{padding: '1.5rem', textAlign: 'center', color: '#888'}}>Список порожній.</p>}
      {orders.map(order => {
        const distanceKm = order.distanceMeters ? (order.distanceMeters / 1000).toFixed(1) : 0;
        const pricePerKm = distanceKm > 0 ? (order.price / distanceKm).toFixed(1) : 0;
        const clientPhone = order.client?.phoneNumber || order.client?.userPhone || '';

        return (
<div 
  key={order.id} 
  className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`} 
  style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px', 
    padding: '24px',
    backgroundColor: '#ffffff',
    border: selectedOrderId === order.id ? '2px solid #1976d2' : '1px solid #e9ecef',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    marginBottom: '16px'
  }} 
  onClick={() => {
    if (selectedOrderId === order.id) onSelectOrder(null);
    else onSelectOrder(order);
  }}
>
  
  {/* КРУПНЫЙ ХЕДЕР КАРТОЧКИ */}
  <div className="order-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#212529' }}>#{order.id}</h4>
        <span style={{ backgroundColor: '#212529', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'inline-block', marginTop: '6px', letterSpacing: '0.5px' }}>
            {order.tariffName || 'Стандарт'}
        </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <span className={`status status-${order.status}`} style={{ padding: '6px 14px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '6px' }}>
            {getStatusLabel(order.status)}
        </span>
        {order.distanceMeters > 0 && (
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057', background: '#e9ecef', padding: '4px 10px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                📏 {distanceKm} км ({pricePerKm} ₴/км)
            </span>
        )}
    </div>
  </div>

  {/* МАСШТАБНОЕ БОДИ КАРТОЧКИ */}
  <div className="order-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: 0 }}>
    
    {/* Блок 1: Участники (Крупный шрифт и рамки) */}
    <div style={{ border: '1px solid #dee2e6', borderRadius: '10px', padding: '14px', backgroundColor: '#fdfdfd', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Пасажир</div>
            <div style={{ fontWeight: '700', color: '#343a40', fontSize: '1.05rem' }}>
                <a href={`/client-info?phone=${clientPhone}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#1976d2', textDecoration: 'underline' }}>
                    {order.client?.fullName || 'Гість'}
                </a> 
                <span style={{ fontWeight: '600', color: '#6c757d', marginLeft: '6px' }}>📞 {clientPhone}</span>
            </div>
        </div>
        <div style={{ borderTop: '1px dashed #dee2e6', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Водій та Авто</div>
            {order.driver ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', color: '#343a40', fontSize: '1.05rem' }}>
                    <a href={`/drivers?openId=${order.driver.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#2e7d32', textDecoration: 'underline' }}>
                        {order.driver.fullName}
                    </a>
                    <span style={{ backgroundColor: '#f1f3f5', color: '#212529', padding: '3px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid #ced4da', letterSpacing: '0.5px' }}>
                        {order.carNumber || order.driver?.carLicensePlate || '—'}
                    </span>
                </div>
            ) : (
                <div style={{ color: '#9bc2c1', fontStyle: 'italic', fontSize: '0.95rem', fontWeight: '500', padding: '2px 0' }}>
                    {order.status === 'SCHEDULED' ? '🤖 Буде призначено автоматично' : '🔍 Пошук вільної машини...'}
                </div>
            )}
        </div>
    </div>

    {/* Блок 2: Маршрут (Заметные маркеры) */}
    <div style={{ border: '1px solid #dee2e6', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Маршрут поїздки</div>
        <div style={{ fontSize: '1rem', color: '#212529', fontWeight: '600', display: 'flex', gap: '6px' }}>
            <span>🟢</span> <span>{order.fromAddress}</span>
        </div>
        {order.stops?.map((stop, i) => (
            <div key={i} style={{ fontSize: '0.95rem', color: '#495057', fontWeight: '500', paddingLeft: '16px', borderLeft: '3px dashed #ced4da', marginLeft: '6px' }}>
                • {stop.address}
            </div>
        ))}
        <div style={{ fontSize: '1rem', color: '#212529', fontWeight: '600', display: 'flex', gap: '6px' }}>
            <span>🔴</span> <span>{order.toAddress}</span>
        </div>
    </div>

    {/* Блок 3: Временные отметки */}
    <div style={{ border: '1px solid #dee2e6', borderRadius: '10px', padding: '14px', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.95rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#495057' }}>
            <span style={{ fontWeight: '500' }}>📅 Створено:</span>
            <span style={{ fontWeight: '700', color: '#212529' }}>{formatTime(order.createdAt)}</span>
        </div>
        {order.status === 'SCHEDULED' && order.scheduledAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d9480f', fontWeight: '800', borderTop: '1px dashed #ced4da', paddingTop: '6px', marginTop: '4px' }}>
                <span>⏰ Час подачі:</span>
                <span>{formatTime(order.scheduledAt)}</span>
            </div>
        )}
        {order.status === 'SCHEDULED' && (
            <div style={{ marginTop: '4px', textAlign: 'center', backgroundColor: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                {renderConfirmationStatus(order)}
            </div>
        )}
    </div>

    {/* Блок ожидания */}
    {renderWaitingInfo(order)}

    {/* Блок 4: Стоимость и Оплата (Большая финальная плашка) */}
    <div style={{ border: '2px solid #212529', borderRadius: '10px', padding: '16px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Оплата</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#212529', marginTop: '4px' }}>
                {order.paymentMethod === 'CARD' ? '💳 Банківська картка' : '💵 Готівка'}
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#868e96', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Вартість</div>
            {order.companyDiscountCompensation > 0 ? (
                <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#2b8a3e', lineHeight: '1' }}>
                        {Math.round(order.clientPayAmount)} ₴ <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#495057' }}>від клієнта</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0b7285' }}>
                        +{Math.round(order.companyDiscountCompensation)} ₴ доплата
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#2b8a3e', lineHeight: '1', marginTop: '2px' }}>
                    {Math.round(order.price)} ₴
                </div>
            )}
        </div>
    </div>

  </div>

  {/* КРУПНЫЕ КНОПКИ ДЕЙСТВИЙ */}
  <div className="order-card-actions" style={{ marginTop: '6px', display: 'flex', gap: '10px' }}>
    {order.status === 'REQUESTED' && (
        <button 
          className="btn-primary" 
          style={{ flex: 1, padding: '12px', fontSize: '1rem', fontWeight: '700', borderRadius: '8px', cursor: 'pointer' }} 
          onClick={(e) => { e.stopPropagation(); onAssign(order); }}
        >
            Призначити водія
        </button>
    )}
    <button 
      className="btn-danger" 
      style={{ 
        flex: order.status === 'REQUESTED' ? 1 : 'none', 
        width: order.status === 'REQUESTED' ? 'auto' : '100%',
        padding: '12px',
        fontSize: '1rem',
        fontWeight: '700',
        borderRadius: '8px',
        cursor: 'pointer'
      }} 
      onClick={(e) => { e.stopPropagation(); onCancel(order); }}
    >
        Скасувати замовлення
    </button>
  </div>
</div>
      )})}
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [mapDrivers, setMapDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderTrack, setSelectedOrderTrack] = useState([]);
  
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

  useEffect(() => {
    if (selectedOrder) {
      const targetId = selectedOrder.idLong || selectedOrder.id;
      
      const fetchTrackPoints = async () => {
        try {
          const points = await getOrderTrack(targetId);
          setSelectedOrderTrack(points);
        } catch (err) {
          console.error("Не вдалося завантажити трек:", err);
        }
      };

      fetchTrackPoints();

      // Если поездка активна — каждые 10 секунд подтягиваем новые точки из БД
      let intervalId;
      if (['IN_PROGRESS', 'DRIVER_ARRIVED', 'ACCEPTED', 'ARRIVED_AT_WAYPOINT'].includes(selectedOrder.status)) {
        intervalId = setInterval(fetchTrackPoints, 10000);
      }

      return () => clearInterval(intervalId);
    } else {
      setSelectedOrderTrack([]);
    }
  }, [selectedOrder]);
  


  useEffect(() => {
    // Динамичне формування URL для WebSocket (працює і локально, і на сервері)
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws-taxi`;
    
    // WebSocket підключення
    const socket = new SockJS(wsUrl);
    
    const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log('Connected to Dispatcher WebSocket');
            
            // Загружаем только активные заказы из БД при коннекте/реконнекте
            fetchActiveOrders(); 

            // Подписка на системные события заказов
            client.subscribe('/topic/admin/orders', (message) => {
                const msg = JSON.parse(message.body);
                handleSocketMessage(msg);
            });

            // 🔥 ИСПРАВЛЕНО И ОПТИМИЗИРОВАНО: 
            // Слушаем новый пакетный топик. Никаких циклов и переборов! 
            // Сервер присылает из Redis готовый массив, мы его мгновенно реактивно рендерим.
            client.subscribe('/topic/admin/drivers-location', (message) => {
                const driverBatch = JSON.parse(message.body);
                setMapDrivers(driverBatch || []);
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


  const handleCancel = async (order) => { 
      // В алерте показываем понятный числовой ID для диспетчера
      if (window.confirm(`Скасувати замовлення #${order.idLong}?`)) {
          try { 
              // На сервер шлем числовой idLong для контроллера (исчезнет ошибка 400 Bad Request)
              await cancelOrder(order.idLong); 
              
              // Для внутренней чистки UI используем строковый UUID брокера сокетов, ничего не ломая!
              if (selectedOrder?.id === order.id) setSelectedOrder(null); 
          } catch (err) { alert(err.message); } 
      }
  };

  const handleAssign = async (order) => { 
      const did = prompt(`ID водія:`); 
      if (did) {
          try { 
              // На сервер для привязки шлем числовой idLong
              await assignDriverToOrder(order.idLong, parseInt(did)); 
          } catch (err) { alert(err.message); }
      }
  };

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---
  const filteredOrders = orders.filter(o => {
    const clientPhone = o.client?.userPhone || '';
    const orderIdStr = o.id?.toString() || '';
    
    const matchSearch = clientPhone.includes(searchTerm) || orderIdStr.includes(searchTerm);
    
    if (activeTab === 'SCHEDULED') {
        return matchSearch && o.status === 'SCHEDULED';
    } else {
        // ACTIVE TAB
        if (o.status === 'SCHEDULED') return false;

        let matchStatus = true;
        if (statusFilter === 'ACTIVE') {
            // "В работе (все)" — показывает все типы активных поездок
            matchStatus = ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'OFFERING', 'ARRIVED_AT_WAYPOINT'].includes(o.status);
        } else if (statusFilter !== 'ALL') {
            // Конкретный выбранный статус (например, только IN_PROGRESS или только REQUESTED)
            matchStatus = o.status === statusFilter;
        }

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
                      <option value="ALL">Всі активні (з пошуком)</option>
                      <option value="ACTIVE">В роботі (всі)</option>
                      <option value="REQUESTED">Пошук водія</option>
                      <option value="OFFERING">Пропонуємо поїздку</option>
                      <option value="ACCEPTED">Водій їде до клієнта</option>
                      <option value="DRIVER_ARRIVED">Водій очікує</option>
                      <option value="IN_PROGRESS">В дорозі з клієнтом</option>
                      <option value="ARRIVED_AT_WAYPOINT">На проміжній точці</option>
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
        <DriverMap drivers={mapDrivers} selectedOrder={selectedOrder} customOnlineIcon={onlineIcon} dbTrack={selectedOrderTrack} />
      </div>
    </div>
  );
};

export default ActiveOrders;
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

// 🟢 Вставляем сюда:
const isPartnerDriver = (driver) => {
    const id = driver.id || driver.driverId;
    return id === -1 || driver.isPartner === true || Boolean(driver.evosDriverCarInfo);
};

const isDriverOnline = (driver) => {
    if (isPartnerDriver(driver)) return true;
    return driver.isOnline === true || driver.online === true || driver.searchMode === 'ONLINE' || driver.status === 'ONLINE';
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
    let bearing = driver.bearing || 0;
    
    const prev = prevPositionsRef.current[driverId];
    if (prev) {
      if (prev.lat === lat && prev.lng === lng) {
        bearing = prev.bearing || bearing;
      } else {
        bearing = calculateBearing(prev.lat, prev.lng, lat, lng);
        prevPositionsRef.current[driverId] = { lat, lng, bearing };
      }
    } else {
      prevPositionsRef.current[driverId] = { lat, lng, bearing };
    }

    const isPartner = isPartnerDriver(driver);
    const isOnline = isDriverOnline(driver);

    // Выбираем оформление маркера
    let iconUrl;
    let badgeHtml = '';

    if (isPartner) {
      // Маркер партнера СОЗ: фиолетовый бейдж
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
      badgeHtml = `<span style="position: absolute; top: -10px; right: -10px; background: #7950f2; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 4px; border-radius: 4px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">СОЗ</span>`;
    } else if (isOnline) {
      // Наш водитель онлайн (зеленый или кастомный)
      iconUrl = customOnlineIcon?.options?.iconUrl || 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
    } else {
      // Наш водитель офлайн в приложении (серый)
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png';
    }

    const size = (isOnline && customOnlineIcon && !isPartner) 
      ? (customOnlineIcon.options.iconSize || [40, 40]) 
      : [25, 41];
    
    return L.divIcon({
      html: `<div style="position: relative; width: ${size[0]}px; height: ${size[1]}px; display: flex; align-items: center; justify-content: center;">
               <div style="transform: rotate(${Math.round(bearing)}deg); transform-origin: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.5s ease;">
                 <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
               </div>
               ${badgeHtml}
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
      
      {/* 1. Если заказ НЕ выбран — показываем водителей на карте */}
{/* 1. Если заказ НЕ выбран — показываем водителей на карте */}
{!selectedOrder && safeDrivers.map(driver => {
    const { lat, lng } = getCoords(driver);
    
    if (lat === null || lng === null || lat === 0 || lng === 0) return null;
    if (driver.searchMode === 'OFFLINE') return null;

    const rotatedIcon = getRotatedIcon(driver, lat, lng);

    return (
        <SmoothDriverMarker key={`driver-${driver.id || driver.driverId}`} position={[lat, lng]} icon={rotatedIcon}>
            <Popup>
                <strong>{driver.fullName}</strong><br/>
                ID: {driver.id || driver.driverId}<br/>
                {driver.isOnline ? '🟢 НА ЛІНІЇ' : '⚪ В ДОДАТКУ (ОФЛАЙН)'}
            </Popup>
        </SmoothDriverMarker>
    );
})}

      {/* 2. Если заказ выбран — рисуем его маршрут и привязанную машину */}
      {selectedOrder && (
        <>
          {/* Рендеринг назначенного водителя (локального или партнера) */}
          {selectedOrder.driver && (() => {
              const assignedDriver = safeDrivers.find(d => (d.id === selectedOrder.driver.id || d.driverId === selectedOrder.driver.id));
              
              // 🟢 Если водителя нет в общем списке онлайн-машин, берем координаты из selectedOrder.driver
              const driverObj = assignedDriver || {
                  ...selectedOrder.driver,
                  id: selectedOrder.driver.id || -1,
                  isOnline: true,
                  fullName: selectedOrder.driver.fullName || 'Водій'
              };

              const { lat, lng } = getCoords(driverObj);
              if (lat === null || lng === null || lat === 0 || lng === 0) return null;

              const rotatedIcon = getRotatedIcon(driverObj, lat, lng);

              return (
                  <SmoothDriverMarker key={`driver-assigned-${driverObj.id || 'partner'}`} position={[lat, lng]} icon={rotatedIcon}>
                    <Popup>
                      <strong>{driverObj.fullName}</strong><br/>
                      {driverObj.carModel ? `🚗 ${driverObj.carModel}` : ''} {driverObj.carPlateNumber ? `[${driverObj.carPlateNumber}]` : ''}<br/>
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

      // 👈 ДОБАВЛЕНО: Партнерский борт забронировал/принял предзаказ в EvoS
      if (order.isEvosDriverAssigned || order.evosDriverCarInfo) {
          return <span style={{color: '#7950f2', fontWeight: 'bold', fontSize: '0.85rem'}}>🤝 Закріплено за бортом СОЗ (EvoS)</span>;
      }

      if (!order.driver) {
          if (order.isSentToEvos) {
              return <span style={{fontSize: '0.8rem', color: '#1c7ed6', fontWeight: '700'}}>🌐 В ЕФІРІ EVOS (ОЧІКУЄ БОРТ)</span>;
          }
          return <span style={{fontSize: '0.8rem', color: '#868e96', fontWeight: '700'}}>🔍 ПОШУК ВОДІЯ...</span>;
      }

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

    {/* --- БЕЙДЖ СТАТУСА EVOS --- */}
    {order.isSentToEvos && (
        <span style={{ backgroundColor: '#e7f5ff', color: '#1c7ed6', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', border: '1px solid #a5d8ff' }}>
            🌐 Перекинуто в EvoS
        </span>
    )}

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
    
    {order.driver && order.driver.id !== -1 ? (
        /* 🟢 Свой локальный водитель */
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', color: '#343a40', fontSize: '1.05rem' }}>
                <a href={`/drivers?openId=${order.driver.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#2e7d32', textDecoration: 'underline' }}>
                    {order.driver.fullName}
                </a>
                <span style={{ backgroundColor: '#f1f3f5', color: '#212529', padding: '3px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid #ced4da', letterSpacing: '0.5px' }}>
                    {order.driver.carPlateNumber || order.carNumber || order.driver?.carLicensePlate || '—'}
                </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '2px' }}>
                🚗 {order.driver.carModel} {order.driver.carColor ? `(${order.driver.carColor})` : ''} • 📞 {order.driver.phoneNumber || order.driver.userPhone || '—'}
            </div>
        </div>
    ) : (order.isEvosDriverAssigned || (order.driver && order.driver.id === -1) || order.evosDriverCarInfo) ? (
        /* 🤝 Водитель из партнерской сети СОЗ (EvoS) */
        <div style={{ backgroundColor: '#f8f0fc', color: '#862e9c', padding: '10px 12px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #eebefa', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: '#5f3dc4' }}>🤝 Водій СОЗ (EvoS)</span>
                <span style={{ backgroundColor: '#e599f7', color: '#3b0764', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '900' }}>
                    {order.driver?.carPlateNumber || order.evosDriverCarInfo?.split(',')[0] || 'ПАРТНЕР'}
                </span>
            </div>
            <div style={{ fontWeight: '600', color: '#212529', fontSize: '0.92rem' }}>
                🚗 {order.driver?.carModel || order.evosDriverCarInfo || 'Партнерське авто'} {order.driver?.carColor ? `(${order.driver.carColor})` : ''}
            </div>
            {(order.driver?.phoneNumber || order.evosDriverPhone) && (
                <div style={{ fontSize: '0.85rem', color: '#1976d2', fontWeight: '600' }}>
                    📞 <a href={`tel:${order.driver?.phoneNumber || order.evosDriverPhone}`} style={{ color: '#1976d2', textDecoration: 'underline' }} onClick={(e) => e.stopPropagation()}>
                        {order.driver?.phoneNumber || order.evosDriverPhone}
                    </a>
                </div>
            )}
        </div>
    ) : (
        <div style={{ color: '#9bc2c1', fontStyle: 'italic', fontSize: '0.95rem', fontWeight: '500', padding: '2px 0' }}>
            {order.status === 'SCHEDULED' 
                ? (order.isSentToEvos ? '🌐 На біржі EvoS: очікує взяття водієм' : '🤖 Буде призначено автоматично')
                : '🔍 Пошук вільної машини...'}
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
    {order.paymentMethod === 'CARD' 
        ? '💳 Прив\'язка картки' 
        : order.paymentMethod === 'DRIVER_CARD' 
        ? '📲 Водію на картку' 
        : '💵 Готівка'}
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
    {/* 👈 ИСПРАВЛЕНО: Диспетчер может назначить локального водителя как на эфирный, так и на свободный предзаказ */}
    {(order.status === 'REQUESTED' || (order.status === 'SCHEDULED' && !order.driver && !order.isEvosDriverAssigned)) && (
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
        flex: (order.status === 'REQUESTED' || (order.status === 'SCHEDULED' && !order.driver && !order.isEvosDriverAssigned)) ? 1 : 'none', 
        width: (order.status === 'REQUESTED' || (order.status === 'SCHEDULED' && !order.driver && !order.isEvosDriverAssigned)) ? 'auto' : '100%',
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
          let w = parseInt(settings.driver_map_icon_width) || 40;
          let h = parseInt(settings.driver_map_icon_height) || 40;

          const backendHost = window.location.hostname === 'localhost' 
            ? 'http://localhost:8080' 
            : 'https://api.unitua.com';
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
      const targetUuid = selectedOrder.id;
      const targetIdLong = selectedOrder.idLong;
      
      const fetchTrackPoints = async () => {
        try {
          const targetId = targetIdLong || targetUuid;
          const points = await getOrderTrack(targetId);
          setSelectedOrderTrack(points);
        } catch (err) {
          console.error("Не вдалося завантажити трек:", err);
        }
      };

      fetchTrackPoints();

      // 🟢 Универсальный обработчик GPS координат водителя (штатного и партнера)
      const handleGpsUpdate = (message) => {
        try {
          const gpsData = JSON.parse(message.body);
          if (gpsData && gpsData.lat && gpsData.lng) {
            const partnerDriverId = selectedOrder.driver?.id ?? -1;
            const partnerDriverObj = {
              id: partnerDriverId,
              driverId: partnerDriverId,
              fullName: selectedOrder.driver?.fullName || 'Водій СОЗ (EvoS)',
              carModel: selectedOrder.driver?.carModel,
              carPlateNumber: selectedOrder.driver?.carPlateNumber,
              latitude: gpsData.lat,
              longitude: gpsData.lng,
              lat: gpsData.lat,
              lng: gpsData.lng,
              bearing: gpsData.bearing || 0,
              isOnline: true,
              searchMode: 'ONLINE'
            };

            setMapDrivers(prev => {
              const idx = prev.findIndex(d => (d.id === partnerDriverId || d.driverId === partnerDriverId));
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...partnerDriverObj };
                return updated;
              }
              return [...prev, partnerDriverObj];
            });

            // Мгновенно обновляем координаты в объекте выбранного заказа
            setSelectedOrder(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                driver: prev.driver ? {
                  ...prev.driver,
                  latitude: gpsData.lat,
                  longitude: gpsData.lng,
                  bearing: gpsData.bearing || 0
                } : prev.driver
              };
            });
          }
        } catch (e) {
          console.error("Помилка парсингу GPS даних трекінгу:", e);
        }
      };

      let subUuid = null;
      let subLong = null;

      if (stompClientRef.current && stompClientRef.current.connected) {
        if (targetUuid) subUuid = stompClientRef.current.subscribe(`/topic/admin/tracking/${targetUuid}`, handleGpsUpdate);
        if (targetIdLong) subLong = stompClientRef.current.subscribe(`/topic/admin/tracking/${targetIdLong}`, handleGpsUpdate);
      }

      let intervalId;
      if (['IN_PROGRESS', 'DRIVER_ARRIVED', 'ACCEPTED', 'ARRIVED_AT_WAYPOINT'].includes(selectedOrder.status)) {
        intervalId = setInterval(fetchTrackPoints, 10000);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (subUuid) subUuid.unsubscribe();
        if (subLong) subLong.unsubscribe();
      };
    } else {
      setSelectedOrderTrack([]);
    }
  }, [selectedOrder]);
  


  useEffect(() => {
    // Динамичне формування URL для WebSocket (працює і локально, і на сервері)
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/ws-taxi' 
      : 'https://api.unitua.com/ws-taxi';
    
    const socket = new SockJS(wsUrl);
    const token = localStorage.getItem('token');
    
    const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
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

// 1. Пакетное обновление локаций от планировщика
client.subscribe('/topic/admin/drivers-location', (message) => {
        const driverBatch = JSON.parse(message.body);
        if (Array.isArray(driverBatch)) {
            setMapDrivers(prev => {
                const driverMap = new Map();
                // Сохраняем всех текущих известных водителей
                prev.forEach(d => {
                    const id = d.id || d.driverId;
                    if (id) driverMap.set(id, d);
                });

                // Обновляем свежими координатами из батча
                driverBatch.forEach(d => {
                    const id = d.id || d.driverId;
                    if (id) {
                        const { lat, lng } = getCoords(d);
                        if (lat !== 0 && lng !== 0) {
                            const existing = driverMap.get(id) || {};
                            driverMap.set(id, { ...existing, ...d });
                        }
                    }
                });

                return Array.from(driverMap.values());
            });
        }
    });
    // 2. Одиночные обновления координат и удаление локации (logoutFromMap)
    client.subscribe('/topic/admin/drivers/locations', (message) => {
        const driverData = JSON.parse(message.body);
        updateDriverOnMap(driverData);
    });

    // 3. Изменение статуса водителя (online / offline / searchMode)
    client.subscribe('/topic/admin/drivers', (message) => {
        const driverData = JSON.parse(message.body);
        updateDriverOnMap(driverData);
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
    // Обновляем и ADD, и UPDATE
    if (msg.action === 'ADD' || msg.action === 'UPDATE') {
        setOrders(prevOrders => {
            const existingIndex = prevOrders.findIndex(o => o.id === msg.orderId);
            
            if (existingIndex !== -1) {
                const updated = [...prevOrders];
                updated[existingIndex] = msg.order;
                return updated;
            }
            return [msg.order, ...prevOrders];
        });

        // 🟢 ИСПРАВЛЕНИЕ: Если обновленный заказ сейчас выбран на карте диспетчера — 
        // сразу же обновляем selectedOrder, чтобы карта и карточка изменились мгновенно!
        setSelectedOrder(prevSelected => {
            if (prevSelected && (prevSelected.id === msg.orderId || prevSelected.idLong === msg.orderId)) {
                return msg.order;
            }
            return prevSelected;
        });

    } else if (msg.action === 'REMOVE') {
        setOrders(prevOrders => prevOrders.filter(o => o.id !== msg.orderId));
        setSelectedOrder(prevSelected => {
            if (prevSelected && (prevSelected.id === msg.orderId || prevSelected.idLong === msg.orderId)) {
                return null;
            }
            return prevSelected;
        });
    }
  };


const handleCancel = async (order) => { 
    const targetId = order.idLong || order.id; // 👈 Защита от undefined
    const reason = prompt(`Скасувати замовлення #${targetId}? Введіть причину (необов'язково):`);
    if (reason !== null) {
        try { 
            await cancelOrder(targetId, reason || 'Скасовано диспетчером'); 
            if (selectedOrder?.id === order.id) setSelectedOrder(null); 
        } catch (err) { alert(err.message); } 
    }
};

const updateDriverOnMap = (driverData) => {
    if (!driverData) return;
    const driverId = driverData.id || driverData.driverId;
    const { lat, lng } = getCoords(driverData);
    const mode = driverData.status || driverData.searchMode;

    const isLoggedOut = mode === 'OFFLINE' && (lat === 0 || lat === null);

    setMapDrivers(prev => {
        if (isLoggedOut) {
            return prev.filter(d => (d.id || d.driverId) !== driverId);
        } else {
            const idx = prev.findIndex(d => (d.id || d.driverId) === driverId);
            if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...driverData };
                return updated;
            }
            return [...prev, driverData];
        }
    });
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

const localDrivers = mapDrivers.filter(d => !isPartnerDriver(d));
  const onlineLocalDrivers = localDrivers.filter(d => isDriverOnline(d)).length;
  const offlineLocalDrivers = localDrivers.length - onlineLocalDrivers;
  const partnerDriversCount = mapDrivers.filter(d => isPartnerDriver(d)).length;

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
              <h3>Маршрут #{selectedOrder.idLong || selectedOrder.id}</h3>
          ) : (
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Водії:</h3>
                  <span title="Наші водії на лінії" style={{ color: '#2b8a3e', fontWeight: 'bold' }}>🟢 {onlineLocalDrivers}</span>
                  <span title="Наші водії в додатку (не на зміні)" style={{ color: '#868e96', fontWeight: 'bold' }}>⚪ {offlineLocalDrivers}</span>
                  {partnerDriversCount > 0 && (
                      <span title="Водії партнерської мережі СОЗ" style={{ color: '#7950f2', fontWeight: 'bold' }}>🤝 {partnerDriversCount}</span>
                  )}
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
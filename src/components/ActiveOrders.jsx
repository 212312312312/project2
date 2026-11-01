import React, { useState, useEffect, useRef } from 'react';
import { getActiveOrders, cancelOrder, assignDriverToOrder, getOrderTrack } from '../services/orderService';
import { getOnlineDriversForMap } from '../services/driverService'; 
import { getAllSettings } from '../services/settingsService';

// WebSocket
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import useInterval from '../hooks/useInterval'; 

import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
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

const isPartnerDriver = (driver) => {
    const id = driver.id || driver.driverId;
    return id === -1 || 
           driver.isPartner === true || 
           Boolean(driver.evosDriverCarInfo) || 
           driver.fullName === 'Партнер' ||
           driver.fullName?.includes('СОЗ');
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
        case 'ARRIVED_AT_WAYPOINT': return 'На проміжній точці';
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

// --- КОМПОНЕНТ ПЛАВНОГО МАРКЕРА ВОДИТЕЛЯ (С ОЧИСТКОЙ RAF!) ---
const SmoothDriverMarker = ({ position, icon, children }) => {
  const markerRef = useRef(null);
  const prevPositionRef = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const startPos = prevPositionRef.current;
    const endPos = position;

    if (startPos[0] === endPos[0] && startPos[1] === endPos[1]) {
      return;
    }

    let startTime = null;
    let animFrameId = null;
    const duration = 2500;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * progress;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * progress;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        prevPositionRef.current = endPos;
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
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
  const lastFocusedOrderIdRef = useRef(null);

  useEffect(() => {
    if (!selectedOrder) {
      lastFocusedOrderIdRef.current = null;
      return;
    }

    const currentOrderId = selectedOrder.idLong || selectedOrder.id;

    if (lastFocusedOrderIdRef.current === currentOrderId) {
      return;
    }

    if (selectedOrder.originLat && selectedOrder.destLat) {
      const bounds = [];
      bounds.push([selectedOrder.originLat, selectedOrder.originLng]);
      bounds.push([selectedOrder.destLat, selectedOrder.destLng]);
      if (selectedOrder.stops) {
        selectedOrder.stops.forEach(s => { if (s.lat) bounds.push([s.lat, s.lng]); });
      }

      if (bounds.length > 0) {
        lastFocusedOrderIdRef.current = currentOrderId;
        try { 
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 }); 
        } catch (e) {}
      }
    }
  }, [selectedOrder?.id, selectedOrder?.idLong, map]);

  useEffect(() => {
    if (!hasInitialZoom.current && drivers && drivers.length > 0 && !selectedOrder) {
      const bounds = [];
      drivers.forEach(d => {
        const { lat, lng } = getCoords(d);
        if (lat && lng && lat !== 0) bounds.push([lat, lng]);
      });
      if (bounds.length > 0) {
        hasInitialZoom.current = true;
        try { map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 }); } catch (e) {}
      }
    }
  }, [drivers?.length, selectedOrder, map]);

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
const DriverMap = ({ drivers, selectedOrder, customOnlineIcon, dbTrack, showPartnerDrivers = true }) => {
  const position = [50.45, 30.52]; 
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

    let iconUrl;
    let badgeHtml = '';

    if (isPartner) {
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
      badgeHtml = `<span style="position: absolute; top: -10px; right: -10px; background: #7950f2; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 4px; border-radius: 4px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">СОЗ</span>`;
    } else if (isOnline) {
      iconUrl = customOnlineIcon?.options?.iconUrl || 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
    } else {
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
      
      {!selectedOrder && safeDrivers.map(driver => {
        const { lat, lng } = getCoords(driver);
        
        if (lat === null || lng === null || lat === 0 || lng === 0) return null;
        if (driver.searchMode === 'OFFLINE') return null;
        if (!showPartnerDrivers && isPartnerDriver(driver)) return null;

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

      {selectedOrder && (
        <>
          {selectedOrder.driver && (() => {
              const assignedDriver = safeDrivers.find(d => (d.id === selectedOrder.driver.id || d.driverId === selectedOrder.driver.id));
              
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

          <Circle 
            center={[selectedOrder.originLat, selectedOrder.originLng]} 
            radius={1000} 
            pathOptions={{ color: '#7950f2', fillColor: '#7950f2', fillOpacity: 0.08, weight: 1, dashArray: '4, 6' }} 
          />
          {selectedOrder.stops?.map((stop, i) => (
             <Marker key={i} position={[stop.lat, stop.lng]} icon={waypointIcon}><Popup>{stop.address}</Popup></Marker>
          ))}
          <Marker position={[selectedOrder.destLat, selectedOrder.destLng]} icon={destIcon}>
             <Popup>Б: {selectedOrder.toAddress}</Popup>
          </Marker>
          {routePath && <Polyline positions={routePath} color="blue" />}

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

// --- СПИСОК ЗАКАЗОВ (ОПТИМИЗИРОВАННЫЙ ДИЗАЙН) ---
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
                <div style={{ color: '#1c7ed6', fontSize: '0.8rem', fontWeight: '700', padding: '5px 8px', backgroundColor: '#ebf5ff', borderRadius: '6px', border: '1px solid #d0ebff', textAlign: 'center' }}>
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
                <div style={{ color: '#2b8a3e', fontSize: '0.8rem', fontWeight: '700', padding: '5px 8px', backgroundColor: '#ebfbee', borderRadius: '6px', border: '1px solid #b2f2bb', textAlign: 'center' }}>
                    ⏱ Безкоштовне очікування: {remMin}хв {remSec}с
                </div>
            );
        } else {
            const paidMinutes = Math.floor(diffMinutesFull - freeMinutes);
            const currentExtraCost = paidMinutes * pricePerMin;
            return (
                <div style={{ color: '#c92a2a', fontSize: '0.8rem', fontWeight: '700', padding: '5px 8px', backgroundColor: '#fff5f5', borderRadius: '6px', border: '1px solid #ffc9c9', textAlign: 'center' }}>
                    ⏳ Платне очікування: {paidMinutes} хв (+{currentExtraCost.toFixed(2)} грн)
                </div>
            );
        }
    } 
    
    if ((order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') && order.waitingPrice > 0) {
        return (
            <div style={{ color: '#d9480f', fontSize: '0.8rem', fontWeight: '700', padding: '5px 8px', backgroundColor: '#fff4e6', borderRadius: '6px', border: '1px solid #ffd8a8', textAlign: 'center' }}>
                💰 Додано за очікування: {order.waitingPrice.toFixed(2)} грн
            </div>
        );
    }
    return null;
  };

  const renderConfirmationStatus = (order) => {
      if (order.status !== 'SCHEDULED') return null;

      if (order.isEvosDriverAssigned || order.evosDriverCarInfo) {
          return <span style={{color: '#7950f2', fontWeight: 'bold', fontSize: '0.8rem'}}>🤝 Закріплено за бортом СОЗ (EvoS)</span>;
      }

      if (!order.driver) {
          if (order.isSentToEvos) {
              return <span style={{fontSize: '0.78rem', color: '#1c7ed6', fontWeight: '700'}}>🌐 В ЕФІРІ EVOS (ОЧІКУЄ БОРТ)</span>;
          }
          return <span style={{fontSize: '0.78rem', color: '#868e96', fontWeight: '700'}}>🔍 ПОШУК ВОДІЯ...</span>;
      }

      if (order.isDriverConfirmed) {
          return <span style={{color: '#2b8a3e', fontWeight: 'bold', fontSize: '0.8rem'}}>✅ Підтверджено водієм</span>;
      } else {
          const nowTime = new Date();
          const scheduled = new Date(order.scheduledAt);
          const diffMinutes = (scheduled - nowTime) / 1000 / 60;

          if (diffMinutes < 35) {
              return <span style={{color: '#c92a2a', fontWeight: 'bold', fontSize: '0.8rem', animation: 'blink 1s infinite'}}>⚠️ НЕ ПІДТВЕРДЖЕНО!</span>;
          } else {
              return <span style={{color: '#d9480f', fontSize: '0.8rem', fontWeight: '600'}}>⏳ Очікує підтвердження</span>;
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
        const canAssignDriver = order.status === 'REQUESTED' || (order.status === 'SCHEDULED' && !order.driver && !order.isEvosDriverAssigned);

        const paymentLabel = order.paymentMethod === 'CARD' 
          ? '💳 Картка' 
          : order.paymentMethod === 'DRIVER_CARD' 
          ? '📲 На картку' 
          : '💵 Готівка';

        return (
          <div 
            key={order.id} 
            className={`order-card card-status-${order.status} ${selectedOrderId === order.id ? 'selected' : ''}`} 
            onClick={() => {
              if (selectedOrderId === order.id) onSelectOrder(null);
              else onSelectOrder(order);
            }}
          >
            {/* 1. ШАПКА: Слева ID + Тариф + Время, Справа Статус + Цена + Оплата */}
            <div className="order-card-header">
              <div className="order-header-left">
                <div className="order-id-row">
                  <h4 className="order-id-title">#{order.id}</h4>
                  <span className="tariff-badge">{order.tariffName || 'Стандарт'}</span>
                  {order.isSentToEvos && <span className="evos-badge">🌐 EvoS</span>}
                </div>
                <div className="order-time-meta">
                  <span>🕒 {formatTime(order.createdAt)}</span>
                  {order.status === 'SCHEDULED' && order.scheduledAt && (
                    <span className="order-scheduled-pill">⏰ На {formatTime(order.scheduledAt)}</span>
                  )}
                </div>
              </div>

              <div className="order-header-right">
                <span className={`status status-${order.status}`}>
                  {getStatusLabel(order.status)}
                </span>
                <div className="order-price-row">
                  {order.companyDiscountCompensation > 0 ? (
                    <>
                      <span className="order-price-main">{Math.round(order.clientPayAmount)} ₴</span>
                      <span className="order-price-comp">+{Math.round(order.companyDiscountCompensation)} ₴</span>
                    </>
                  ) : (
                    <span className="order-price-main">{Math.round(order.price)} ₴</span>
                  )}
                </div>
                <div className="order-payment-meta">
                  <span>{paymentLabel}</span>
                  {order.distanceMeters > 0 && (
                    <span className="order-distance-pill">{distanceKm} км • {pricePerKm} ₴/км</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. МАРШРУТ (Компактный и наглядный блок) */}
            <div className="order-route-box">
              <div className="route-point">
                <span className="route-dot route-dot-origin" />
                <span>{order.fromAddress}</span>
              </div>
              {order.stops?.map((stop, i) => (
                <div key={i} className="route-point route-stop-text">
                  <span className="route-dot route-dot-stop" />
                  <span>{stop.address}</span>
                </div>
              ))}
              <div className="route-point">
                <span className="route-dot route-dot-dest" />
                <span>{order.toAddress}</span>
              </div>
            </div>

            {/* 3. УЧАСТНИКИ: Пассажир и Водитель */}
            <div className="order-participants-box">
              {/* Пассажир */}
              <div className="participant-row">
                <span className="participant-label">Клієнт</span>
                <div className="participant-info">
                  <a 
                    href={`/client-info?phone=${clientPhone}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="client-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.client?.fullName || 'Гість'}
                  </a>
                  <span className="phone-badge">📞 {clientPhone}</span>
                </div>
              </div>

              {/* Водитель */}
              {order.driver && order.driver.id !== -1 ? (
                <div>
                  <div className="participant-row">
                    <span className="participant-label">Водій</span>
                    <div className="participant-info">
                      <a 
                        href={`/drivers?openId=${order.driver.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="driver-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.driver.fullName}
                      </a>
                      <span className="car-plate-badge">
                        {order.driver.carPlateNumber || order.carNumber || order.driver?.carLicensePlate || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="driver-car-sub">
                    🚗 {order.driver.carModel} {order.driver.carColor ? `(${order.driver.carColor})` : ''} • 📞 {order.driver.phoneNumber || order.driver.userPhone || '—'}
                  </div>
                </div>
              ) : (order.isEvosDriverAssigned || (order.driver && order.driver.id === -1) || order.evosDriverCarInfo) ? (
                <div className="partner-driver-box">
                  <div>
                    <strong style={{ color: '#5f3dc4' }}>🤝 Водій СОЗ: </strong>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {order.driver?.carModel || order.evosDriverCarInfo || 'Партнерське авто'} {order.driver?.carColor ? `(${order.driver.carColor})` : ''}
                    </span>
                    {(order.driver?.phoneNumber || order.evosDriverPhone) && (
                      <span style={{ marginLeft: '8px' }}>
                        📞 <a 
                          href={`tel:${order.driver?.phoneNumber || order.evosDriverPhone}`} 
                          style={{ color: '#1976d2', fontWeight: 600 }} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.driver?.phoneNumber || order.evosDriverPhone}
                        </a>
                      </span>
                    )}
                  </div>
                  <span className="partner-plate-badge">
                    {order.driver?.carPlateNumber || order.evosDriverCarInfo?.split(',')[0] || 'ПАРТНЕР'}
                  </span>
                </div>
              ) : (
                <div className="participant-row">
                  <span className="participant-label">Водій</span>
                  <span className="driver-searching-placeholder">
                    {order.status === 'SCHEDULED' 
                      ? (order.isSentToEvos ? '🌐 На біржі EvoS: очікує взяття водієм' : '🤖 Буде призначено автоматично')
                      : '🔍 Пошук вільної машини...'}
                  </span>
                </div>
              )}
            </div>

            {/* Статус подтверждения для запланированных */}
            {order.status === 'SCHEDULED' && (
              <div className="scheduled-confirm-banner">
                {renderConfirmationStatus(order)}
              </div>
            )}

            {/* Инфо об ожидании */}
            {renderWaitingInfo(order)}

            {/* 4. КНОПКИ ДЕЙСТВИЙ */}
            <div className="order-card-actions">
              {canAssignDriver && (
                <button 
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={(e) => { e.stopPropagation(); onAssign(order); }}
                >
                  Призначити водія
                </button>
              )}
              <button 
                className="btn-danger" 
                style={{ flex: canAssignDriver ? 1 : 'none', width: canAssignDriver ? 'auto' : '100%' }} 
                onClick={(e) => { e.stopPropagation(); onCancel(order); }}
              >
                Скасувати
              </button>
            </div>
          </div>
        );
      })}
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
  const [showPartnerDrivers, setShowPartnerDrivers] = useState(true);

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

  const fetchInitialDrivers = async () => {
    try {
      const drivers = await getOnlineDriversForMap();
      if (Array.isArray(drivers)) {
        setMapDrivers(drivers);
      }
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
    fetchActiveOrders();
    fetchInitialDrivers();

    const wsUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/ws-taxi' 
      : 'https://api.unitua.com/ws-taxi';
    
    const client = new Client({
        // ВАЖЛИВО: Створюємо новий SockJS при кожній спробі з'єднання, щоб працював авто-реконект!
        webSocketFactory: () => new SockJS(wsUrl),
        reconnectDelay: 5000,
        beforeConnect: () => {
          const currentToken = localStorage.getItem('token');
          client.connectHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
        },
        onConnect: () => {
          console.log('Connected to Dispatcher WebSocket');
          fetchActiveOrders(); 

          client.subscribe('/topic/admin/orders', (message) => {
              const msg = JSON.parse(message.body);
              handleSocketMessage(msg);
          });

          // Батч координат водіїв (раз на 3 секунди) — оптимізовано під High-Load (500+ авто без фризів браузера)
          client.subscribe('/topic/admin/drivers-location', (message) => {
              const driverBatch = JSON.parse(message.body);
              if (Array.isArray(driverBatch)) {
                  setMapDrivers(prev => {
                      const driverMap = new Map();
                      prev.forEach(d => {
                          const id = d.id || d.driverId;
                          if (id) driverMap.set(id, d);
                      });

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

          // Миттєві зміни статусів водіїв (вихід на лінію / офлайн)
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
      const targetId = order.idLong || order.id;
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
        if (o.status === 'SCHEDULED') return false;

        let matchStatus = true;
        if (statusFilter === 'ACTIVE') {
            matchStatus = ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'OFFERING', 'ARRIVED_AT_WAYPOINT'].includes(o.status);
        } else if (statusFilter !== 'ALL') {
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
          
          <div className="orders-filter-row">
            <div className="orders-search-wrapper">
              <span className="orders-search-icon">🔍</span>
              <input 
                type="text" 
                className="orders-search-input"
                placeholder="Пошук за телефоном або ID..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            {activeTab === 'ACTIVE' && (
              <select 
                className="orders-status-select"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Всі активні</option>
                <option value="ACTIVE">В роботі (всі)</option>
                <option value="REQUESTED">Пошук водія</option>
                <option value="OFFERING">Пропонуємо</option>
                <option value="ACCEPTED">Водій їде</option>
                <option value="DRIVER_ARRIVED">Очікує пасажира</option>
                <option value="IN_PROGRESS">В дорозі</option>
                <option value="ARRIVED_AT_WAYPOINT">На зупинці</option>
              </select>
            )}
          </div>
        </div>
        
        <OrderList orders={filteredOrders} onCancel={handleCancel} onAssign={handleAssign} onSelectOrder={setSelectedOrder} selectedOrderId={selectedOrder?.id} />
      </div>
      
      <div className="map-container">
        <div className="orders-list-header">
          {selectedOrder ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Маршрут #{selectedOrder.idLong || selectedOrder.id}</h3>
            </div>
          ) : (
            <div className="drivers-status-bar">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginRight: '4px' }}>
                Водії:
              </span>
              
              <div className="driver-pill driver-pill-online" title="Водії на лінії готові до замовлень">
                <span className="status-dot dot-online" />
                <span>На лінії: <strong>{onlineLocalDrivers}</strong></span>
              </div>

              <div className="driver-pill driver-pill-offline" title="У додатку, але не на зміні">
                <span className="status-dot dot-offline" />
                <span>Офлайн: <strong>{offlineLocalDrivers}</strong></span>
              </div>

              {partnerDriversCount > 0 && (
                <div 
                  className={`driver-pill driver-pill-partner ${!showPartnerDrivers ? 'driver-pill-dimmed' : ''}`} 
                  title="Натисніть, щоб приховати/показати борти СОЗ на карті"
                  onClick={() => setShowPartnerDrivers(prev => !prev)}
                  style={{ cursor: 'pointer', opacity: showPartnerDrivers ? 1 : 0.45 }}
                >
                  <span className="status-dot dot-partner" />
                  <span>СОЗ: <strong>{partnerDriversCount}</strong> {showPartnerDrivers ? '👁️' : '🙈'}</span>
                </div>
              )}
            </div>
          )}
          
          {selectedOrder && (
            <button className="btn-reset-order" onClick={() => setSelectedOrder(null)}>
              ✕ Показати всіх водіїв
            </button>
          )}
        </div>
        <DriverMap 
          drivers={mapDrivers} 
          selectedOrder={selectedOrder} 
          customOnlineIcon={onlineIcon} 
          dbTrack={selectedOrderTrack} 
          showPartnerDrivers={showPartnerDrivers} 
        />
      </div>
    </div>
  );
};

export default ActiveOrders;
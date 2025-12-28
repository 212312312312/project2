import React, { useState, useEffect } from 'react';
import { 
  getActiveOrders, 
  getOnlineDriversForMap, 
  cancelOrder, 
  assignDriverToOrder 
} from '../services/orderService';
import useInterval from '../hooks/useInterval'; 

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet'; 
import polyline from '@mapbox/polyline';

// --- ИКОНКИ ---
// Водитель
const driverIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
// Точка А (Зеленая)
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
// Точка Б (Красная)
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
// Зупинка (Желтая)
const waypointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41]
});
// ---

/**
 * Компонент, который автоматически центрирует карту
 */
const MapFocusController = ({ selectedOrder }) => {
  const map = useMap(); 

  useEffect(() => {
    if (selectedOrder && selectedOrder.originLat && selectedOrder.destLat) {
      // Собираем все точки для границ (А, Б + Зупинки)
      const bounds = [
        [selectedOrder.originLat, selectedOrder.originLng],
        [selectedOrder.destLat, selectedOrder.destLng]
      ];
      
      // Добавляем зупинки в границы, если они есть
      if (selectedOrder.stops && selectedOrder.stops.length > 0) {
        selectedOrder.stops.forEach(stop => {
            if (stop.lat && stop.lng) {
                bounds.push([stop.lat, stop.lng]);
            }
        });
      }

      map.fitBounds(bounds, { padding: [50, 50] }); 
    }
  }, [selectedOrder, map]);

  return null;
};


// --- Компонент Карты ---
const DriverMap = ({ drivers, selectedOrder }) => {
  const position = [50.45, 30.52]; 
  
  // Логика отрисовки маршрута
  let routePath = null;
  if (selectedOrder) {
    if (selectedOrder.googleRoutePolyline) {
      routePath = polyline.decode(selectedOrder.googleRoutePolyline);
    } else if (selectedOrder.originLat && selectedOrder.destLat) {
      // Если полилайна нет, рисуем прямые линии через точки
      routePath = [[selectedOrder.originLat, selectedOrder.originLng]];
      if (selectedOrder.stops) {
          selectedOrder.stops.forEach(s => routePath.push([s.lat, s.lng]));
      }
      routePath.push([selectedOrder.destLat, selectedOrder.destLng]);
    }
  }

  return (
    <MapContainer center={position} zoom={11} className="leaflet-container">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* 1. Показываем водителей (если заказ НЕ выбран) */}
      {!selectedOrder && drivers.map(driver => (
        <Marker 
          key={`driver-${driver.id}`} 
          position={[driver.latitude, driver.longitude]}
          icon={driverIcon}
        >
          <Popup>ID: {driver.id} <br/> {driver.fullName}</Popup>
        </Marker>
      ))}

      {/* 2. Показываем выбранный маршрут */}
      {selectedOrder && (
        <>
          {/* Точка А */}
          <Marker 
            position={[selectedOrder.originLat, selectedOrder.originLng]} 
            icon={originIcon}
          >
            <Popup><b>Точка А (Откуда):</b><br/>{selectedOrder.fromAddress}</Popup>
          </Marker>
          
          {/* Зупинки (Waypoints) */}
          {selectedOrder.stops && selectedOrder.stops.map((stop, index) => (
             <Marker 
                key={`wp-${index}`}
                position={[stop.lat, stop.lng]} 
                icon={waypointIcon}
             >
                <Popup><b>Зупинка #{index + 1}:</b><br/>{stop.address}</Popup>
             </Marker>
          ))}

          {/* Точка Б */}
          <Marker 
            position={[selectedOrder.destLat, selectedOrder.destLng]} 
            icon={destIcon}
          >
            <Popup><b>Точка Б (Куда):</b><br/>{selectedOrder.toAddress}</Popup>
          </Marker>
          
          {/* Линия маршрута */}
          {routePath && <Polyline positions={routePath} color="blue" />}
        </>
      )}
      
      <MapFocusController selectedOrder={selectedOrder} />
    </MapContainer>
  );
};


// --- Компонент OrderList (ОБНОВЛЕН) ---
const OrderList = ({ orders, onCancel, onAssign, onSelectOrder, selectedOrderId }) => {
  return (
    <div className="orders-list">
      {orders.length === 0 && <p style={{padding: '1.5rem'}}>Активных заказов нет.</p>}
      {orders.map(order => (
        <div 
          key={order.id} 
          className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`}
          onClick={() => onSelectOrder(order)}
        >
          <div className="order-card-header">
            <h4>Заказ #{order.id} ({order.tariffName})</h4>
            <span className={`status status-${order.status}`}>{order.status}</span>
          </div>
          <div className="order-card-body">
            <p><strong>Клиент:</strong> {order.client.fullName} ({order.client.phoneNumber})</p>
            
            {/* ОТОБРАЖЕНИЕ МАРШРУТА С ЗУПИНКАМИ */}
            <div className="route-details" style={{marginTop: '5px', marginBottom: '10px'}}>
                <div>🟢 <b>Откуда:</b> {order.fromAddress}</div>
                
                {order.stops && order.stops.length > 0 && order.stops.map((stop, i) => (
                    <div key={i} style={{marginLeft: '15px', color: '#666'}}>
                        📍 <i>Заезд: {stop.address}</i>
                    </div>
                ))}
                
                <div>🔴 <b>Куда:</b> {order.toAddress}</div>
            </div>

            {/* --- БЛОК ЦЕНЫ И НАДБАВКИ --- */}
            <p><strong>Цена:</strong> {order.price.toFixed(2)} грн</p>
            
            {/* Если есть надбавка, показываем её красным */}
            {order.addedValue > 0 && (
                <p style={{ color: '#d32f2f', marginTop: '-5px', marginBottom: '10px', fontWeight: 'bold' }}>
                    🔥 Надбавка: +{order.addedValue.toFixed(2)} грн
                </p>
            )}
            {/* --------------------------- */}
                  
            <p>
            <strong>Оплата:</strong> 
            {order.paymentMethod === 'CARD' ? ' 💳 Картка' : ' 💵 Готівка'}
            </p>

            {/* === БЛОК КОММЕНТАРИЯ === */}
            {order.comment && (
              <div style={{
                marginTop: '8px',
                marginBottom: '8px',
                padding: '10px',
                borderRadius: '6px',
                color: '#000000ff',
                fontSize: '0.95em'
              }}>
                <strong>Коментар:</strong> {order.comment}
              </div>
            )}
            {/* ======================== */}

            <p><strong>Водитель:</strong> {order.driver ? 
                `${order.driver.fullName} (${order.driver.carPlateNumber})` : 
                '--- Назначение ---'}
            </p>
          </div>
          <div className="order-card-actions">
            {order.status === 'REQUESTED' && (
              <button 
                className="btn-primary" 
                onClick={(e) => { e.stopPropagation(); onAssign(order.id); }}
              >
                Назначить
              </button>
            )}
            <button 
              className="btn-danger"
              onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
            >
              Отменить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};


// --- Компонент ActiveOrders ---
const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [mapDrivers, setMapDrivers] = useState([]);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); 

  const fetchActiveOrders = async () => {
    try {
      const data = await getActiveOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    }
  };
  const fetchMapDrivers = async () => {
    try {
      const data = await getOnlineDriversForMap();
      setMapDrivers(data);
    } catch (err) {
      console.error(err.message);
    }
  };
  useEffect(() => {
    fetchActiveOrders();
    fetchMapDrivers();
  }, []);
  useInterval(fetchActiveOrders, 10000); 
  useInterval(fetchMapDrivers, 5000);
  
  const updateOrderInList = (updatedOrder) => {
    setOrders(prevOrders => 
      prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
    );
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
  };
  const handleCancel = async (orderId) => {
    if (window.confirm(`Отменить заказ #${orderId}?`)) {
      try {
        setError('');
        await cancelOrder(orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };
  const handleAssign = async (orderId) => {
    const driverId = prompt(`Назначить заказ #${orderId}. \nВведите ID водителя:`);
    if (driverId && !isNaN(driverId)) {
      try {
        setError('');
        const updatedOrder = await assignDriverToOrder(orderId, parseInt(driverId));
        updateOrderInList(updatedOrder);
      } catch (err) {
        setError(err.message);
      }
    }
  };
  const handleSelectOrder = (order) => {
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder(null); 
    } else {
      setSelectedOrder(order);
    }
  };

  return (
    <div className="active-orders-layout">
      <div className="orders-list-container">
        <div className="orders-list-header">
          <h3>
            Активные заказы ({orders.length})
            {selectedOrder && (
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="btn-secondary" 
                style={{marginLeft: '20px', padding: '0.2rem 0.5rem'}}
              >
                Показать всех водителей
              </button>
            )}
          </h3>
        </div>
        {error && <div className="error-message">{error}</div>}
        <OrderList 
          orders={orders} 
          onCancel={handleCancel} 
          onAssign={handleAssign}
          onSelectOrder={handleSelectOrder}
          selectedOrderId={selectedOrder?.id}
        />
      </div>
      <div className="map-container">
        <div className="orders-list-header">
          <h3>
            {selectedOrder ? 
              `Маршрут заказа #${selectedOrder.id}` : 
              `Водители ONLINE (${mapDrivers.length})`}
          </h3>
        </div>
        <DriverMap 
          drivers={mapDrivers} 
          selectedOrder={selectedOrder} 
        />
      </div>
    </div>
  );
};
export default ActiveOrders;
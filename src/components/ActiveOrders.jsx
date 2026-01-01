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
      const bounds = [
        [selectedOrder.originLat, selectedOrder.originLng],
        [selectedOrder.destLat, selectedOrder.destLng]
      ];
      
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
  
  let routePath = null;
  if (selectedOrder) {
    if (selectedOrder.googleRoutePolyline) {
      routePath = polyline.decode(selectedOrder.googleRoutePolyline);
    } else if (selectedOrder.originLat && selectedOrder.destLat) {
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
      
      {!selectedOrder && drivers.map(driver => (
        <Marker 
          key={`driver-${driver.id}`} 
          position={[driver.latitude, driver.longitude]}
          icon={driverIcon}
        >
          <Popup>ID: {driver.id} <br/> {driver.fullName}</Popup>
        </Marker>
      ))}

      {selectedOrder && (
        <>
          <Marker 
            position={[selectedOrder.originLat, selectedOrder.originLng]} 
            icon={originIcon}
          >
            <Popup><b>Точка А (Откуда):</b><br/>{selectedOrder.fromAddress}</Popup>
          </Marker>
          
          {selectedOrder.stops && selectedOrder.stops.map((stop, index) => (
             <Marker 
                key={`wp-${index}`}
                position={[stop.lat, stop.lng]} 
                icon={waypointIcon}
             >
                <Popup><b>Зупинка #{index + 1}:</b><br/>{stop.address}</Popup>
             </Marker>
          ))}

          <Marker 
            position={[selectedOrder.destLat, selectedOrder.destLng]} 
            icon={destIcon}
          >
            <Popup><b>Точка Б (Куда):</b><br/>{selectedOrder.toAddress}</Popup>
          </Marker>
          
          {routePath && <Polyline positions={routePath} color="blue" />}
        </>
      )}
      
      <MapFocusController selectedOrder={selectedOrder} />
    </MapContainer>
  );
};


// --- Компонент OrderList ---
const OrderList = ({ orders, onCancel, onAssign, onSelectOrder, selectedOrderId }) => {
  return (
    <div className="orders-list">
      {orders.length === 0 && <p style={{padding: '1.5rem'}}>Активних замовлень немає (або не знайдено).</p>}
      {orders.map(order => (
        <div 
          key={order.id} 
          className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`}
          onClick={() => onSelectOrder(order)}
        >
          <div className="order-card-header">
            <h4>Замовлення #{order.id} ({order.tariffName})</h4>
            <span className={`status status-${order.status}`}>{order.status}</span>
          </div>
          <div className="order-card-body">
            <p><strong>Клієнт:</strong> {order.client.fullName} ({order.client.phoneNumber})</p>
            
            <div className="route-details" style={{marginTop: '5px', marginBottom: '10px'}}>
                <div>🟢 <b>Звідки:</b> {order.fromAddress}</div>
                
                {order.stops && order.stops.length > 0 && order.stops.map((stop, i) => (
                    <div key={i} style={{marginLeft: '15px', color: '#666'}}>
                        📍 <i>Заїзд: {stop.address}</i>
                    </div>
                ))}
                
                <div>🔴 <b>Куди:</b> {order.toAddress}</div>
            </div>

            <p><strong>Цена:</strong> {Math.round(order.price)} грн</p>
            
            {order.addedValue > 0 && (
                <p style={{ color: '#d32f2f', marginTop: '-5px', marginBottom: '5px', fontWeight: 'bold' }}>
                    🔥 Надбавка: +{Math.round(order.addedValue)} грн
                </p>
            )}

            {order.services && order.services.length > 0 && (
               <p style={{ marginTop: '2px', marginBottom: '8px' }}>
                 <strong>🛠 Послуги: </strong>
                 {order.services.map(s => s.name).join(', ')}
               </p>
            )}
                  
            <p>
            <strong>Оплата:</strong> 
            {order.paymentMethod === 'CARD' ? ' 💳 Картка' : ' 💵 Готівка'}
            </p>

            {order.comment && (
              <div style={{
                marginTop: '8px',
                marginBottom: '8px',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#fff3cd', 
                color: '#856404',
                fontSize: '0.95em',
                border: '1px solid #ffeeba'
              }}>
                <strong>📝 Коментар:</strong> {order.comment}
              </div>
            )}

            <p><strong>Водій:</strong> {order.driver ? 
                `${order.driver.fullName} (${order.driver.carPlateNumber})` : 
                '--- Призначення ---'}
            </p>
          </div>
          <div className="order-card-actions">
            {order.status === 'REQUESTED' && (
              <button 
                className="btn-primary" 
                onClick={(e) => { e.stopPropagation(); onAssign(order.id); }}
              >
                Призначити
              </button>
            )}
            <button 
              className="btn-danger"
              onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
            >
              Скасувати
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Компонент ActiveOrders (ОБНОВЛЕН) ---
const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [mapDrivers, setMapDrivers] = useState([]);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); 

  // --- НОВІ СТЕЙТИ ДЛЯ ФІЛЬТРАЦІЇ ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchActiveOrders = async () => {
    try {
      const data = await getActiveOrders();
      // Сортуємо: новіші за ID зверху
      const sortedData = data.sort((a, b) => b.id - a.id);
      setOrders(sortedData);
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

  // --- ЛОГІКА ФІЛЬТРАЦІЇ ---
  const filteredOrders = orders.filter(order => {
    // 1. Фільтр по телефону
    const matchesSearch = order.client.phoneNumber.includes(searchTerm);
    
    // 2. Фільтр по статусу
    let matchesStatus = true;
    if (statusFilter === 'REQUESTED') {
        matchesStatus = order.status === 'REQUESTED';
    } else if (statusFilter === 'ACTIVE') {
        // ACCEPTED або IN_PROGRESS
        matchesStatus = (order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS');
    }
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="active-orders-layout">
      <div className="orders-list-container">
        
        {/* ХЕДЕР З ФІЛЬТРАМИ */}
        <div className="orders-list-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '10px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
              <h3>Активные заказы ({filteredOrders.length})</h3>
              {selectedOrder && (
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="btn-secondary" 
                  style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                >
                  Сброс карты
                </button>
              )}
          </div>

          <div className="filters-row" style={{display: 'flex', gap: '10px', width: '100%'}}>
              <input 
                type="text" 
                placeholder="🔍 Пошук за телефоном..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                    flex: 1, 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ccc'
                }}
              />
              
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ccc'
                }}
              >
                  <option value="ALL">Всі статуси</option>
                  <option value="REQUESTED">Пошук (Requested)</option>
                  <option value="ACTIVE">В роботі (Active)</option>
              </select>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <OrderList 
          orders={filteredOrders} 
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
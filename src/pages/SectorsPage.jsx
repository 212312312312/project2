import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import sectorService from '../services/sectorService';

import 'leaflet/dist/leaflet.css';
import '../assets/SectorsPage.css';

// Вспомогательная функция для поиска центра полигона (чтобы поставить название)
const getPolygonCenter = (points) => {
    if (!points || points.length === 0) return [0, 0];
    const latlngs = points.map(p => [p.lat, p.lng]);
    const bounds = L.latLngBounds(latlngs);
    return bounds.getCenter();
};

const GeomanControl = ({ isDrawing, onPolygonComplete }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        map.pm.setLang('uk');

        map.on('pm:create', (e) => {
            const { layer } = e;
            if (layer instanceof L.Polygon) {
                const coords = layer.getLatLngs()[0].map(latlng => ({
                    lat: latlng.lat,
                    lng: latlng.lng
                }));
                
                // Передаем координаты в родительский компонент
                onPolygonComplete(coords);
                
                // Удаляем слой Geoman, так как мы отрисуем его через React Polygon (Preview)
                map.removeLayer(layer); 
            }
        });

        return () => map.off('pm:create');
    }, [map, onPolygonComplete]);

    useEffect(() => {
        if (isDrawing) {
            map.pm.enableDraw('Polygon', {
                snappable: true,
                continueDrawing: false,
                hintText: "Клікайте, щоб малювати. Натисніть на першу точку, щоб замкнути."
            });
        } else {
            map.pm.disableDraw();
        }
    }, [isDrawing, map]);

    return null;
};

const SectorsPage = () => {
    const [sectors, setSectors] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [newPoints, setNewPoints] = useState(null); // Координаты нового сектора
    const [name, setName] = useState('');
    const position = [50.45, 30.52];

    useEffect(() => { loadSectors(); }, []);

    const loadSectors = async () => {
        try {
            const data = await sectorService.getAllSectors();
            setSectors(data);
        } catch (e) { console.error(e); }
    };

    const handlePolygonComplete = useCallback((coords) => {
        setNewPoints(coords);
        setIsDrawing(false);
    }, []);

    const handleSave = async () => {
        if (!name) return alert("Введіть назву сектора");
        try {
            await sectorService.createSector({ name, points: newPoints });
            setName('');
            setNewPoints(null);
            loadSectors();
        } catch (e) { alert("Помилка збереження"); }
    };

    const handleDiscard = () => {
        setNewPoints(null);
        setName('');
    };

    const handleDelete = async (id) => {
        if (window.confirm("Видалити цей сектор?")) {
            await sectorService.deleteSector(id);
            loadSectors();
        }
    };

    return (
        <div className="sectors-page">
            <div className="sectors-sidebar">
                <h2>Сектори</h2>
                <button 
                    className={`add-sector-btn ${isDrawing ? 'cancel' : ''}`}
                    onClick={() => {
                        setIsDrawing(!isDrawing);
                        setNewPoints(null);
                    }}
                >
                    {isDrawing ? 'Скасувати малювання' : '+ Створити сектор'}
                </button>

                {newPoints && (
                    <div className="save-sector-box">
                        <label>Новий сектор намальовано!</label>
                        <input 
                            type="text" 
                            placeholder="Введіть назву..." 
                            value={name}
                            autoFocus
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className="box-actions">
                            <button onClick={handleSave} className="save-btn">Зберегти</button>
                            <button onClick={handleDiscard} className="discard-btn">Скинути</button>
                        </div>
                    </div>
                )}

                <div className="sectors-list">
                    {sectors.map(s => (
                        <div key={s.id} className="sector-card">
                            <span className="sector-name">{s.name}</span>
                            <button className="del-btn" onClick={() => handleDelete(s.id)}>🗑️</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="map-view">
                <MapContainer center={position} zoom={11} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* 1. ПОДТВЕРЖДЕННЫЕ СЕКТОРЫ (из базы) */}
                    {sectors.map(s => (
                        <Polygon 
                            key={s.id}
                            positions={s.points.map(p => [p.lat, p.lng])}
                            pathOptions={{ fillColor: '#00ffaa', fillOpacity: 0.15, color: '#00ffaa', weight: 2 }}
                        >
                            <Tooltip permanent direction="center" className="sector-label">
                                {s.name}
                            </Tooltip>
                        </Polygon>
                    ))}

                    {/* 2. ПРЕДПРОСМОТР НОВОГО СЕКТОРА (пока не нажали Сохранить) */}
                    {newPoints && (
                        <Polygon 
                            positions={newPoints.map(p => [p.lat, p.lng])}
                            pathOptions={{ fillColor: '#ffcc00', fillOpacity: 0.4, color: '#ffcc00', weight: 3, dashArray: '5, 5' }}
                        >
                            <Tooltip permanent direction="center" className="sector-label-preview">
                                {name || "Без назви"}
                            </Tooltip>
                        </Polygon>
                    )}

                    <GeomanControl 
                        isDrawing={isDrawing} 
                        onPolygonComplete={handlePolygonComplete} 
                    />
                </MapContainer>
            </div>
        </div>
    );
};

export default SectorsPage;
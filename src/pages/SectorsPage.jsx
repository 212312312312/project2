import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import sectorService from '../services/sectorService';

import 'leaflet/dist/leaflet.css';
import '../assets/SectorsPage.css';

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
                
                onPolygonComplete(coords);
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
    const [newPoints, setNewPoints] = useState(null);
    
    // Стан форми
    const [name, setName] = useState('');
    const [isCity, setIsCity] = useState(true);

    const position = [50.45, 30.52];

    useEffect(() => { loadSectors(); }, []);

    const loadSectors = async () => {
        try {
            const data = await sectorService.getAllSectors();
            setSectors(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const handlePolygonComplete = useCallback((coords) => {
        setNewPoints(coords);
        setIsDrawing(false);
    }, []);

    const handleSave = async () => {
        if (!name) return alert("Введіть назву сектора");
        try {
            await sectorService.createSector({ name, isCity, points: newPoints });
            
            setName('');
            setIsCity(true); 
            setNewPoints(null);
            
            loadSectors();
        } catch (e) { alert("Помилка збереження"); }
    };

    const handleDiscard = () => {
        setNewPoints(null);
        setName('');
        setIsCity(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Видалити цей сектор?")) {
            await sectorService.deleteSector(id);
            loadSectors();
        }
    };

    const handleRename = async (id, currentName) => {
        const newName = window.prompt("Введіть нову назву сектора:", currentName);
        if (newName && newName.trim() !== '' && newName !== currentName) {
            try {
                await sectorService.updateSectorName(id, newName.trim());
                loadSectors();
            } catch (e) {
                alert("Помилка при зміні назви сектора");
            }
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
                        
                        <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                            <input 
                                type="checkbox" 
                                id="chkIsCity" 
                                checked={isCity} 
                                onChange={(e) => setIsCity(e.target.checked)} 
                                style={{ width: 'auto', marginRight: '8px' }}
                            />
                            <label htmlFor="chkIsCity" style={{ marginBottom: 0, cursor: 'pointer' }}>
                                Це зона міста? (Тариф "Стандарт")
                            </label>
                        </div>
                        {!isCity && <small style={{color: '#ff9800'}}>Буде діяти тариф "За містом"</small>}

                        <div className="box-actions">
                            <button onClick={handleSave} className="save-btn">Зберегти</button>
                            <button onClick={handleDiscard} className="discard-btn">Скинути</button>
                        </div>
                    </div>
                )}

                <div className="sectors-list">
                    {sectors.map(s => (
                        <div key={s.id} className="sector-card" style={{ borderLeft: s.isCity ? '4px solid #00ffaa' : '4px solid #ff9800' }}>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                                <span className="sector-name">{s.name}</span>
                                <span style={{fontSize: '0.8em', color: '#888'}}>
                                    {s.isCity ? "🏙️ Місто" : "🌲 За містом"}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button className="edit-btn" onClick={() => handleRename(s.id, s.name)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Перейменувати">✏️</button>
                                <button className="del-btn" onClick={() => handleDelete(s.id)}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="map-view">
                <MapContainer center={position} zoom={11} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {sectors.map(s => (
                        <Polygon 
                            key={s.id}
                            positions={s.points.map(p => [p.lat, p.lng])}
                            pathOptions={{ 
                                fillColor: s.isCity ? '#00ffaa' : '#ff9800', 
                                fillOpacity: 0.2, 
                                color: s.isCity ? '#00ffaa' : '#ff9800', 
                                weight: 2 
                            }}
                        >
                            <Tooltip permanent direction="center" className="sector-label">
                                {s.name}
                            </Tooltip>
                        </Polygon>
                    ))}

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
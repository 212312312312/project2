import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import sectorService from '../services/sectorService';

import 'leaflet/dist/leaflet.css';
import '../assets/SectorsPage.css';
import '../assets/Form.css';

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
    const [searchQuery, setSearchQuery] = useState(''); // Стейт для поиска
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

    // Фильтрация секторов по названию
    const filteredSectors = useMemo(() => {
        if (!searchQuery.trim()) return sectors;
        return sectors.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
    }, [sectors, searchQuery]);

    const handlePolygonComplete = useCallback((coords) => {
        setNewPoints(coords);
        setIsDrawing(false);
    }, []);

    const handleSave = async () => {
        if (!name.trim()) return alert("Введіть назву сектора");
        try {
            await sectorService.createSector({ name: name.trim(), isCity, points: newPoints });
            
            setName('');
            setIsCity(true); 
            setNewPoints(null);
            
            loadSectors();
        } catch (e) { alert("Помилка збереження сектора"); }
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
                <div className="sidebar-header">
                    <h1 className="sidebar-title">Сектори</h1>
                    <span className="count-badge">{filteredSectors.length}</span>
                </div>

                {/* Поле поиска секторов */}
                <div className="search-box">
                    <input 
                        type="text"
                        className="search-input"
                        placeholder="🔍 Пошук сектора..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button 
                    className={`btn ${isDrawing ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => {
                        setIsDrawing(!isDrawing);
                        setNewPoints(null);
                    }}
                >
                    {isDrawing ? 'Скасувати малювання' : '+ Створити сектор'}
                </button>

                {newPoints && (
                    <div className="save-sector-box">
                        <h3 className="form-section-title">Новий сектор намальовано</h3>
                        
                        <div className="form-group">
                            <label className="form-label">Назва сектора</label>
                            <input 
                                type="text" 
                                className="input-field"
                                placeholder="Введіть назву..." 
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="chkIsCity" 
                                    checked={isCity} 
                                    onChange={(e) => setIsCity(e.target.checked)} 
                                />
                                <span className="font-medium">Зона міста (Тариф "Стандарт")</span>
                            </label>
                            {!isCity && (
                                <span className="form-hint" style={{ color: '#d97706', fontWeight: 600 }}>
                                    Буде діяти тариф "За містом"
                                </span>
                            )}
                        </div>

                        <div className="form-actions justify-end" style={{ marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                            <button onClick={handleDiscard} className="btn btn-sm btn-secondary">Скинути</button>
                            <button onClick={handleSave} className="btn btn-sm btn-primary">Зберегти</button>
                        </div>
                    </div>
                )}

                <div className="sectors-list">
                    {filteredSectors.length > 0 ? (
                        filteredSectors.map(s => (
                            <div 
                                key={s.id} 
                                className="sector-card" 
                                style={{ borderLeft: s.isCity ? '4px solid #10b981' : '4px solid #f59e0b' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span className="sector-name">{s.name}</span>
                                    <div>
                                        <span className={`badge ${s.isCity ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem' }}>
                                            {s.isCity ? "🏙️ Місто" : "🌲 За містом"}
                                        </span>
                                    </div>
                                </div>
                                <div className="btn-group" style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button 
                                        className="btn btn-sm btn-ghost" 
                                        onClick={() => handleRename(s.id, s.name)} 
                                        title="Перейменувати"
                                        style={{ padding: '0.25rem 0.5rem' }}
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-ghost-danger" 
                                        onClick={() => handleDelete(s.id)}
                                        title="Видалити"
                                        style={{ padding: '0.25rem 0.5rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-text">
                            {searchQuery ? "Сектори за вашим запитом не знайдені" : "Сектори ще не створені"}
                        </div>
                    )}
                </div>
            </div>

            <div className="map-view">
                <MapContainer center={position} zoom={11} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {filteredSectors.map(s => (
                        <Polygon 
                            key={s.id}
                            positions={s.points.map(p => [p.lat, p.lng])}
                            pathOptions={{ 
                                fillColor: s.isCity ? '#10b981' : '#f59e0b', 
                                fillOpacity: 0.25, 
                                color: s.isCity ? '#10b981' : '#f59e0b', 
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
                            pathOptions={{ 
                                fillColor: '#3b82f6', 
                                fillOpacity: 0.35, 
                                color: '#3b82f6', 
                                weight: 3, 
                                dashArray: '5, 5' 
                            }}
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
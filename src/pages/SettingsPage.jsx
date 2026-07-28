import React, { useState, useEffect } from 'react';
import { getAllSettings, uploadSettingImage, saveTextSettings } from '../services/settingsService';
import CancellationReasonsModal from '../components/CancellationReasonsModal';
import '../assets/Form.css';

const SettingsPage = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
    
    // ЄДИНИЙ стейт для модалки причин ('DRIVER' | 'CLIENT' | null)
    const [reasonModalTarget, setReasonModalTarget] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await getAllSettings();
            setSettings(data || {});
        } catch (error) {
            console.error("Помилка завантаження налаштувань:", error);
        }
    };

    // Загальна функція збереження (Зображення + Розміри)
    const handleSaveCard = async (keyPrefix, file, width, height) => {
        setLoading(true);
        try {
            const updates = {};

            // 1. Якщо є файл - вантажимо його
            if (file) {
                const newUrl = await uploadSettingImage(keyPrefix, file);
                updates[keyPrefix] = newUrl;
            }

            // 2. Зберігаємо розміри (як текст)
            updates[`${keyPrefix}_width`] = width.toString();
            updates[`${keyPrefix}_height`] = height.toString();

            // 3. Відправляємо текстові налаштування на сервер
            await saveTextSettings(updates);

            // 4. Оновлюємо стейт локально
            setSettings(prev => ({ ...prev, ...updates }));
            
            alert("Збережено успішно!");
        } catch (error) {
            alert("Помилка: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title-group">
                    <h1>Налаштування системи</h1>
                </div>
            </header>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                
                {/* --- КАРТКА ДЛЯ ПРИЧИН СКАСУВАННЯ --- */}
                <div className="form-section" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 className="form-section-title" style={{ margin: '0 0 0.5rem 0' }}>⛔ Причини скасування</h3>
                        <p className="form-hint" style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                            Налаштування списку причин, які можуть обирати водії та клієнти при скасуванні замовлення.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setReasonModalTarget('DRIVER')}
                            style={{ flex: 1, padding: '0.65rem 0.5rem' }}
                        >
                            Для водіїв
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setReasonModalTarget('CLIENT')}
                            style={{ flex: 1, padding: '0.65rem 0.5rem' }}
                        >
                            Для клієнтів
                        </button>
                    </div>
                </div>

                <SettingCard 
                    title="📍 Мітка водія (Диспетчерська)"
                    description="Іконка водія на карті диспетчерської панелі."
                    settingKey="driver_map_icon"
                    settingsData={settings}
                    onSave={handleSaveCard}
                    loading={loading}
                />

                <SettingCard 
                    title="🚗 Іконка авто (Клієнт)"
                    description="Іконка автомобіля у мобільному додатку клієнта."
                    settingKey="client_car_icon"
                    settingsData={settings}
                    onSave={handleSaveCard}
                    loading={loading}
                />
            </div>

            {/* Коректний рендер модалки: показуємо тільки якщо reasonModalTarget не null */}
            {reasonModalTarget && (
                <CancellationReasonsModal 
                    target={reasonModalTarget} 
                    onClose={() => setReasonModalTarget(null)} 
                />
            )}
        </div>
    );
};

const SettingCard = ({ title, description, settingKey, settingsData, onSave, loading }) => {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    
    const [width, setWidth] = useState(settingsData[`${settingKey}_width`] || 40);
    const [height, setHeight] = useState(settingsData[`${settingKey}_height`] || 40);

    // Динамічно визначаємо хост бэкенда для відносних шляхів
    const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.host}`;
    
    const rawUrl = settingsData[settingKey];
    const currentUrl = rawUrl 
        ? (rawUrl.startsWith('http') ? rawUrl : `${backendHost}${rawUrl}`) 
        : null;

    useEffect(() => {
        if (settingsData[`${settingKey}_width`]) setWidth(settingsData[`${settingKey}_width`]);
        if (settingsData[`${settingKey}_height`]) setHeight(settingsData[`${settingKey}_height`]);
    }, [settingsData, settingKey]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    return (
        <div className="form-section" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 className="form-section-title" style={{ margin: '0 0 0.5rem 0' }}>{title}</h3>
            <p className="form-hint" style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.4' }}>{description}</p>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Зображення (PNG/SVG)</label>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="input-field"
                />
            </div>

            <div className="form-grid-2col" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                    <label className="form-label">Ширина (px)</label>
                    <input 
                        type="number" 
                        value={width} 
                        onChange={(e) => setWidth(e.target.value)} 
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Висота (px)</label>
                    <input 
                        type="number" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)} 
                        className="input-field"
                    />
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Предперегляд</label>
                <div style={{ 
                    height: '140px', 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f8fafc',
                    overflow: 'hidden'
                }}>
                    {(preview || currentUrl) ? (
                        <img 
                            src={preview || currentUrl} 
                            alt="Preview" 
                            style={{ 
                                width: `${width}px`, 
                                height: `${height}px`, 
                                objectFit: 'contain'
                            }} 
                        />
                    ) : (
                        <span className="text-subtle" style={{ fontSize: '0.85rem' }}>Немає зображення</span>
                    )}
                </div>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ width: '100%' }} 
                onClick={() => onSave(settingKey, file, width, height)} 
                disabled={loading}
            >
                {loading ? "Збереження..." : "Зберегти"}
            </button>
        </div>
    );
};

export default SettingsPage;
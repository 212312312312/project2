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
            setSettings(data);
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
    };

    // Общая функция сохранения (Картинка + Размеры)
    const handleSaveCard = async (keyPrefix, file, width, height) => {
        setLoading(true);
        try {
            const updates = {};

            // 1. Если есть файл - грузим его
            if (file) {
                const newUrl = await uploadSettingImage(keyPrefix, file);
                updates[keyPrefix] = newUrl;
            }

            // 2. Сохраняем размеры (как текст)
            updates[`${keyPrefix}_width`] = width.toString();
            updates[`${keyPrefix}_height`] = height.toString();

            // 3. Отправляем текстовые настройки на сервер
            await saveTextSettings(updates);

            // 4. Обновляем стейт локально
            setSettings(prev => ({ ...prev, ...updates }));
            
            alert("Збережено успішно!");
        } catch (error) {
            alert("Помилка: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>⚙️ Налаштування системи</h2>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                
                {/* --- КАРТКА ДЛЯ ПРИЧИН СКАСУВАННЯ --- */}
                <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>⛔ Причини скасування</h3>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
                            Налаштування списку причин, які можуть обирать водії та клієнти при скасуванні замовлення.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            className="btn-primary" 
                            onClick={() => setReasonModalTarget('DRIVER')}
                            style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                        >
                            Для водіїв
                        </button>
                        <button 
                            className="btn-secondary" 
                            onClick={() => setReasonModalTarget('CLIENT')}
                            style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                        >
                            Для клієнтів
                        </button>
                    </div>
                </div>

                <SettingCard 
                    title="📍 Мітка водія (Диспетчерська)"
                    description="Іконка на карті диспетчера."
                    settingKey="driver_map_icon"
                    settingsData={settings}
                    onSave={handleSaveCard}
                    loading={loading}
                />

                <SettingCard 
                    title="🚗 Іконка авто (Клієнт)"
                    description="Іконка в додатку клієнта."
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

    // ИСПРАВЛЕНО: Динамически вычисляем хост бэкенда (работает и локально, и на проде)
    const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.host}`;
    
    // ИСПРАВЛЕНО: Если путь относительный, принудительно подставляем хост бэкенда. Объявлено строго один раз!
    const currentUrl = settingsData[settingKey] 
        ? (settingsData[settingKey].startsWith('http') ? settingsData[settingKey] : `${backendHost}${settingsData[settingKey]}`) 
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
        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{title}</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>{description}</p>
            
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: '15px' }} />

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ширина (px):</label>
                    <input 
                        type="number" 
                        value={width} 
                        onChange={(e) => setWidth(e.target.value)} 
                        style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Висота (px):</label>
                    <input 
                        type="number" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)} 
                        style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                    />
                </div>
            </div>

            <div style={{ 
                height: '150px', 
                border: '2px dashed #ccc', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#f9f9f9',
                overflow: 'hidden'
            }}>
                {(preview || currentUrl) ? (
                    <img 
                        src={preview || currentUrl} 
                        alt="Preview" 
                        style={{ 
                            width: `${width}px`, 
                            height: `${height}px`, 
                            objectFit: 'contain',
                            border: '1px solid red' 
                        }} 
                    />
                ) : (
                    <span style={{ color: '#999', fontSize: '0.8rem' }}>Немає зображення</span>
                )}
            </div>

            <button 
                className="btn-primary" 
                style={{ marginTop: '15px', width: '100%' }} 
                onClick={() => onSave(settingKey, file, width, height)} 
                disabled={loading}
            >
                {loading ? "Збереження..." : "Зберегти"}
            </button>
        </div>
    );
};

export default SettingsPage;
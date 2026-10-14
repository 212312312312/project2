import React, { useState, useEffect } from 'react';
import { getAllSettings, uploadSettingImage, saveTextSettings } from '../services/settingsService';
import CancellationReasonsModal from '../components/CancellationReasonsModal';
import '../assets/Form.css';

const SettingsPage = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
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

    const handleSaveCard = async (keyPrefix, file, width, height) => {
        setLoading(true);
        try {
            const updates = {};
            if (file) {
                const newUrl = await uploadSettingImage(keyPrefix, file);
                updates[keyPrefix] = newUrl;
            }
            updates[`${keyPrefix}_width`] = width.toString();
            updates[`${keyPrefix}_height`] = height.toString();

            await saveTextSettings(updates);
            setSettings(prev => ({ ...prev, ...updates }));
            alert("Збережено успішно!");
        } catch (error) {
            alert("Помилка: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div className="header-title-group">
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Налаштування системи
                    </h1>
                </div>
            </header>

            {/* СЕКЦІЯ 1: СЕРВІСИ ТА ІНТЕГРАЦІЇ */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚙️</span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                        Сервіси та інтеграції
                    </h2>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
                    gap: '1.25rem',
                    alignItems: 'stretch'
                }}>
                    <SmsSettingsCard settingsData={settings} onReload={loadSettings} />
                    <PaymentSettingsCard settingsData={settings} onReload={loadSettings} />
                    <CancellationCard onOpenModal={setReasonModalTarget} />
                    <EvosSettingsCard settingsData={settings} onReload={loadSettings} />
                </div>
            </div>

            {/* СЕКЦІЯ 2: ГРАФІЧНІ ЕЛЕМЕНТИ ТА ІКОНКИ */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎨</span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                        Графічні елементи та мапа
                    </h2>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
                    gap: '1.25rem',
                    alignItems: 'stretch'
                }}>
                    <SettingCard 
                        title="Мітка водія (Диспетчерська)"
                        description="Іконка автомобіля на живій карті замовлень диспетчера."
                        icon="📍"
                        settingKey="driver_map_icon"
                        settingsData={settings}
                        onSave={handleSaveCard}
                        loading={loading}
                    />

                    <SettingCard 
                        title="Іконка авто (Клієнт)"
                        description="Відображення машини в додатку пасажира під час пошуку та поїздки."
                        icon="🚗"
                        settingKey="client_car_icon"
                        settingsData={settings}
                        onSave={handleSaveCard}
                        loading={loading}
                    />
                </div>
            </div>

            {reasonModalTarget && (
                <CancellationReasonsModal 
                    target={reasonModalTarget} 
                    onClose={() => setReasonModalTarget(null)} 
                />
            )}
        </div>
    );
};

const CancellationCard = ({ onOpenModal }) => {
    return (
        <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>⛔</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Причини скасування
                </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: '1.4' }}>
                Довідники причин відмови від замовлення окремо для водіїв та пасажирів.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
                
                {/* Рядок: Водії */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 110px', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '10px 12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>🚗 Для водіїв</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            З рейтинговим штрафом
                        </div>
                    </div>
                    <button 
                        type="button"
                        className="btn btn-primary" 
                        onClick={() => onOpenModal('DRIVER')}
                        style={{ width: '110px', margin: 0, padding: '7px 0', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box' }}
                    >
                        Налаштувати
                    </button>
                </div>

                {/* Рядок: Клієнти */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 110px', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '10px 12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>👤 Для клієнтів</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            У клієнтському додатку
                        </div>
                    </div>
                    <button 
                        type="button"
                        className="btn btn-primary" 
                        onClick={() => onOpenModal('CLIENT')}
                        style={{ width: '110px', margin: 0, padding: '7px 0', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box' }}
                    >
                        Налаштувати
                    </button>
                </div>

            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                Дані синхронізуються з мобільними додатками
            </div>
        </div>
    );
};
const PaymentSettingsCard = ({ settingsData, onReload }) => {
    const [enableCard, setEnableCard] = useState(settingsData.enable_card_payment !== 'false');
    const [enableDriverCard, setEnableDriverCard] = useState(settingsData.enable_driver_card_payment !== 'false');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnableCard(settingsData.enable_card_payment !== 'false');
        setEnableDriverCard(settingsData.enable_driver_card_payment !== 'false');
    }, [settingsData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTextSettings({
                enable_card_payment: enableCard.toString(),
                enable_driver_card_payment: enableDriverCard.toString()
            });
            alert('Налаштування способів оплати збережено успішно!');
            if (onReload) onReload();
        } catch (error) {
            alert('Помилка збереження: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>💳</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Способи оплати
                </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                Керування доступними варіантами розрахунку в додатку клієнта.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>💵</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>Готівка</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Базовий спосіб розрахунку</div>
                        </div>
                    </div>
                    <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.72rem' }}>
                        Завжди увімкнено
                    </span>
                </div>

                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 12px', 
                    background: enableCard ? '#f0fdf4' : '#ffffff', 
                    border: `1px solid ${enableCard ? '#86efac' : '#e2e8f0'}`, 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>💳</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>Картка (LiqPay)</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Безготівкова онлайн-оплата</div>
                        </div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={enableCard} 
                        onChange={(e) => setEnableCard(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                </label>

                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '10px 12px', 
                    background: enableDriverCard ? '#f0fdf4' : '#ffffff', 
                    border: `1px solid ${enableDriverCard ? '#86efac' : '#e2e8f0'}`, 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📲</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>Водію на картку</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Прямий P2P переказ водієві</div>
                        </div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={enableDriverCard} 
                        onChange={(e) => setEnableDriverCard(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                    />
                </label>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto', padding: '0.65rem' }} 
                onClick={handleSave} 
                disabled={saving}
            >
                {saving ? "Збереження..." : "Зберегти способи оплати"}
            </button>
        </div>
    );
};

const EvosSettingsCard = ({ settingsData, onReload }) => {
    const [enabled, setEnabled] = useState(settingsData.evos_enabled === 'true');
    const [delaySeconds, setDelaySeconds] = useState(settingsData.evos_delay_seconds || '60');
    const [url, setUrl] = useState(settingsData.evos_url || 'http://127.0.0.1:8080/api');
    const [login, setLogin] = useState(settingsData.evos_login || '');
    const [password, setPassword] = useState(settingsData.evos_password || '');
    const [appId, setAppId] = useState(settingsData.evos_app_id || 'UNIT_TAXI');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(settingsData.evos_enabled === 'true');
        setDelaySeconds(settingsData.evos_delay_seconds || '60');
        setUrl(settingsData.evos_url || 'http://127.0.0.1:8080/api');
        setLogin(settingsData.evos_login || '');
        setPassword(settingsData.evos_password || '');
        setAppId(settingsData.evos_app_id || 'UNIT_TAXI');
    }, [settingsData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTextSettings({
                evos_enabled: enabled.toString(),
                evos_delay_seconds: delaySeconds.toString(),
                evos_url: url,
                evos_login: login,
                evos_password: password,
                evos_app_id: appId
            });
            alert('Налаштування EvoS збережено успішно!');
            if (onReload) onReload();
        } catch (error) {
            alert('Помилка збереження: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌐</span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        Інтеграція EvoS
                    </h3>
                </div>
                <span className="badge" style={{ 
                    backgroundColor: enabled ? '#dcfce7' : '#f1f5f9', 
                    color: enabled ? '#15803d' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {enabled ? '● Активно' : '○ Вимкнено'}
                </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                Автоматична передача нерозподілених замовлень у мережу TaxiNavigator.
            </p>

            <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '8px 12px', 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                marginBottom: '10px',
                cursor: 'pointer' 
            }}>
                <input 
                    type="checkbox" 
                    checked={enabled} 
                    onChange={(e) => setEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284c7' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                    Увімкнути перекидку в EvoS
                </span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Затримка (сек)
                        </label>
                        <input 
                            type="number" 
                            value={delaySeconds} 
                            onChange={(e) => setDelaySeconds(e.target.value)} 
                            className="input-field"
                            style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            App ID
                        </label>
                        <input 
                            type="text" 
                            value={appId} 
                            onChange={(e) => setAppId(e.target.value)} 
                            className="input-field"
                            style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        URL WebAPI EvoS
                    </label>
                    <input 
                        type="text" 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)} 
                        className="input-field"
                        style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Логін
                        </label>
                        <input 
                            type="text" 
                            value={login} 
                            onChange={(e) => setLogin(e.target.value)} 
                            className="input-field"
                            style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Пароль
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="input-field"
                            style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto', padding: '0.65rem' }} 
                onClick={handleSave} 
                disabled={saving}
            >
                {saving ? "Збереження..." : "Зберегти налаштування EvoS"}
            </button>
        </div>
    );
};

const SmsSettingsCard = ({ settingsData, onReload }) => {
    const [smsMode, setSmsMode] = useState(settingsData.sms_mode || 'TEST');
    const [alphaName, setAlphaName] = useState(settingsData.sms_alpha_name || 'TAXI');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSmsMode(settingsData.sms_mode || 'TEST');
        setAlphaName(settingsData.sms_alpha_name || 'TAXI');
    }, [settingsData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTextSettings({
                sms_mode: smsMode,
                sms_alpha_name: alphaName
            });
            alert('Налаштування СМС сервісу збережено успішно!');
            if (onReload) onReload();
        } catch (error) {
            alert('Помилка збереження: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📱</span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        СМС сервіс (SMS-Fly)
                    </h3>
                </div>
                <span className="badge" style={{ 
                    backgroundColor: smsMode === 'PROD' ? '#dcfce7' : '#fef9c3', 
                    color: smsMode === 'PROD' ? '#15803d' : '#854d0e',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {smsMode === 'PROD' ? '🟢 ПРОДАКШЕН' : '🟡 ТЕСТОВИЙ'}
                </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                Режим відправки одноразових кодів клієнтам та водіям при авторизації.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Режим роботи шлюзу
                    </label>
                    <select 
                        value={smsMode} 
                        onChange={(e) => setSmsMode(e.target.value)} 
                        className="input-field"
                        style={{ margin: 0, width: '100%', fontWeight: 600, color: smsMode === 'PROD' ? '#16a34a' : '#b45309' }}
                    >
                        <option value="TEST">🟡 ТЕСТОВИЙ (код пишеться в логи сервера)</option>
                        <option value="PROD">🟢 ПРОДАКШЕН (реальна відправка через SMS-Fly)</option>
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Альфа-ім'я (підпис СМС)
                    </label>
                    <input 
                        type="text" 
                        value={alphaName} 
                        onChange={(e) => setAlphaName(e.target.value)} 
                        className="input-field"
                        style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                        placeholder="Наприклад: Unit Taxi"
                    />
                </div>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto', padding: '0.65rem' }} 
                onClick={handleSave} 
                disabled={saving}
            >
                {saving ? "Збереження..." : "Зберегти налаштування СМС"}
            </button>
        </div>
    );
};

const SettingCard = ({ title, description, icon, settingKey, settingsData, onSave, loading }) => {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    
    const [width, setWidth] = useState(settingsData[`${settingKey}_width`] || 40);
    const [height, setHeight] = useState(settingsData[`${settingKey}_height`] || 40);

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
            setFileName(selectedFile.name);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    return (
        <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>{icon || '🖼️'}</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {title}
                </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                {description}
            </p>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Файл зображення (PNG / SVG)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{
                        padding: '6px 14px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#334155',
                        display: 'inline-block'
                    }}>
                        📁 Обрати файл
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            style={{ display: 'none' }}
                        />
                    </label>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName || 'Файл не обрано'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Ширина (px)
                    </label>
                    <input 
                        type="number" 
                        value={width} 
                        onChange={(e) => setWidth(e.target.value)} 
                        className="input-field"
                        style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Висота (px)
                    </label>
                    <input 
                        type="number" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value)} 
                        className="input-field"
                        style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                        Попередній перегляд
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {width} × {height} px
                    </span>
                </div>
                <div style={{ 
                    height: '110px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f8fafc',
                    backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
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
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Немає зображення</span>
                    )}
                </div>
            </div>

            <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto', padding: '0.65rem' }} 
                onClick={() => onSave(settingKey, file, width, height)} 
                disabled={loading}
            >
                {loading ? "Збереження..." : "Зберегти мітку"}
            </button>
        </div>
    );
};

export default SettingsPage;
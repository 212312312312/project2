import React, { useState, useEffect } from 'react';
import {
  getAllTariffs,
  createTariff,
  updateTariff,
  deleteTariff,
  reorderTariff,
  getMinDistance,
  updateMinDistance,
  getSurgeConfig,
  saveTimeSurgeRule,
  deleteTimeSurgeRule,
  toggleTimeSurgeRule,
  toggleWeatherSurge,
  updateWeatherSurgeRule
} from '../services/tariffService';

import Modal from '../components/Modal';
import TariffForm from '../components/TariffForm';

const DAYS_MAP = [
  { key: 'MONDAY', label: 'Пн' },
  { key: 'TUESDAY', label: 'Вт' },
  { key: 'WEDNESDAY', label: 'Ср' },
  { key: 'THURSDAY', label: 'Чт' },
  { key: 'FRIDAY', label: 'Пт' },
  { key: 'SATURDAY', label: 'Сб' },
  { key: 'SUNDAY', label: 'Нд' }
];

const TariffsPage = () => {
  // --- Вкладки (Тарифи / Коефіцієнти) ---
  const [activeTab, setActiveTab] = useState('TARIFFS');

  // --- Базові стани тарифів ---
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [minDistance, setMinDistance] = useState(3.0);
  const [isSavingDistance, setIsSavingDistance] = useState(false);

  // --- Динамічні коефіцієнти ---
  const [surgeConfig, setSurgeConfig] = useState(null);
  const [isTimeRuleModalOpen, setIsTimeRuleModalOpen] = useState(false);
  const [timeRuleForm, setTimeRuleForm] = useState({
    name: '',
    daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    startTime: '08:00',
    endTime: '10:00',
    multiplier: 1.2,
    isActive: true
  });

  const fetchTariffs = async () => {
    try {
      const data = await getAllTariffs();
      setTariffs(data);
      
      const distData = await getMinDistance();
      if (distData && distData.minDistance !== undefined) {
        setMinDistance(distData.minDistance);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSurge = async () => {
    try {
      const data = await getSurgeConfig();
      setSurgeConfig(data);
    } catch (err) {
      console.error('Помилка завантаження коефіцієнтів:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    await Promise.all([fetchTariffs(), fetchSurge()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- Обробники тарифів ---
  const handleAddClick = () => {
    setEditingTariff(null);
    setIsModalOpen(true);
  };

  const handleReorder = async (id, direction) => {
    try {
      const updatedTariffs = await reorderTariff(id, direction);
      setTariffs(updatedTariffs);
    } catch (err) {
      console.error('Помилка зміни порядку тарифів:', err);
      alert('Не вдалося змінити порядок тарифу');
    }
  };

  const handleEditClick = (tariff) => {
    setEditingTariff(tariff);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTariff(null);
  };

  const handleFormSubmit = async (formData, file) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingTariff) {
        await updateTariff(editingTariff.id, formData, file);
      } else {
        await createTariff(formData, file);
      }
      handleModalClose();
      fetchTariffs();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (tariffId) => {
    if (window.confirm('Ви впевнені, що хочете видалити цей тариф?')) {
      try {
        await deleteTariff(tariffId);
        fetchTariffs();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSaveMinDistance = async () => {
    setIsSavingDistance(true);
    try {
      await updateMinDistance(minDistance);
      alert('Мінімальний кілометраж успішно оновлено для всіх тарифів!');
      fetchTariffs();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingDistance(false);
    }
  };

  // --- Обробники динамічних коефіцієнтів ---
  const handleToggleWeatherMaster = async () => {
    if (!surgeConfig) return;
    const nextVal = !surgeConfig.weatherSurgeEnabled;
    try {
      await toggleWeatherSurge(nextVal);
      fetchSurge();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWeatherMultiplierChange = async (rule, newMultiplier) => {
    try {
      await updateWeatherSurgeRule(rule.id, parseFloat(newMultiplier) || 1.0, rule.isActive);
      fetchSurge();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWeatherActiveToggle = async (rule) => {
    try {
      await updateWeatherSurgeRule(rule.id, rule.multiplier, !rule.isActive);
      fetchSurge();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleTimeRuleClick = async (id) => {
    try {
      await toggleTimeSurgeRule(id);
      fetchSurge();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTimeRuleClick = async (id) => {
    if (window.confirm('Видалити це правило підвищеного попиту за часом?')) {
      try {
        await deleteTimeSurgeRule(id);
        fetchSurge();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSaveTimeRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveTimeSurgeRule(timeRuleForm);
      setIsTimeRuleModalOpen(false);
      setTimeRuleForm({
        name: '',
        daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        startTime: '08:00',
        endTime: '10:00',
        multiplier: 1.2,
        isActive: true
      });
      fetchSurge();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-spinner">Завантаження...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Тарифи</h1>
            <span className="count-badge">
              {activeTab === 'TARIFFS' ? tariffs.length : (surgeConfig?.timeRules?.length || 0)}
            </span>
          </div>

          {/* ПЕРЕМИКАЧ ЗЛІВА У СТИЛІ DRIVERSPAGE */}
          <div className="toggle-group">
            <button 
              type="button"
              onClick={() => setActiveTab('TARIFFS')}
              className={`toggle-btn ${activeTab === 'TARIFFS' ? 'active' : ''}`}
            >
              Тарифи
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('SURGE')}
              className={`toggle-btn ${activeTab === 'SURGE' ? 'active' : ''}`}
            >
              Коефіцієнти
            </button>
          </div>
        </div>

        <div className="header-actions">
          {activeTab === 'TARIFFS' ? (
            <>
              {/* Блок налаштування мінімалки */}
              <div className="toggle-group" style={{ padding: '4px 8px', gap: '8px', alignItems: 'center' }}>
                <span className="text-subtle font-medium" style={{ fontSize: '0.85rem' }}>Мінімалка (км):</span>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0"
                  className="input-field"
                  value={minDistance} 
                  onChange={(e) => setMinDistance(parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', padding: '0.3rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}
                />
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={handleSaveMinDistance} 
                  disabled={isSavingDistance}
                >
                  {isSavingDistance ? '...' : 'Зберегти'}
                </button>
              </div>

              <button className="btn btn-primary" onClick={handleAddClick}>
                + Створити тариф
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsTimeRuleModalOpen(true)}>
              + Додати правило часу
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* ======================= ВКЛАДКА: ДИНАМІЧНІ КОЕФІЦІЄНТИ ======================= */}
      {activeTab === 'SURGE' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* КАРТКА 1: ПОГОДНІ КОЕФІЦІЄНТИ */}
          <div className="table-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))', paddingBottom: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', color: 'var(--text-main, #1e293b)' }}>Погодні коефіцієнти</strong>
                <span className="text-subtle" style={{ fontSize: '0.75rem' }}>Автоматичний розрахунок за даними Open-Meteo</span>
              </div>
              <button 
                className={`btn btn-sm ${surgeConfig?.weatherSurgeEnabled ? 'btn-success' : 'btn-secondary'}`}
                style={{ fontWeight: '500' }}
                onClick={handleToggleWeatherMaster}
              >
                {surgeConfig?.weatherSurgeEnabled ? '● Увімкнено' : '○ Вимкнено'}
              </button>
            </div>

            {/* Live віджет погоди */}
            <div style={{
              background: 'var(--bg-card-hover, #f8fafc)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main, #0f172a)' }}>
                  {surgeConfig?.currentWeather?.location}: {surgeConfig?.currentWeather?.currentTemperature !== null && surgeConfig?.currentWeather?.currentTemperature !== undefined ? `${surgeConfig?.currentWeather?.currentTemperature}°C` : '...'}
                </div>
                <div className="text-subtle" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                  {surgeConfig?.currentWeather?.weatherDescription || 'Завантаження стану погоди...'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-subtle" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Поточний множник</div>
                <span className="badge" style={{ 
                  backgroundColor: (surgeConfig?.currentWeather?.activeMultiplier || 1.0) > 1 ? '#ef4444' : '#10b981',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.6rem'
                }}>
                  ×{surgeConfig?.currentWeather?.activeMultiplier ? surgeConfig.currentWeather.activeMultiplier.toFixed(2) : '1.00'}
                </span>
              </div>
            </div>

            {/* Налаштування коефіцієнтів по категоріях погоди */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span className="text-subtle font-medium" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Множники за типами погоди
              </span>
              {surgeConfig?.weatherRules?.map((wRule) => (
                <div key={wRule.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.45rem 0.6rem',
                  borderRadius: '6px',
                  background: wRule.isActive ? 'transparent' : 'rgba(0,0,0,0.02)',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.05))'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      checked={wRule.isActive} 
                      onChange={() => handleWeatherActiveToggle(wRule)}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: wRule.isActive ? '500' : 'normal', color: wRule.isActive ? 'inherit' : 'var(--text-muted, #94a3b8)' }}>
                      {wRule.name}
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="text-subtle font-medium">×</span>
                    <input 
                      type="number" 
                      step="0.05" 
                      min="1.0" 
                      max="3.0"
                      defaultValue={wRule.multiplier}
                      onBlur={(e) => handleWeatherMultiplierChange(wRule, e.target.value)}
                      style={{ width: '60px', padding: '0.2rem 0.4rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}
                      className="input-field"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* КАРТКА 2: ГОДИНИ ПІК (РОЗКЛАД) */}
          <div className="table-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))', paddingBottom: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', color: 'var(--text-main, #1e293b)' }}>Години пік (Розклад)</strong>
                <span className="text-subtle" style={{ fontSize: '0.75rem' }}>Підвищений попит за встановленим розкладом і днями</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
              {surgeConfig?.timeRules && surgeConfig.timeRules.length > 0 ? (
                surgeConfig.timeRules.map((rule) => (
                  <div key={rule.id} style={{
                    padding: '0.65rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: rule.isActive ? 'var(--bg-card, #ffffff)' : 'rgba(0,0,0,0.02)',
                    opacity: rule.isActive ? 1 : 0.65
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>{rule.name}</div>
                      <div className="text-subtle" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-main, #334155)' }}>{rule.startTime} – {rule.endTime}</span>
                        <span style={{ margin: '0 6px' }}>•</span>
                        {rule.daysOfWeek?.map((d) => DAYS_MAP.find((m) => m.key === d)?.label).join(', ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-danger" style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>
                        ×{rule.multiplier?.toFixed(2)}
                      </span>
                      <button 
                        className={`btn btn-sm ${rule.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleToggleTimeRuleClick(rule.id)}
                      >
                        {rule.isActive ? 'Вимкнути' : 'Увімкнути'}
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost-danger" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteTimeRuleClick(rule.id)}
                        title="Видалити правило"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-subtle text-center py-8" style={{ fontSize: '0.88rem' }}>
                  Немає активних інтервалів підвищеного попиту. Створіть нове правило.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================= ВКЛАДКА: ТАБЛИЦЯ ТАРИФІВ ======================= */}
      {activeTab === 'TARIFFS' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="main-table">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '70px' }}>Іконка</th>
                  <th className="text-center" style={{ width: '50px' }}>ID</th>
                  <th>Назва</th>
                  <th className="text-center">Статус</th>
                  <th className="text-center">База (₴)</th>
                  <th className="text-center">1 км (Місто)</th>
                  <th className="text-center">1 км (За місто)</th>
                  <th className="text-center">Точка (₴)</th>
                  <th className="text-center">Очікування</th>
                  <th className="text-center">Очік. (₴/хв)</th>
                  <th className="text-center" style={{ width: '210px' }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.length > 0 ? (
                  tariffs.map((tariff) => (
                    <tr 
                      key={tariff.id} 
                      style={{ opacity: tariff.isUnavailable ? 0.5 : 1 }}
                    >
                      <td className="text-center">
                        {tariff.imageUrl ? (
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            padding: '2px'
                          }}>
                            <img 
                              src={tariff.imageUrl} 
                              alt={tariff.name} 
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          </div>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="text-center text-subtle">#{tariff.id}</td>
                      
                      <td>
                        <strong className="font-medium">{tariff.name}</strong>
                        {tariff.bodyType && (
                          <span 
                            className="badge" 
                            style={{ 
                              padding: '0.15rem 0.4rem', 
                              fontSize: '0.7rem', 
                              marginLeft: '6px', 
                              backgroundColor: '#8b5cf6', 
                              color: '#fff',
                              borderRadius: '4px'
                            }}
                          >
                            {tariff.bodyType === 'UNIVERSAL' ? 'Універсал' : tariff.bodyType === 'MINIBUS' ? 'Мікроавтобус' : tariff.bodyType}
                          </span>
                        )}
                        {tariff.evosTariffName && (
                          <span 
                            className="badge" 
                            style={{ 
                              padding: '0.15rem 0.4rem', 
                              fontSize: '0.7rem', 
                              marginLeft: '6px', 
                              backgroundColor: '#2563eb', 
                              color: '#fff',
                              borderRadius: '4px'
                            }}
                          >
                            EvoS: {tariff.evosTariffName}
                          </span>
                        )}
                        {tariff.isBeta && (
                          <span className="badge badge-danger ml-2" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', marginLeft: '6px' }}>
                            BETA
                          </span>
                        )}
                        {tariff.isUnavailable && (
                          <div className="text-subtle text-xs" style={{ fontSize: '0.75rem' }}>
                            Недоступний
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${tariff.isActive ? 'badge-success' : 'badge-muted'}`}>
                          {tariff.isActive ? 'АКТИВНИЙ' : 'ВИМКНЕНО'}
                        </span>
                      </td>
                      <td className="text-center font-medium">{tariff.basePrice.toFixed(2)} ₴</td>
                      <td className="text-center font-medium">{tariff.pricePerKm.toFixed(2)} ₴</td>
                      <td className="text-center font-medium text-warning">
                        {tariff.pricePerKmOutCity ? `${tariff.pricePerKmOutCity.toFixed(2)} ₴` : '—'}
                      </td>
                      <td className="text-center font-medium text-success">
                        {tariff.extraWaypointPrice ? `${tariff.extraWaypointPrice.toFixed(2)} ₴` : '0.00 ₴'}
                      </td>
                      <td className="text-center text-subtle">{tariff.freeWaitingMinutes} хв</td>
                      <td className="text-center font-medium">{tariff.pricePerWaitingMinute.toFixed(2)} ₴</td>
                      <td className="text-center">
                        <div className="btn-group justify-center">
                          <div className="btn-group" style={{ gap: '2px' }}>
                            <button 
                              onClick={() => handleReorder(tariff.id, 'UP')}
                              className="btn btn-sm btn-outline"
                              title="Перемістити вгору"
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              ↑
                            </button>
                            <button 
                              onClick={() => handleReorder(tariff.id, 'DOWN')}
                              className="btn btn-sm btn-outline"
                              title="Перемістити вниз"
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              ↓
                            </button>
                          </div>

                          <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(tariff)}>
                            Ред.
                          </button>
                          <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDeleteClick(tariff.id)}>
                            Вид.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center text-subtle py-8">
                      Тарифи не знайдені. Створіть перший тариф.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* МОДАЛЬНЕ ВІКНО СТВОРЕННЯ / РЕДАГУВАННЯ ТАРИФУ */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingTariff ? 'Редагувати тариф' : 'Створити новий тариф'}
      >
        <TariffForm
          initialData={editingTariff}
          onSubmit={handleFormSubmit}
          onCancel={handleModalClose}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* МОДАЛЬНЕ ВІКНО СТВОРЕННЯ ПРАВИЛА ЧАСУ */}
      <Modal
        isOpen={isTimeRuleModalOpen}
        onClose={() => setIsTimeRuleModalOpen(false)}
        title="Створити правило підвищеного попиту (Час)"
      >
        <form onSubmit={handleSaveTimeRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Назва правила:</label>
            <input 
              type="text"
              required
              placeholder="напр. Ранковий пік"
              className="input-field"
              value={timeRuleForm.name}
              onChange={(e) => setTimeRuleForm({ ...timeRuleForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="form-label">Початок (HH:mm):</label>
              <input 
                type="time"
                required
                className="input-field"
                value={timeRuleForm.startTime}
                onChange={(e) => setTimeRuleForm({ ...timeRuleForm, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Кінець (HH:mm):</label>
              <input 
                type="time"
                required
                className="input-field"
                value={timeRuleForm.endTime}
                onChange={(e) => setTimeRuleForm({ ...timeRuleForm, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Множник вартості (коефіцієнт):</label>
            <input 
              type="number"
              step="0.05"
              min="1.0"
              max="5.0"
              required
              className="input-field"
              value={timeRuleForm.multiplier}
              onChange={(e) => setTimeRuleForm({ ...timeRuleForm, multiplier: parseFloat(e.target.value) || 1.0 })}
            />
          </div>

          <div>
            <label className="form-label">Дні тижня:</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DAYS_MAP.map((d) => {
                const isSelected = timeRuleForm.daysOfWeek.includes(d.key);
                return (
                  <button
                    type="button"
                    key={d.key}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: '36px', padding: '0.3rem' }}
                    onClick={() => {
                      const updated = isSelected 
                        ? timeRuleForm.daysOfWeek.filter((x) => x !== d.key)
                        : [...timeRuleForm.daysOfWeek, d.key];
                      setTimeRuleForm({ ...timeRuleForm, daysOfWeek: updated });
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTimeRuleModalOpen(false)}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-primary">
              Зберегти правило
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TariffsPage;
import React, { useState, useEffect } from 'react';
import { getAllTariffs } from '../services/tariffService';
import '../assets/Form.css';

const PromoForm = ({ onSubmit, onCancel, isLoading }) => {
  const [tariffs, setTariffs] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requiredRides: 1,
    requiredDistanceKm: 0,
    discountPercent: 10,
    requiredTariffId: '',
    isOneTime: true,
    maxDiscountAmount: '',
    activeDaysDuration: '',
    maxAllocations: '' // Лимит мест для клиентов
  });

  useEffect(() => {
    getAllTariffs().then(setTariffs).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSend = {
      title: formData.title,
      description: formData.description,
      requiredRides: parseInt(formData.requiredRides),
      requiredDistanceKm: parseFloat(formData.requiredDistanceKm) || 0.0,
      discountPercent: parseFloat(formData.discountPercent),
      requiredTariffId: formData.requiredTariffId ? parseInt(formData.requiredTariffId) : null,
      isOneTime: formData.isOneTime,
      maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
      activeDaysDuration: formData.activeDaysDuration ? parseInt(formData.activeDaysDuration) : null,
      maxAllocations: formData.maxAllocations ? parseInt(formData.maxAllocations) : null
    };

    onSubmit(dataToSend);
  };

  // Внутренний калькулятор максимального бюджета компенсации
  const calculateMaxBudget = () => {
    const allocations = parseInt(formData.maxAllocations);
    const maxDiscount = parseFloat(formData.maxDiscountAmount);
    
    if (!allocations || !maxDiscount || allocations <= 0 || maxDiscount <= 0) {
      return null;
    }
    return allocations * maxDiscount;
  };

  const maxBudget = calculateMaxBudget();

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      <div className="form-grid">
        <div className="form-group">
          <label>Название Акции</label>
          <input 
            type="text" name="title" 
            placeholder="Напр: Легкий старт" 
            value={formData.title} onChange={handleChange} required 
          />
        </div>
        
        <div className="form-group">
          <label>Описание задания</label>
          <input 
            type="text" name="description" 
            placeholder="Напр: Зроби 5 поїздок" 
            value={formData.description} onChange={handleChange} required 
          />
        </div>

        <div className="form-group-row" style={{display:'flex', gap:'10px'}}>
            <div className="form-group" style={{flex:1}}>
              <label>Поїздок (шт)</label>
              <input 
                type="number" name="requiredRides" min="0"
                placeholder="0 = не треба"
                value={formData.requiredRides} onChange={handleChange} 
              />
            </div>
            
            <div className="form-group" style={{flex:1}}>
              <label>АБО Дистанція (км)</label>
              <input 
                type="number" name="requiredDistanceKm" min="0" step="0.1"
                placeholder="0 = не треба"
                value={formData.requiredDistanceKm} onChange={handleChange} 
              />
            </div>
        </div>

        <div className="form-group">
          <label>Відсоток знижки (%)</label>
          <input 
            type="number" name="discountPercent" min="1" max="100"
            value={formData.discountPercent} onChange={handleChange} required 
          />
        </div>

        <div className="form-group">
          <label>Макс. сума знижки (грн)</label>
          <input 
            type="number" name="maxDiscountAmount" min="0" placeholder="Пусто = без ліміту"
            value={formData.maxDiscountAmount} onChange={handleChange} 
          />
          <small style={{color: '#666', fontSize: '0.8rem'}}>Залиште пустим, якщо ліміту немає</small>
        </div>

        {/* --- ПОЛЕ: Лимит мест для ограничения рисков --- */}
        <div className="form-group">
          <label>Загальна кількість місць (Ліміт клієнтів)</label>
          <input 
            type="number" name="maxAllocations" min="1" 
            placeholder="Пусто = без ліміту (для всіх)"
            value={formData.maxAllocations} onChange={handleChange} 
          />
          <small style={{color: '#666', fontSize: '0.8rem'}}>
            Скільки всього клієнтів зможуть отримати це завдання (з пріоритетом за поїздками)
          </small>
        </div>

        <div className="form-group">
          <label>Клас авто (Тариф)</label>
          <select 
            name="requiredTariffId" 
            value={formData.requiredTariffId} 
            onChange={handleChange}
            style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">— Будь-який (Прочерк) —</option>
            {tariffs.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox" 
            name="isOneTime" 
            id="isOneTime"
            checked={formData.isOneTime} 
            onChange={handleChange}
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="isOneTime" style={{ marginBottom: 0, cursor: 'pointer' }}>
            Це одноразова акція?
          </label>
        </div>

        <div className="form-group">
          <label>Термін дії знижки (днів)</label>
          <input 
            type="number" name="activeDaysDuration" min="1"
            placeholder="Пусто = безстрокова"
            value={formData.activeDaysDuration} onChange={handleChange} 
          />
          <small style={{color:'#666'}}>Скільки днів є у клієнта, щоб використати знижку після отримання.</small>
        </div>
      </div>

      {/* --- ВИЗУАЛЬНЫЙ КАЛЬКУЛЯТОР РАСХОДОВ --- */}
      {maxBudget !== null && (
        <div className="budget-calculator" style={{
          background: '#fff0f5',
          padding: '15px',
          borderRadius: '6px',
          borderLeft: '4px solid #e91e63',
          margin: '20px 0 10px 0'
        }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#c2185b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📊 Фінансовий калькулятор лімітів:
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#333', lineHeight: '1.4' }}>
            При виділенні <strong>{formData.maxAllocations}</strong> місць та обмеженні знижки у <strong>{formData.maxDiscountAmount} грн</strong> на поїздку, максимальне навантаження на бюджет (виплата компенсацій водіям) складе не більше ніж:
          </p>
          <div style={{ marginTop: '8px', fontSize: '1.25rem', fontWeight: 'bold', color: '#e91e63' }}>
            {maxBudget.toLocaleString()} грн
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          Відміна
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Створення...' : 'Створити'}
        </button>
      </div>
    </form>
  );
};

export default PromoForm;
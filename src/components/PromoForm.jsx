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
      requiredRides: parseInt(formData.requiredRides) || 0,
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

  // Расчет максимального лимита расходов
  const allocations = parseInt(formData.maxAllocations) || 0;
  const maxDiscount = parseFloat(formData.maxDiscountAmount) || 0;
  const hasLimit = allocations > 0 && maxDiscount > 0;
  const maxTotalBudget = hasLimit ? allocations * maxDiscount : null;

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-section">
        <h3 className="form-section-title">Основна інформація</h3>
        
        <div className="form-grid-2col">
          <div className="form-group span-2">
            <label className="form-label">Назва акції *</label>
            <input 
              type="text" 
              name="title" 
              className="input-field"
              placeholder="Наприклад: Легкий старт для нових клієнтів" 
              value={formData.title} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="form-group span-2">
            <label className="form-label">Опис завдання для клієнта *</label>
            <textarea 
              name="description" 
              className="input-field"
              style={{ minHeight: '65px', resize: 'vertical' }}
              placeholder="Наприклад: Зроби 5 поїздок по місту та отримай знижку на наступну!" 
              value={formData.description} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Умова: Кількість поїздок (шт)</label>
            <input 
              type="number" 
              name="requiredRides" 
              min="0"
              className="input-field"
              placeholder="0 = не вимагається"
              value={formData.requiredRides} 
              onChange={handleChange} 
            />
            <span className="form-hint">Скільки поїздок повинен виконати клієнт</span>
          </div>
          
          <div className="form-group">
            <label className="form-label">АБО Дистанція (км)</label>
            <input 
              type="number" 
              name="requiredDistanceKm" 
              min="0" 
              step="0.1"
              className="input-field"
              placeholder="0 = не вимагається"
              value={formData.requiredDistanceKm} 
              onChange={handleChange} 
            />
            <span className="form-hint">Сумарний кілометраж для заліку</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Параметри винагороди та фінансові ліміти</h3>

        <div className="form-grid-2col">
          <div className="form-group">
            <label className="form-label">Відсоток знижки (%) *</label>
            <input 
              type="number" 
              name="discountPercent" 
              min="1" 
              max="100"
              className="input-field"
              value={formData.discountPercent} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Макс. сума знижки на поїздку (грн)</label>
            <input 
              type="number" 
              name="maxDiscountAmount" 
              min="0" 
              className="input-field"
              placeholder="Пусто = без ліміту суми"
              value={formData.maxDiscountAmount} 
              onChange={handleChange} 
            />
            <span className="form-hint">Стеля компенсації на 1 поїздку</span>
          </div>

          <div className="form-group">
            <label className="form-label">Ліміт місць (Кількість клієнтів)</label>
            <input 
              type="number" 
              name="maxAllocations" 
              min="1" 
              className="input-field"
              placeholder="Пусто = для всіх без обмежень"
              value={formData.maxAllocations} 
              onChange={handleChange} 
            />
            <span className="form-hint">Скільки клієнтів зможуть завершити акцію</span>
          </div>

          <div className="form-group">
            <label className="form-label">Цільовий тариф</label>
            <select 
              name="requiredTariffId" 
              className="input-field"
              value={formData.requiredTariffId} 
              onChange={handleChange}
            >
              <option value="">— Будь-який тариф —</option>
              {tariffs.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <span className="form-hint">Тариф, на якому діє акція</span>
          </div>

          <div className="form-group">
            <label className="form-label">Термін дії після отримання (днів)</label>
            <input 
              type="number" 
              name="activeDaysDuration" 
              min="1"
              className="input-field"
              placeholder="Пусто = безстроково"
              value={formData.activeDaysDuration} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group" style={{ justifyContent: 'center' }}>
            <label className="checkbox-label" style={{ marginTop: '1.2rem' }}>
              <input 
                type="checkbox" 
                name="isOneTime" 
                checked={formData.isOneTime} 
                onChange={handleChange}
              />
              <span>Одноразова акція для клієнта</span>
            </label>
          </div>
        </div>

        {/* --- ФИНАНСОВЫЙ КАЛЬКУЛЯТОР БЮДЖЕТА АКЦИИ --- */}
        {hasLimit ? (
          <div className="budget-calculator">
            <div className="budget-calculator-header">
              <h4 className="budget-calculator-title">📊 Фінансовий ліміт витрат компанії</h4>
              <span className="budget-calculator-badge">Бюджет зафіксовано</span>
            </div>
            <p className="budget-description">
              При успішному виконанні завдання <strong>{allocations}</strong> клієнтами та виплаті макс. знижки <strong>{maxDiscount} ₴</strong>:
            </p>
            <div className="budget-grid">
              <div className="budget-metric">
                <span className="budget-metric-label">Клієнтів:</span>
                <span className="budget-metric-value">{allocations.toLocaleString()} чол.</span>
              </div>
              <div className="budget-metric">
                <span className="budget-metric-label">Макс. на поїздку:</span>
                <span className="budget-metric-value">{maxDiscount} ₴</span>
              </div>
              <div className="budget-metric">
                <span className="budget-metric-label">Граничний бюджет:</span>
                <span className="budget-metric-value highlight">{maxTotalBudget.toLocaleString()} ₴</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="budget-calculator warning">
            <div className="budget-calculator-header">
              <h4 className="budget-calculator-title">⚠️ Необмежений бюджет</h4>
              <span className="budget-calculator-badge">Увага</span>
            </div>
            <p className="budget-description">
              {!allocations && !maxDiscount 
                ? 'Ліміт кількості клієнтів та суми знижки не вказано. Загальні витрати на компенсації водіям не обмежені.'
                : !allocations 
                  ? 'Не вказано загальну кількість місць (клієнтів). Будь-який клієнт зможе скористатися акцією.'
                  : 'Не вказано максимальну суму знижки у гривнях на одну поїздку.'}
            </p>
          </div>
        )}
      </div>

      <div className="form-actions justify-end">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
          Скасувати
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Збереження...' : 'Створити акцію'}
        </button>
      </div>
    </form>
  );
};

export default PromoForm;
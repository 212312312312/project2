import React, { useState } from 'react';
import { createPromoCode } from '../services/promoService';
import '../assets/Form.css';
import '../assets/Modal.css';

const CreatePromoCodeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    discountPercent: '15',
    maxDiscountAmount: '',
    usageLimit: '',
    activeDays: '',
    durationHours: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountPercent: parseFloat(formData.discountPercent),
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        activeDays: formData.activeDays ? parseInt(formData.activeDays) : null,
        durationHours: formData.durationHours ? parseInt(formData.durationHours) : null
      };

      await createPromoCode(payload);
      
      onSuccess();
      onClose();
      setFormData({ 
        code: '', 
        discountPercent: '15', 
        maxDiscountAmount: '', 
        usageLimit: '', 
        activeDays: '', 
        durationHours: '' 
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Калькулятор максимального бюджета промокода
  const limit = parseInt(formData.usageLimit) || 0;
  const maxCap = parseFloat(formData.maxDiscountAmount) || 0;
  const hasFixedCap = limit > 0 && maxCap > 0;
  const maxPromoBudget = hasFixedCap ? limit * maxCap : null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h2>Створити Промокод</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-section">
              <h3 className="form-section-title">Налаштування промокоду</h3>

              <div className="form-grid-2col">
                <div className="form-group span-2">
                  <label className="form-label">Код купона *</label>
                  <input 
                    type="text"
                    name="code" 
                    className="input-field"
                    value={formData.code} 
                    onChange={handleChange} 
                    required 
                    style={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
                    placeholder="Наприклад: KYIV2026, SUMMER50"
                  />
                  <span className="form-hint">Клієнти вводитимуть цей код у мобільному додатку</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Знижка (%) *</label>
                  <input 
                    type="number" 
                    name="discountPercent" 
                    className="input-field"
                    value={formData.discountPercent} 
                    onChange={handleChange} 
                    required 
                    min="1" 
                    max="100" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Макс. знижка (грн)</label>
                  <input 
                    type="number" 
                    name="maxDiscountAmount" 
                    className="input-field"
                    value={formData.maxDiscountAmount} 
                    onChange={handleChange} 
                    placeholder="Пусто = необмежено" 
                    min="0"
                  />
                  <span className="form-hint">Стеля компенсації на 1 використання</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Ліміт активацій (використань)</label>
                  <input 
                    type="number" 
                    name="usageLimit" 
                    className="input-field"
                    value={formData.usageLimit} 
                    onChange={handleChange} 
                    placeholder="Пусто = безліміт" 
                    min="1"
                  />
                  <span className="form-hint">Загальна кількість доступних активацій</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Діє після активації (годин)</label>
                  <input 
                    type="number" 
                    name="durationHours" 
                    className="input-field"
                    value={formData.durationHours} 
                    onChange={handleChange} 
                    placeholder="Пусто = безстроково" 
                    min="1"
                  />
                  <span className="form-hint">Час життя знижки після введення</span>
                </div>

                <div className="form-group span-2">
                  <label className="form-label">Термін дії купона в системі (днів)</label>
                  <input 
                    type="number" 
                    name="activeDays" 
                    className="input-field"
                    value={formData.activeDays} 
                    onChange={handleChange} 
                    placeholder="Пусто = безстроково" 
                    min="1"
                  />
                  <span className="form-hint">Через скільки днів промокод перестане діяти для нових активацій</span>
                </div>
              </div>

              {/* --- КАЛЬКУЛЯТОР МАКСИМАЛЬНОГО БЮДЖЕТА ПРОМОКОДА --- */}
              {hasFixedCap ? (
                <div className="budget-calculator">
                  <div className="budget-calculator-header">
                    <h4 className="budget-calculator-title">📊 Фінансовий ліміт рекламної кампанії</h4>
                    <span className="budget-calculator-badge">Бюджет зафіксовано</span>
                  </div>
                  <p className="budget-description">
                    При використанні промокоду <strong>{limit}</strong> разів з обмеженням знижки до <strong>{maxCap} ₴</strong>:
                  </p>
                  <div className="budget-grid">
                    <div className="budget-metric">
                      <span className="budget-metric-label">Ліміт активацій:</span>
                      <span className="budget-metric-value">{limit.toLocaleString()} раз</span>
                    </div>
                    <div className="budget-metric">
                      <span className="budget-metric-label">Макс. на поїздку:</span>
                      <span className="budget-metric-value">{maxCap} ₴</span>
                    </div>
                    <div className="budget-metric">
                      <span className="budget-metric-label">Макс. витрати:</span>
                      <span className="budget-metric-value highlight">{maxPromoBudget.toLocaleString()} ₴</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="budget-calculator warning">
                  <div className="budget-calculator-header">
                    <h4 className="budget-calculator-title">⚠️ Необмежений промокод</h4>
                    <span className="budget-calculator-badge">Увага</span>
                  </div>
                  <p className="budget-description">
                    {!limit && !maxCap 
                      ? `Промокод зі знижкою ${formData.discountPercent}% без ліміту кількості та максимальної суми у гривнях.` 
                      : !limit 
                        ? `Ліміт кількості активацій не вказано. Кодом зможуть скористатися нескінченну кількість разів.` 
                        : `Ліміт суми знижки на поїздку не зафіксовано (знижка складе ${formData.discountPercent}% від вартості будь-якої поїздки).`}
                  </p>
                </div>
              )}
            </div>

            <div className="form-actions justify-end">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Скасувати
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Створення...' : 'Створити промокод'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePromoCodeModal;
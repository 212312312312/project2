import React, { useState } from 'react';
import { createPromoCode } from '../services/promoService';
import '../assets/Modal.css'; // Используем ваши стили

const CreatePromoCodeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    discountPercent: '',
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
        code: formData.code,
        discountPercent: parseFloat(formData.discountPercent),
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        activeDays: formData.activeDays ? parseInt(formData.activeDays) : null,
        durationHours: formData.durationHours ? parseInt(formData.durationHours) : null
      };

      await createPromoCode(payload);
      
      onSuccess(); // Обновить список
      onClose();   // Закрыть
      setFormData({ code: '', discountPercent: '', maxDiscountAmount: '', usageLimit: '', activeDays: '' });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Створити Промокод</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          
          {/* Код */}
          <div className="form-group">
            <label>Код (напр. SUMMER25)</label>
            <input 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              required 
              style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
              placeholder="Введіть код..."
            />
          </div>

          {/* Скидка и Макс сумма */}
          <div className="form-row">
            <div className="form-group">
              <label>Знижка (%)</label>
              <input 
                type="number" 
                name="discountPercent" 
                value={formData.discountPercent} 
                onChange={handleChange} 
                required 
                min="1" max="100" 
              />
            </div>
            <div className="form-group">
              <label>Макс. знижка (грн)</label>
              <input 
                type="number" 
                name="maxDiscountAmount" 
                value={formData.maxDiscountAmount} 
                onChange={handleChange} 
                placeholder="Необмежено" 
              />
            </div>
          </div>

          {/* Лимиты */}
          <div className="form-row">
            <div className="form-group">
              <label>Термін дії (днів)</label>
              <input 
                type="number" 
                name="activeDays" 
                value={formData.activeDays} 
                onChange={handleChange} 
                placeholder="Безстроково" 
              />
            </div>

            <div className="form-group">
              <label>Діє після активації (годин)</label>
              <input 
                type="number" 
                name="durationHours" 
                value={formData.durationHours} 
                onChange={handleChange} 
                placeholder="Напр. 24 (∞ якщо пусте)" 
              />
              <small style={{color: '#666'}}>Скільки часу є у клієнта, щоб використати знижку після введення коду.</small>
            </div>

            <div className="form-group">
              <label>Ліміт використань</label>
              <input 
                type="number" 
                name="usageLimit" 
                value={formData.usageLimit} 
                onChange={handleChange} 
                placeholder="Безліміт" 
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Скасувати</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Створення...' : 'Створити'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePromoCodeModal;
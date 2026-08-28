import React, { useState, useEffect } from 'react';
import '../assets/Form.css';

const EVOS_SERVICE_OPTIONS = [
  { value: '', label: '— Без прив\'язки до партнера —' },
  { value: 'ANIMAL', label: '🐾 Тварина (ANIMAL)' },
  { value: 'BAGGAGE', label: '🧳 Багаж / Салон (BAGGAGE)' },
  { value: 'CONDIT', label: '❄️ Кондиціонер (CONDIT)' },
  { value: 'COURIER', label: '📦 Кур\'єрська доставка (COURIER)' },
  { value: 'BABY_SEAT', label: '👶 Дитяче крісло (BABY_SEAT)' },
  { value: 'ENGLISH', label: '🗣 Англомовний водій (ENGLISH)' },
  { value: 'TERMINAL', label: '💳 Оплата терміналом (TERMINAL)' },
  { value: 'CHECK', label: '🧾 Чек за поїздку (CHECK)' },
  { value: 'MEET', label: '🪧 Зустріч з табличкою (MEET)' }
];

const ServiceForm = ({ onSubmit, onCancel, isLoading, initialData = null }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [evosCode, setEvosCode] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price !== undefined && initialData.price !== null ? initialData.price.toString() : '');
      setEvosCode(initialData.evosCode || '');
    } else {
      setName('');
      setPrice('');
      setEvosCode('');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalPrice = parseFloat(price);
    if (price === '-' || isNaN(finalPrice) || price === '') {
      finalPrice = 0.0;
    }

    onSubmit({ 
      name: name.trim(), 
      price: finalPrice, 
      evosCode: evosCode || null 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-group">
        <label className="form-label">Назва послуги *</label>
        <input
          type="text"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Наприклад: Кондиціонер"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Ціна (грн)</label>
        <input
          type="text"
          className="input-field"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Введіть суму або '-' якщо безкоштовно"
        />
        <span className="form-hint">Пусто або "-" = Безкоштовно</span>
      </div>

      <div className="form-group">
        <label className="form-label">Код послуги для партнерів (EvoS)</label>
        <select
          className="input-field"
          value={evosCode}
          onChange={(e) => setEvosCode(e.target.value)}
        >
          {EVOS_SERVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="form-hint">Оберіть системний код для передачі партнерській мережі</span>
      </div>

      <div className="form-actions justify-end">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Скасувати
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Збереження...' : initialData ? 'Оновити послугу' : 'Створити'}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
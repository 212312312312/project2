import React, { useState } from 'react';
import '../assets/Form.css';

const ServiceForm = ({ onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalPrice = parseFloat(price);
    if (price === '-' || isNaN(finalPrice) || price === '') {
      finalPrice = 0.0;
    }

    onSubmit({ name, price: finalPrice });
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-group">
        <label className="form-label">Назва послуги</label>
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
          {isLoading ? 'Збереження...' : 'Зберегти'}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
import React, { useState } from 'react';

const NewsForm = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert("Будь ласка, заповніть всі поля");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="promo-form">
      <div className="form-group">
        <label>Заголовок новини</label>
        <input 
          type="text" 
          name="title" 
          value={formData.title} 
          onChange={handleChange} 
          placeholder="Напр. Оновлення тарифів"
          required 
        />
      </div>

      <div className="form-group">
        <label>Текст повідомлення</label>
        <textarea 
          name="content" 
          value={formData.content} 
          onChange={handleChange} 
          placeholder="Введіть текст новини для клієнтів..."
          rows="5"
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          Скасувати
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Збереження...' : 'Опублікувати'}
        </button>
      </div>
    </form>
  );
};

export default NewsForm;
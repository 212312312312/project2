import React, { useState, useEffect } from 'react';
import '../assets/Form.css'; // Используем тот же стиль

// initialData: null = Создание, объект = Редактирование
const DispatcherForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    userLogin: '',
    fullName: '',
    password: '',
  });
  
  const isEditMode = initialData !== null;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        userLogin: initialData.userLogin,
        fullName: initialData.fullName,
        password: '', // Пароль по умолчанию пуст при редактировании
      });
    } else {
      setFormData({ userLogin: '', fullName: '', password: '' });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSend = { ...formData };
    
    // При создании пароль обязателен
    if (!isEditMode && !dataToSend.password) {
      alert("Пароль обязателен для нового диспетчера");
      return;
    }
    
    // При редактировании, если пароль пуст, отправляем null
    if (isEditMode && dataToSend.password === '') {
      dataToSend.password = null;
    }
    
    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      <fieldset className="full-width">
        <legend>Данные Диспетчера</legend>
        <div className="form-grid">
          <div className="form-group">
            <label>Логин</label>
            <input type="text" name="userLogin" value={formData.userLogin} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Полное имя (ПИБ)</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder={isEditMode ? "(Оставьте пустым, чтобы не менять)" : "Минимум 6 символов"}
              minLength={isEditMode ? 0 : 6}
            />
          </div>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          Отмена
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
};

export default DispatcherForm;
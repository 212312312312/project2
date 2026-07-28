import React, { useState, useEffect } from 'react';
import '../assets/Form.css';

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
        userLogin: initialData.userLogin || '',
        fullName: initialData.fullName || '',
        password: '',
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
    
    if (!isEditMode && !dataToSend.password) {
      alert("Пароль є обов'язковим для нового диспетчера");
      return;
    }
    
    if (isEditMode && dataToSend.password === '') {
      dataToSend.password = null;
    }
    
    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-section">
        <h3 className="form-section-title">Дані диспетчера</h3>
        
        <div className="form-grid-2col">
          <div className="form-group span-2">
            <label className="form-label">Логін</label>
            <input 
              type="text" 
              name="userLogin" 
              className="input-field" 
              value={formData.userLogin} 
              onChange={handleChange} 
              placeholder="Введіть логін для входу" 
              required 
            />
          </div>

          <div className="form-group span-2">
            <label className="form-label">Повне ім'я (ПІБ)</label>
            <input 
              type="text" 
              name="fullName" 
              className="input-field" 
              value={formData.fullName} 
              onChange={handleChange} 
              placeholder="Прізвище, Ім'я, По батькові" 
              required 
            />
          </div>

          <div className="form-group span-2">
            <label className="form-label">Пароль</label>
            <input 
              type="password" 
              name="password" 
              className="input-field" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder={isEditMode ? "(Залиште порожнім, щоб не змінювати)" : "Мінімум 6 символів"}
              minLength={isEditMode ? 0 : 6}
            />
          </div>
        </div>
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

export default DispatcherForm;
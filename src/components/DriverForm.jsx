import React, { useState, useEffect } from 'react';
import '../assets/Form.css';

const DriverForm = ({ initialData, availableTariffs, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    make: '',
    model: '',
    color: '', // <-- НОВОЕ ПОЛЕ
    plateNumber: '',
    vin: '',
    year: 2010,
    tariffIds: [],
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const isEditMode = initialData !== null;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        fullName: initialData.fullName,
        phoneNumber: initialData.phoneNumber,
        password: '', 
        make: initialData.car?.make || '',
        model: initialData.car?.model || '',
        color: initialData.car?.color || '', // <-- Загружаем цвет
        plateNumber: initialData.car?.plateNumber || '',
        vin: initialData.car?.vin || '',
        year: initialData.car?.year || 2010,
        tariffIds: initialData.allowedTariffs.map(t => t.id),
      });
    } else {
      setFormData({
        fullName: '', phoneNumber: '', password: '',
        make: '', model: '', color: '', plateNumber: '', vin: '', year: 2010,
        tariffIds: [],
      });
    }
    setSelectedFile(null);
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleTariffChange = (tariffId) => {
    setFormData(prev => {
      const currentTariffIds = prev.tariffIds;
      if (currentTariffIds.includes(tariffId)) {
        return { ...prev, tariffIds: currentTariffIds.filter(id => id !== tariffId) };
      } else {
        return { ...prev, tariffIds: [...currentTariffIds, tariffId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData, year: parseInt(formData.year) };
    if (isEditMode) {
      delete dataToSend.password;
      delete dataToSend.phoneNumber;
    }
    onSubmit(dataToSend, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      <div className="form-grid">
        <fieldset>
          <legend>Данные Водителя</legend>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Фото Водителя</label>
            <input type="file" onChange={handleFileChange} accept="image/*" />
            {isEditMode && initialData.photoUrl && !selectedFile && <small style={{color:'green'}}>Фото есть</small>}
          </div>
          <div className="form-group">
            <label>ФИО</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Телефон</label>
            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} disabled={isEditMode} required />
          </div>
          {!isEditMode && (
            <div className="form-group">
              <label>Пароль</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Данные Автомобиля</legend>
          <div className="form-group">
            <label>Марка</label>
            <input type="text" name="make" value={formData.make} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Модель</label>
            <input type="text" name="model" value={formData.model} onChange={handleChange} required />
          </div>
          
          {/* ПОЛЕ ЦВЕТ */}
          <div className="form-group">
            <label>Колір</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} required placeholder="напр. Білий" />
          </div>

          <div className="form-group">
            <label>Держ. номер</label>
            <input type="text" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>VIN</label>
            <input type="text" name="vin" value={formData.vin} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Рік</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} required min={1990} />
          </div>
        </fieldset>
      </div>

      <fieldset className="full-width">
        <legend>Доступные Тарифы</legend>
        <div className="checkbox-group">
          {availableTariffs.length > 0 ? (
            availableTariffs.map(tariff => (
              <label key={tariff.id} className="checkbox-label">
                <input type="checkbox" checked={formData.tariffIds.includes(tariff.id)} onChange={() => handleTariffChange(tariff.id)} />
                {tariff.name}
              </label>
            ))
          ) : <p>Нет тарифов</p>}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>Отмена</button>
        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? '...' : 'Сохранить'}</button>
      </div>
    </form>
  );
};

export default DriverForm;
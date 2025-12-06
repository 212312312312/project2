import React, { useState, useEffect } from 'react';
import '../assets/Form.css'; // <-- НОВЫЙ CSS ДЛЯ ФОРМЫ

// availableTariffs - список всех тарифов из БД
const DriverForm = ({ initialData, availableTariffs, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    // User data
    fullName: '',
    phoneNumber: '',
    password: '',
    // Car data
    make: '',
    model: '',
    plateNumber: '',
    vin: '',
    year: 2010,
    // Tariffs
    tariffIds: [], // Список ID (напр. [1, 3])
  });
  
  const isEditMode = initialData !== null;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        fullName: initialData.fullName,
        phoneNumber: initialData.phoneNumber,
        password: '', 
        make: initialData.car?.make || '',
        model: initialData.car?.model || '',
        plateNumber: initialData.car?.plateNumber || '',
        vin: initialData.car?.vin || '',
        year: initialData.car?.year || 2010,
        // Превращаем List<CarTariffDto> в List<ID>
        tariffIds: initialData.allowedTariffs.map(t => t.id),
      });
    } else {
      // Сброс
      setFormData({
        fullName: '', phoneNumber: '', password: '',
        make: '', model: '', plateNumber: '', vin: '', year: 2010,
        tariffIds: [],
      });
    }
  }, [initialData, isEditMode]);

  // Обработчик для обычных полей
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // ОБРАБОТЧИК ДЛЯ ЧЕКБОКСОВ ТАРИФОВ
  const handleTariffChange = (tariffId) => {
    setFormData(prev => {
      const currentTariffIds = prev.tariffIds;
      if (currentTariffIds.includes(tariffId)) {
        // Если ID уже есть -> убираем (снимаем галочку)
        return { ...prev, tariffIds: currentTariffIds.filter(id => id !== tariffId) };
      } else {
        // Если ID нет -> добавляем (ставим галочку)
        return { ...prev, tariffIds: [...currentTariffIds, tariffId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Конвертируем год в число
    const dataToSend = {
      ...formData,
      year: parseInt(formData.year)
    };
    
    // Если это режим Редактирования, убираем пароль и номер (которые мы не меняем)
    if (isEditMode) {
      delete dataToSend.password;
      delete dataToSend.phoneNumber;
    }
    
    onSubmit(dataToSend);
  };

  return (
    // 'driver-form' теперь называется 'entity-form'
    <form onSubmit={handleSubmit} className="entity-form">
      <div className="form-grid">
        {/* --- Блок 1: Данные Водителя --- */}
        <fieldset>
          <legend>Данные Водителя</legend>
          <div className="form-group">
            <label>ФИО</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Номер телефона</label>
            <input 
              type="tel" 
              name="phoneNumber" 
              value={formData.phoneNumber} 
              onChange={handleChange} 
              disabled={isEditMode} 
              required 
            />
          </div>
          {!isEditMode && (
            <div className="form-group">
              <label>Пароль (мин. 6)</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
            </div>
          )}
        </fieldset>

        {/* --- Блок 2: Данные Автомобиля --- */}
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
          <div className="form-group">
            <label>Гос. номер</label>
            <input type="text" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>VIN</label>
            <input type="text" name="vin" value={formData.vin} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Год</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} required min={1990} />
          </div>
        </fieldset>
      </div>

      {/* --- Блок 3: Тарифы --- */}
      <fieldset className="full-width">
        <legend>Доступные Тарифы</legend>
        <div className="checkbox-group">
          {availableTariffs.length > 0 ? (
            availableTariffs.map(tariff => (
              <label key={tariff.id} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={formData.tariffIds.includes(tariff.id)} 
                  onChange={() => handleTariffChange(tariff.id)}
                />
                {tariff.name} (База: {tariff.basePrice})
              </label>
            ))
          ) : (
            <p>Нет доступных тарифов. Сначала создайте их во вкладке "Тарифы".</p>
          )}
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

export default DriverForm;
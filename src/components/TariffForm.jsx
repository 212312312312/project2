import React, { useState, useEffect } from 'react';
import { getEvosTariffs } from '../services/tariffService';
import '../assets/Form.css';

const TariffForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  // 🟢 Инициализируем состояние тарифов EvoS
  const [evosTariffs, setEvosTariffs] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    evosTariffName: '',
    basePrice: 0.0,
    pricePerKm: 0.0,
    pricePerKmOutCity: 0.0,
    extraWaypointPrice: 0.0,
    freeWaitingMinutes: 3,
    pricePerWaitingMinute: 0.0,
    isActive: true,
    isBeta: false,
    isUnavailable: false,
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const isEditMode = initialData !== null;

  // Безопасная загрузка тарифов биржи EvoS
  useEffect(() => {
    let isMounted = true;
    getEvosTariffs()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setEvosTariffs(data);
        }
      })
      .catch((err) => {
        console.error('Не вдалося завантажити тарифи EvoS:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Заполнение формы при открытии на редактирование
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        name: initialData.name || '',
        evosTariffName: (typeof initialData.evosTariffName === 'object'
          ? initialData.evosTariffName?.name
          : initialData.evosTariffName) || '',
        basePrice: initialData.basePrice ?? 0.0,
        pricePerKm: initialData.pricePerKm ?? 0.0,
        pricePerKmOutCity: initialData.pricePerKmOutCity ?? 0.0,
        extraWaypointPrice: initialData.extraWaypointPrice ?? 0.0,
        freeWaitingMinutes: initialData.freeWaitingMinutes ?? 3,
        pricePerWaitingMinute: initialData.pricePerWaitingMinute ?? 0.0,
        isActive: initialData.isActive ?? true,
        isBeta: initialData.isBeta ?? false,
        isUnavailable: initialData.isUnavailable ?? false,
      });
      setExistingImageUrl(initialData.imageUrl || null);
    } else {
      setFormData({
        name: '',
        evosTariffName: '',
        basePrice: 0.0,
        pricePerKm: 0.0,
        pricePerKmOutCity: 0.0,
        extraWaypointPrice: 0.0,
        freeWaitingMinutes: 3,
        pricePerWaitingMinute: 0.0,
        isActive: true,
        isBeta: false,
        isUnavailable: false,
      });
      setExistingImageUrl(null);
    }
    setSelectedFile(null);
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      evosTariffName: formData.evosTariffName ? formData.evosTariffName : null,
      basePrice: parseFloat(formData.basePrice) || 0,
      pricePerKm: parseFloat(formData.pricePerKm) || 0,
      pricePerKmOutCity: parseFloat(formData.pricePerKmOutCity) || 0,
      extraWaypointPrice: parseFloat(formData.extraWaypointPrice) || 0,
      freeWaitingMinutes: parseInt(formData.freeWaitingMinutes, 10) || 0,
      pricePerWaitingMinute: parseFloat(formData.pricePerWaitingMinute) || 0,
    };
    
    onSubmit(dataToSend, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-section">
        <h3 className="form-section-title">Параметри тарифу</h3>
        
        <div className="form-grid-2col">
          <div className="form-group span-2">
            <label className="form-label">Назва тарифу</label>
            <input 
              type="text" 
              name="name" 
              className="input-field" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Наприклад: Стандарт" 
              required 
            />
          </div>

          <div className="form-group span-2">
            <label className="form-label">Відповідний тариф у біржі СОЗ (EvoS)</label>
            <select
              name="evosTariffName"
              className="input-field"
              value={formData.evosTariffName || ''}
              onChange={handleChange}
            >
              <option value="">-- Без прив'язки до біржі EvoS --</option>
              {Array.isArray(evosTariffs) && evosTariffs.map((item, idx) => {
                const tariffName = typeof item === 'string' ? item : item?.name;
                if (!tariffName) return null;
                return (
                  <option key={`${tariffName}-${idx}`} value={tariffName}>
                    {tariffName}
                  </option>
                );
              })}
            </select>
            <span className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-subtle, #888)', marginTop: '4px', display: 'block' }}>
              Клас авто, з яким замовлення цього тарифу створюватиметься у партнерській біржі EvoS
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Базова ціна (грн)</label>
            <input 
              type="number" 
              step="0.01" 
              name="basePrice" 
              className="input-field" 
              value={formData.basePrice} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Додаткова точка (грн)</label>
            <input 
              type="number" 
              step="0.01" 
              name="extraWaypointPrice" 
              className="input-field" 
              value={formData.extraWaypointPrice} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ціна за 1 км (Місто)</label>
            <input 
              type="number" 
              step="0.01" 
              name="pricePerKm" 
              className="input-field" 
              value={formData.pricePerKm} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ціна за 1 км (За містом)</label>
            <input 
              type="number" 
              step="0.01" 
              name="pricePerKmOutCity" 
              className="input-field" 
              value={formData.pricePerKmOutCity} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Безкоштовне очікування (хв)</label>
            <input 
              type="number" 
              name="freeWaitingMinutes" 
              className="input-field" 
              value={formData.freeWaitingMinutes} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ціна очікування / хв</label>
            <input 
              type="number" 
              step="0.01" 
              name="pricePerWaitingMinute" 
              className="input-field" 
              value={formData.pricePerWaitingMinute} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="form-checkboxes-group">
          <label className="checkbox-item">
            <input 
              type="checkbox" 
              name="isActive" 
              checked={formData.isActive} 
              onChange={handleChange} 
            />
            <span>Активний (видимий для замовлень)</span>
          </label>

          <label className="checkbox-item">
            <input 
              type="checkbox" 
              name="isBeta" 
              checked={formData.isBeta} 
              onChange={handleChange} 
            />
            <span className="text-danger font-medium">Режим BETA</span>
          </label>

          <label className="checkbox-item">
            <input 
              type="checkbox" 
              name="isUnavailable" 
              checked={formData.isUnavailable} 
              onChange={handleChange} 
            />
            <span className="text-subtle">Тимчасово недоступний (сірий статус)</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Іконка тарифу (PNG)</h3>
        <div className="form-group">
          <input 
            type="file" 
            className="input-field" 
            onChange={handleFileChange} 
            accept="image/png, image/jpeg" 
          />
          
          {isEditMode && existingImageUrl && !selectedFile && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="form-hint">Поточна іконка:</span>
              <img 
                src={existingImageUrl} 
                alt={formData.name} 
                style={{ width: 36, height: 36, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-actions justify-end" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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

export default TariffForm;
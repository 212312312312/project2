import React, { useState, useEffect } from 'react';
import '../assets/Form.css'; 

const TariffForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0.0,
    pricePerKm: 0.0,
    pricePerKmOutCity: 0.0,
    extraWaypointPrice: 0.0,
    freeWaitingMinutes: 3,
    pricePerWaitingMinute: 0.0,
    isActive: true,
    isBeta: false,        // <-- НОВОЕ ПОЛЕ
    isUnavailable: false, // <-- НОВОЕ ПОЛЕ
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const isEditMode = initialData !== null;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        name: initialData.name,
        basePrice: initialData.basePrice,
        pricePerKm: initialData.pricePerKm,
        pricePerKmOutCity: initialData.pricePerKmOutCity || 0.0,
        extraWaypointPrice: initialData.extraWaypointPrice || 0.0,
        freeWaitingMinutes: initialData.freeWaitingMinutes,
        pricePerWaitingMinute: initialData.pricePerWaitingMinute,
        isActive: initialData.isActive,
        isBeta: initialData.isBeta || false,               // <-- Загружаем
        isUnavailable: initialData.isUnavailable || false, // <-- Загружаем
      });
      setExistingImageUrl(initialData.imageUrl); 
    } else {
      setFormData({
        name: '', basePrice: 0.0, pricePerKm: 0.0, pricePerKmOutCity: 0.0,
        extraWaypointPrice: 0.0,
        freeWaitingMinutes: 3, pricePerWaitingMinute: 0.0, 
        isActive: true, isBeta: false, isUnavailable: false, // <-- Сбрасываем
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
      basePrice: parseFloat(formData.basePrice),
      pricePerKm: parseFloat(formData.pricePerKm),
      pricePerKmOutCity: parseFloat(formData.pricePerKmOutCity),
      extraWaypointPrice: parseFloat(formData.extraWaypointPrice),
      freeWaitingMinutes: parseInt(formData.freeWaitingMinutes),
      pricePerWaitingMinute: parseFloat(formData.pricePerWaitingMinute),
      // isBeta и isUnavailable - булевы, уйдут как есть
    };
    
    onSubmit(dataToSend, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      <fieldset className="full-width">
        <legend>Tariff Details</legend>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Tariff Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Base Price</label>
            <input type="number" step="0.01" name="basePrice" value={formData.basePrice} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Extra Waypoint Price</label>
            <input type="number" step="0.01" name="extraWaypointPrice" value={formData.extraWaypointPrice} onChange={handleChange} required style={{ borderColor: '#4caf50' }}/>
          </div>
          <div className="form-group">
            <label>Price per 1 km (City)</label>
            <input type="number" step="0.01" name="pricePerKm" value={formData.pricePerKm} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label>Price per 1 km (Out of City)</label>
            <input type="number" step="0.01" name="pricePerKmOutCity" value={formData.pricePerKmOutCity} onChange={handleChange} required style={{ borderColor: '#ff9800' }}/>
          </div>

          <div className="form-group">
            <label>Free waiting (min)</label>
            <input type="number" name="freeWaitingMinutes" value={formData.freeWaitingMinutes} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Price per waiting min</label>
            <input type="number" step="0.01" name="pricePerWaitingMinute" value={formData.pricePerWaitingMinute} onChange={handleChange} required />
          </div>

          {/* --- ЧЕКБОКСЫ СТАТУСОВ --- */}
          <div className="form-group checkbox-label" style={{alignItems: 'center'}}>
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
            <label>Active (Visible)</label>
          </div>
          
          <div className="form-group checkbox-label" style={{alignItems: 'center'}}>
            <input type="checkbox" name="isBeta" checked={formData.isBeta} onChange={handleChange} />
            <label style={{color: '#d32f2f', fontWeight: 'bold'}}>BETA Mode</label>
          </div>

          <div className="form-group checkbox-label" style={{alignItems: 'center'}}>
            <input type="checkbox" name="isUnavailable" checked={formData.isUnavailable} onChange={handleChange} />
            <label style={{color: '#757575'}}>Make Unavailable (Grey out)</label>
          </div>
        </div>
      </fieldset>
      
      <fieldset className="full-width">
        <legend>Tariff Icon (PNG)</legend>
        <div className="form-group">
          <label>Upload new icon (optional)</label>
          <input type="file" name="file" onChange={handleFileChange} accept="image/png, image/jpeg" />
          
          {isEditMode && existingImageUrl && !selectedFile && (
            <div style={{marginTop: '10px'}}>
              <p>Current Icon:</p>
              <img src={existingImageUrl} alt={formData.name} style={{width: '50px', height: '50px', objectFit: 'cover'}} />
            </div>
          )}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default TariffForm;
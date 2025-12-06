import React, { useState, useEffect } from 'react';
import '../assets/Form.css'; 

const TariffForm = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0.0,
    pricePerKm: 0.0,
    freeWaitingMinutes: 3,
    pricePerWaitingMinute: 0.0,
    isActive: true,
  });
  
  // --- NEW STATE for the file ---
  const [selectedFile, setSelectedFile] = useState(null);
  // Store the URL of the existing image (for edit mode)
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const isEditMode = initialData !== null;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        name: initialData.name,
        basePrice: initialData.basePrice,
        pricePerKm: initialData.pricePerKm,
        freeWaitingMinutes: initialData.freeWaitingMinutes,
        pricePerWaitingMinute: initialData.pricePerWaitingMinute,
        isActive: initialData.isActive,
      });
      // Set the existing image URL to show a preview
      setExistingImageUrl(initialData.imageUrl); 
    } else {
      // Reset form for 'Create'
      setFormData({
        name: '', basePrice: 0.0, pricePerKm: 0.0,
        freeWaitingMinutes: 3, pricePerWaitingMinute: 0.0, isActive: true,
      });
      setExistingImageUrl(null);
    }
    // Always clear the file input on open
    setSelectedFile(null); 
  }, [initialData, isEditMode]);

  // Handler for text/number/check inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // --- NEW Handler for file input ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 1. Convert numbers
    const dataToSend = {
      ...formData,
      basePrice: parseFloat(formData.basePrice),
      pricePerKm: parseFloat(formData.pricePerKm),
      freeWaitingMinutes: parseInt(formData.freeWaitingMinutes),
      pricePerWaitingMinute: parseFloat(formData.pricePerWaitingMinute),
    };
    
    // 2. Pass BOTH the data and the file to the parent
    onSubmit(dataToSend, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      <fieldset className="full-width">
        <legend>Tariff Details</legend>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Tariff Name (e.g., "Economy")</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Base Price ("Minimum")</label>
            <input type="number" step="0.01" name="basePrice" value={formData.basePrice} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Price per 1 km</label>
            <input type="number" step="0.01" name="pricePerKm" value={formData.pricePerKm} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Free waiting (min)</label>
            <input type="number" name="freeWaitingMinutes" value={formData.freeWaitingMinutes} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Price per waiting min</label>
            <input type="number" step="0.01" name="pricePerWaitingMinute" value={formData.pricePerWaitingMinute} onChange={handleChange} required />
          </div>
          <div className="form-group checkbox-label" style={{alignItems: 'center'}}>
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
            <label>Tariff Active</label>
          </div>
        </div>
      </fieldset>
      
      {/* --- NEW FILE INPUT FIELDSET --- */}
      <fieldset className="full-width">
        <legend>Tariff Icon (PNG)</legend>
        <div className="form-group">
          <label>Upload new icon (optional)</label>
          <input type="file" name="file" onChange={handleFileChange} accept="image/png, image/jpeg" />
          
          {/* Show the existing image if we are in Edit mode */}
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
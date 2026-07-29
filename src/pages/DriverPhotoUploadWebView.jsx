import React, { useState } from 'react';
import { photoControlService } from '../services/photoControlService';

const DriverPhotoUploadWebView = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const photoControlId = urlParams.get('id');
  const driverId = urlParams.get('driverId');

  const [photos, setPhotos] = useState({
    frontUrl: '',
    backUrl: '',
    leftUrl: '',
    rightUrl: '',
    interiorFrontUrl: '',
    interiorBackUrl: '',
  });

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setPhotos(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoControlId || !driverId) {
      alert('Некоректне посилання');
      return;
    }

    try {
      setUploading(true);
      await photoControlService.submitPhotos(photoControlId, driverId, photos);
      setSuccess(true);
    } catch (err) {
      alert('Помилка відправки фото. Перевірте всі поля.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#2ecc71' }}>Фото успішно відправлені!</h2>
        <p>Диспетчер перевірить їх найближчим часом.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <h3>Фотоконтроль автомобіля</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>Вкажіть посилання на 6 фотографій автомобіля та салону:</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label>Фото спереду:
          <input type="text" required placeholder="https://..." value={photos.frontUrl} onChange={(e) => handleInputChange('frontUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>
        <label>Фото ззаду:
          <input type="text" required placeholder="https://..." value={photos.backUrl} onChange={(e) => handleInputChange('backUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>
        <label>Фото зліва:
          <input type="text" required placeholder="https://..." value={photos.leftUrl} onChange={(e) => handleInputChange('leftUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>
        <label>Фото справа:
          <input type="text" required placeholder="https://..." value={photos.rightUrl} onChange={(e) => handleInputChange('rightUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>
        <label>Салон (спереду):
          <input type="text" required placeholder="https://..." value={photos.interiorFrontUrl} onChange={(e) => handleInputChange('interiorFrontUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>
        <label>Салон (ззаду):
          <input type="text" required placeholder="https://..." value={photos.interiorBackUrl} onChange={(e) => handleInputChange('interiorBackUrl', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>

        <button type="submit" disabled={uploading} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '16px', marginTop: '10px' }}>
          {uploading ? 'Надсилання...' : 'Надіслати на перевірку'}
        </button>
      </form>
    </div>
  );
};

export default DriverPhotoUploadWebView;
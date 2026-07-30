import React, { useState } from 'react';

const colors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textMain: '#1E293B',
  textSec: '#64748B',
  primary: '#14B8A6',
  border: '#E2E8F0',
  error: '#EF4444'
};

const AddCarPage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    color: '',
    year: '',
    plate_number: '',
    vin: ''
  });

  const [files, setFiles] = useState({});

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, fieldName) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [fieldName]: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setError('Помилка авторизації: токен відсутній. Будь ласка, перевідкрийте форму з додатка.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const bodyData = new FormData();
      bodyData.append('data', JSON.stringify(formData));

      Object.keys(files).forEach(key => {
        if (files[key]) bodyData.append(key, files[key]);
      });

      const response = await fetch('/api/v1/driver/cars/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: bodyData
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedMessage = jsonErr.message || errorText;
        } catch (_) {}
        throw new Error(parsedMessage || 'Помилка сервера при збереженні авто');
      }
    } catch (err) {
      console.error('Помилка відправки:', err);
      if (err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
        setError('Помилка з\'єднання з сервером. Перевірте розмір фото або інтернет-з\'єднання.');
      } else {
        setError(err.message || 'Помилка відправки. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ background: colors.card, padding: '24px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
        <h2 style={{ textAlign: 'center', color: colors.textMain, marginTop: 0 }}>Заявка на нове авто</h2>

        <form onSubmit={handleSubmit}>
          <h3 style={{ color: colors.primary, borderBottom: `2px solid ${colors.border}`, paddingBottom: '8px' }}>Характеристики</h3>
          <input name="brand" placeholder="Марка авто (Toyota)" required onChange={handleInputChange} style={inputStyle} />
          <input name="model" placeholder="Модель авто (Camry)" required onChange={handleInputChange} style={inputStyle} />
          <input name="color" placeholder="Колір (Білий)" required onChange={handleInputChange} style={inputStyle} />
          <input name="year" type="number" placeholder="Рік випуску (2018)" required onChange={handleInputChange} style={inputStyle} />
          <input name="plate_number" placeholder="Держ. номер (АА 1234 ВВ)" required onChange={handleInputChange} style={inputStyle} />
          <input name="vin" placeholder="VIN код (17 символів)" onChange={handleInputChange} style={inputStyle} />

          <h3 style={{ color: colors.primary, borderBottom: `2px solid ${colors.border}`, paddingBottom: '8px', marginTop: '20px' }}>Документи</h3>
          <FileInput label="Техпаспорт (Лицьова)" name="tech_passport_front" onChange={handleFileChange} />
          <FileInput label="Техпаспорт (Зворот)" name="tech_passport_back" onChange={handleFileChange} />
          <FileInput label="Страховий поліс" name="insurance_photo" onChange={handleFileChange} />

          <h3 style={{ color: colors.primary, borderBottom: `2px solid ${colors.border}`, paddingBottom: '8px', marginTop: '20px' }}>Екстер'єр авто</h3>
          <FileInput label="Фото спереду (з номером)" name="photo_front" onChange={handleFileChange} />
          <FileInput label="Фото ззаду" name="photo_back" onChange={handleFileChange} />
          <FileInput label="Фото зліва" name="photo_left" onChange={handleFileChange} />
          <FileInput label="Фото справа" name="photo_right" onChange={handleFileChange} />

          <h3 style={{ color: colors.primary, borderBottom: `2px solid ${colors.border}`, paddingBottom: '8px', marginTop: '20px' }}>Інтер'єр</h3>
          <FileInput label="Салон (передні сидіння)" name="photo_seats_front" onChange={handleFileChange} />
          <FileInput label="Салон (задні сидіння)" name="photo_seats_back" onChange={handleFileChange} />
          <FileInput label="Багажник" name="photo_trunk" onChange={handleFileChange} />

          {error && <div style={{ color: colors.error, marginTop: '12px', textAlign: 'center' }}>{error}</div>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Завантаження...' : 'Відправити заявку'}
          </button>
        </form>
      </div>
    </div>
  );
};
    
const FileInput = ({ label, name, onChange }) => (
  <div style={{ marginBottom: '12px' }}>
    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: colors.textSec }}>{label} *</label>
    <input type="file" accept="image/*" required onChange={(e) => onChange(e, name)} style={{ width: '100%' }} />
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
  boxSizing: 'border-box'
};

const btnStyle = {
  width: '100%',
  padding: '16px',
  backgroundColor: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '20px'
};

export default AddCarPage;
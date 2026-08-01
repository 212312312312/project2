import React, { useState, useEffect, useRef } from 'react';
import { getCities, getCarBrands, getCarModels, evaluateCarTariffs } from '../services/publicService';

// --- СТИЛИ И ЦВЕТА (1 в 1 как в DriverRegistrationPage.jsx) ---
const colors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textMain: '#1E293B',
  textSec: '#64748B',
  primary: '#14B8A6', // Бирюзовый
  primaryLight: '#CCFBF1',
  border: '#E2E8F0',
  error: '#EF4444',
  bgInput: '#F1F5F9',
  success: '#10B981',
  warning: '#F59E0B'
};

const pageStyle = {
  padding: '20px 20px 100px 20px',
  maxWidth: '600px',
  margin: '0 auto',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  backgroundColor: colors.bg,
  minHeight: '100vh',
  boxSizing: 'border-box'
};

const headerStyle = {
  fontSize: '26px',
  fontWeight: '800',
  color: colors.textMain,
  marginBottom: '8px',
  textAlign: 'center'
};

const subHeaderStyle = {
  fontSize: '15px',
  color: colors.textSec,
  marginBottom: '30px',
  textAlign: 'center',
  lineHeight: '1.5'
};

const inputGroupStyle = { marginBottom: '16px' };
const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: colors.textSec,
  marginBottom: '6px',
  marginLeft: '4px'
};

const inputBaseStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: '16px',
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.card,
  fontSize: '16px',
  color: colors.textMain,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  WebkitTapHighlightColor: 'transparent'
};

const selectStyle = {
  ...inputBaseStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: '40px'
};

const fixedBottomBtnStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  width: '100%',
  padding: '20px',
  backgroundColor: colors.primary,
  color: '#fff',
  border: 'none',
  fontSize: '18px',
  fontWeight: '700',
  cursor: 'pointer',
  zIndex: 100,
  boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
  letterSpacing: '0.5px',
  WebkitTapHighlightColor: 'transparent'
};

const errorStyle = {
  color: colors.error,
  fontSize: '14px',
  textAlign: 'center',
  marginTop: '10px',
  padding: '10px',
  backgroundColor: '#FEF2F2',
  borderRadius: '12px',
  border: `1px solid #FECACA`
};

const backBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  backgroundColor: '#fff',
  border: `1px solid ${colors.border}`,
  marginBottom: '15px',
  cursor: 'pointer',
  color: colors.textMain,
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  WebkitTapHighlightColor: 'transparent'
};

// --- ИКОНКИ ---
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{color: colors.textSec}}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.primary} stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={colors.primary} stroke="none"></circle>
    <path d="M9 12l2 2 4-4"></path>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

// --- УМНЫЙ ВЫПАДАЮЩИЙ СПИСОК С ПОИСКОМ ---
const SearchableSelect = ({ label, name, value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => 
    typeof opt === 'object' ? String(opt.id || opt.name) === String(value) : String(opt) === String(value)
  );

  const displayLabel = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.name : selectedOption)
    : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const text = typeof opt === 'object' ? opt.name : String(opt);
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (opt) => {
    const optValue = typeof opt === 'object' ? (opt.id !== undefined ? opt.id : opt.name) : opt;
    onChange({ target: { name, value: optValue } });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div style={{ ...inputGroupStyle, position: 'relative' }} ref={containerRef}>
      {label && <label style={labelStyle}>{label}</label>}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          ...inputBaseStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#F1F5F9' : colors.card,
          color: displayLabel ? colors.textMain : colors.textSec,
          paddingRight: '16px',
          borderColor: isOpen ? colors.primary : colors.border
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel || placeholder}
        </span>
        <span style={{ fontSize: '10px', color: colors.textSec, marginLeft: '8px' }}>▼</span>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: `1px solid ${colors.border}` }}>
            <input
              type="text"
              placeholder="🔍 Введіть для пошуку..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                outline: 'none',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: colors.bgInput
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const optLabel = typeof opt === 'object' ? opt.name : opt;
                const optVal = typeof opt === 'object' ? (opt.id !== undefined ? opt.id : opt.name) : opt;
                const isSelected = String(optVal) === String(value);

                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                    style={{
                      padding: '12px 16px',
                      fontSize: '15px',
                      color: isSelected ? colors.primary : colors.textMain,
                      fontWeight: isSelected ? '700' : '400',
                      backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      borderBottom: index === filteredOptions.length - 1 ? 'none' : `1px solid #F8FAFC`
                    }}
                  >
                    {optLabel}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: colors.textSec, fontSize: '14px' }}>
                Нічого не знайдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- КАРТОЧКА ЗАГРУЗКИ ФОТО С ПРЕВЬЮ ---
const FileUploadItem = ({ label, fieldName, file, onChange }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const containerStyle = {
    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0', height: '140px', marginBottom: '16px', borderRadius: '16px',
    border: file ? `2px solid ${colors.primary}` : `2px dashed ${colors.border}`,
    backgroundColor: file ? '#fff' : colors.bgInput, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease'
  };

  return (
    <div>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.textMain }}>
        {label} <span style={{color: colors.error}}>*</span>
      </div>
      <input type="file" accept="image/*" id={fieldName} style={{ display: 'none' }} onChange={(e) => onChange(e, fieldName)} />
      <label htmlFor={fieldName} style={containerStyle}>
        {file && previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', background:'#fff', borderRadius:'50%' }}><CheckCircleIcon /></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '12px', padding: '6px', textAlign: 'center' }}>
              Натисніть щоб змінити
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: colors.textSec }}>
            <div style={{ marginBottom: '5px' }}><CameraIcon /></div>
            <div style={{ fontSize: '13px' }}>Додати фото</div>
          </div>
        )}
      </label>
    </div>
  );
};

// --- ОБЕРТКА ШАГА С КНОПКАМИ ---
const Layout = ({ title, subtitle, btnText, onNext, children, showBack = true, onBack, loading, error, btnDisabled = false }) => (
  <div style={pageStyle}>
    {showBack && onBack && (
      <div onClick={onBack} style={backBtnStyle}>
        <ChevronLeftIcon />
      </div>
    )}
    <h2 style={headerStyle}>{title}</h2>
    {subtitle && <div style={subHeaderStyle}>{subtitle}</div>}
    
    <div style={{ marginBottom: '40px' }}>
      {children}
    </div>

    {error && <div style={errorStyle}>⚠️ {error}</div>}

    <button onClick={onNext} disabled={loading || btnDisabled} style={{ ...fixedBottomBtnStyle, opacity: (loading || btnDisabled) ? 0.6 : 1 }}>
      {loading ? 'Обробка...' : btnText}
    </button>
  </div>
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const AddCarPage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cities, setCities] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const [formData, setFormData] = useState({
    city: 'Київ',
    brandId: '',
    brand: '',
    modelId: '',
    model: '',
    color: '',
    year: '',
    plate_number: '',
    vin: '',
    carType: 'Седан'
  });

  const [files, setFiles] = useState({
    tech_passport_front: null,
    tech_passport_back: null,
    insurance_photo: null,
    photo_front: null,
    photo_back: null,
    photo_left: null,
    photo_right: null,
    photo_seats_front: null,
    photo_seats_back: null,
    photo_trunk: null
  });

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

  const colorsList = ['Чорний', 'Білий', 'Сірий', 'Сріблястий', 'Синій', 'Червоний', 'Зелений', 'Коричневий', 'Жовтий', 'Інший'];
  const carTypesList = ['Седан', 'Хетчбек', 'Універсал', 'Кросовер / Позашляховик', 'Мінівен', 'Купе'];
  useEffect(() => {
  // 1. Сохраняем токен из URL в localStorage для Axios (api.js)
  if (token) {
    localStorage.setItem('token', token);
  }

  // 2. Загружаем справочники
  getCities().then(res => setCities(res)).catch(err => console.error("City error:", err));
  getCarBrands().then(res => setBrands(res)).catch(err => console.error("Brand error:", err));
}, [token]);

  useEffect(() => {
    getCities().then(res => setCities(res)).catch(() => {});
    getCarBrands().then(res => setBrands(res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (formData.brandId) {
      getCarModels(formData.brandId)
        .then(res => setModels(res))
        .catch(() => setModels([]));
    } else {
      setModels([]);
    }
  }, [formData.brandId]);

  useEffect(() => {
    if (formData.city && formData.modelId && formData.year) {
      setEvaluating(true);
      evaluateCarTariffs(formData.city, formData.modelId, formData.year)
        .then(res => {
          setEvaluationResult(res);
          setError('');
        })
        .catch(err => {
          setEvaluationResult(null);
          setError(err.response?.data?.message || 'Помилка оцінки авто');
        })
        .finally(() => setEvaluating(false));
    } else {
      setEvaluationResult(null);
    }
  }, [formData.city, formData.modelId, formData.year]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'brandId') {
      const selectedBrand = brands.find(b => b.id === Number(value));
      setFormData(prev => ({
        ...prev,
        brandId: value,
        brand: selectedBrand ? selectedBrand.name : '',
        modelId: '',
        model: '',
        year: ''
      }));
      setEvaluationResult(null);
    } else if (name === 'modelId') {
      const selectedModel = models.find(m => m.id === Number(value));
      setFormData(prev => ({
        ...prev,
        modelId: value,
        model: selectedModel ? selectedModel.name : '',
        year: ''
      }));
      setEvaluationResult(null);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e, fieldName) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [fieldName]: e.target.files[0] }));
      setError('');
    }
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleCarSubmit = () => {
    if (!formData.brand) return setError("Оберіть марку авто");
    if (!formData.model) return setError("Оберіть модель авто");
    if (!formData.year) return setError("Оберіть рік випуску");
    if (!evaluationResult || !evaluationResult.isAllowed) {
      return setError("На жаль, це авто недопущене до роботи в системі");
    }
    if (!formData.color) return setError("Оберіть колір");
    if (!formData.plate_number || formData.plate_number.length < 3) return setError("Введіть коректний держ. номер");
    
    setError('');
    setStep(1);
    window.scrollTo(0, 0);
  };

  const handleDocsSubmit = () => {
    if (!files.tech_passport_front) return setError("Завантажте тех. паспорт (Лицьова)");
    if (!files.tech_passport_back) return setError("Завантажте тех. паспорт (Зворот)");
    if (!files.insurance_photo) return setError("Завантажте фото страховки");
    
    setError('');
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleExteriorSubmit = () => {
    if (!files.photo_front) return setError("Завантажте фото авто спереду");
    if (!files.photo_back) return setError("Завантажте фото авто ззаду");
    if (!files.photo_left) return setError("Завантажте фото авто зліва");
    if (!files.photo_right) return setError("Завантажте фото авто справа");
    
    setError('');
    setStep(3);
    window.scrollTo(0, 0);
  };

  const handleInteriorSubmit = () => {
    if (!files.photo_seats_front) return setError("Завантажте фото салону спереду");
    if (!files.photo_seats_back) return setError("Завантажте фото салону ззаду");
    
    setError('');
    setStep(4);
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async () => {
    if (!token) {
      setError('Помилка авторизації: токен відсутній. Перевідкрийте форму з додатка.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const bodyData = new FormData();
      const jsonPayload = {
        make: formData.brand,
        model: formData.model,
        color: formData.color,
        year: parseInt(formData.year),
        plate_number: formData.plate_number,
        vin: formData.vin,
        carType: formData.carType
      };

      bodyData.append('data', JSON.stringify(jsonPayload));

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
        setStep(5);
        window.scrollTo(0, 0);
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
        setError('Помилка з\'єднання з сервером. Перевірте розмір фото або інтернет.');
      } else {
        setError(err.message || 'Помилка відправки. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- РЕНДЕР ШАГОВ ---

  if (step === 0) return (
    <Layout 
      title="Заявка на нове авто" 
      subtitle="Характеристики автомобіля за класифікатором" 
      btnText="Далі" 
      onNext={handleCarSubmit}
      showBack={false} 
      loading={loading} 
      error={error}
      btnDisabled={evaluationResult && !evaluationResult.isAllowed}
    >
      <SearchableSelect
        label="Місто роботи *"
        name="city"
        value={formData.city}
        options={cities}
        onChange={handleChange}
        placeholder="Оберіть місто..."
      />

      <SearchableSelect
        label="Марка авто *"
        name="brandId"
        value={formData.brandId}
        options={brands}
        onChange={handleChange}
        placeholder="Оберіть або введіть марку..."
      />

      <SearchableSelect
        label="Модель авто *"
        name="modelId"
        value={formData.modelId}
        options={models}
        onChange={handleChange}
        placeholder={formData.brandId ? "Оберіть або введіть модель..." : "Спочатку оберіть марку"}
        disabled={!formData.brandId}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Рік випуску *</label>
          <select name="year" value={formData.year} onChange={handleChange} style={selectStyle} disabled={!formData.modelId}>
            <option value="">{formData.modelId ? "Оберіть..." : "Модель?"}</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Колір *</label>
          <select name="color" value={formData.color} onChange={handleChange} style={selectStyle}>
            <option value="">Оберіть...</option>
            {colorsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {evaluating && (
        <div style={{ padding: '12px', textAlign: 'center', color: colors.textSec, fontSize: '14px' }}>
          Перевіряємо допуск авто за класифікатором...
        </div>
      )}

      {evaluationResult && (
        <div style={{ 
          padding: '16px', 
          borderRadius: '16px', 
          backgroundColor: evaluationResult.isAllowed ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${evaluationResult.isAllowed ? '#BBF7D0' : '#FECACA'}`,
          margin: '15px 0'
        }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: evaluationResult.isAllowed ? '#166534' : '#991B1B', marginBottom: '8px' }}>
            {evaluationResult.isAllowed ? 'Доступні тарифи для вашого авто:' : 'Авто не проходить за вимогами:'}
          </div>
          {evaluationResult.isAllowed ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {evaluationResult.allowedTariffs.map(tariff => (
                <span key={tariff} style={{ 
                  backgroundColor: colors.primary, color: '#fff', 
                  padding: '6px 12px', borderRadius: '20px', 
                  fontSize: '13px', fontWeight: '700' 
                }}>
                  {tariff === 'STANDARD' ? 'Стандарт' : tariff === 'COMFORT' ? 'Комфорт' : 'Бізнес'}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#991B1B' }}>
              Дане авто ({formData.brand} {formData.model} {formData.year} р.) недопущене до перевезень у м. {formData.city}.
            </div>
          )}
        </div>
      )}

      <div style={inputGroupStyle}>
        <label style={labelStyle}>Держ. номер *</label>
        <input 
          name="plate_number" 
          placeholder="AA1234AA" 
          value={formData.plate_number} 
          onChange={handleChange} 
          style={{ ...inputBaseStyle, textTransform: 'uppercase' }} 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>VIN код (необов'язково)</label>
        <input 
          name="vin" 
          placeholder="17 символів" 
          value={formData.vin} 
          onChange={handleChange} 
          style={inputBaseStyle} 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>Тип кузова *</label>
        <select name="carType" value={formData.carType} onChange={handleChange} style={selectStyle}>
          {carTypesList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </Layout>
  );

  if (step === 1) return (
    <Layout title="Документи на авто" subtitle="Завантажте якісні фото оригіналів" btnText="Далі" onNext={handleDocsSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
      <FileUploadItem label="Тех. паспорт (Лицьова сторона)" fieldName="tech_passport_front" file={files.tech_passport_front} onChange={handleFileChange} />
      <FileUploadItem label="Тех. паспорт (Зворотна сторона)" fieldName="tech_passport_back" file={files.tech_passport_back} onChange={handleFileChange} />
      <FileUploadItem label="Страховий поліс" fieldName="insurance_photo" file={files.insurance_photo} onChange={handleFileChange} />
    </Layout>
  );

  if (step === 2) return (
    <Layout title="Зовнішній вигляд" subtitle="Фото авто з чотирьох сторін (чисте авто)" btnText="Далі" onNext={handleExteriorSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
      <FileUploadItem label="Спереду (видно номер)" fieldName="photo_front" file={files.photo_front} onChange={handleFileChange} />
      <FileUploadItem label="Ззаду (видно номер)" fieldName="photo_back" file={files.photo_back} onChange={handleFileChange} />
      <FileUploadItem label="Лівий бік" fieldName="photo_left" file={files.photo_left} onChange={handleFileChange} />
      <FileUploadItem label="Правий бік" fieldName="photo_right" file={files.photo_right} onChange={handleFileChange} />
    </Layout>
  );

  if (step === 3) return (
    <Layout title="Салон та багажник" subtitle="Покажіть стан сидінь та багажне відділення" btnText="Далі" onNext={handleInteriorSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
      <FileUploadItem label="Передній ряд сидінь" fieldName="photo_seats_front" file={files.photo_seats_front} onChange={handleFileChange} />
      <FileUploadItem label="Задній ряд сидінь" fieldName="photo_seats_back" file={files.photo_seats_back} onChange={handleFileChange} />
      <FileUploadItem label="Багажник (необов'язково)" fieldName="photo_trunk" file={files.photo_trunk} onChange={handleFileChange} />
    </Layout>
  );

  if (step === 4) return (
    <Layout title="Підсумкова перевірка" subtitle="Перевірте правильність даних авто" btnText="✅ Відправити заявку" onNext={handleFinalSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` }}>
        <h4 style={{ margin: '0 0 10px 0', color: colors.primary }}>🚘 Нове авто</h4>
        <div style={{ marginBottom: '5px', fontSize:'16px' }}><b>{formData.brand} {formData.model}</b> ({formData.year})</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ backgroundColor: '#F1F5F9', padding: '6px 10px', borderRadius: '8px', fontSize: '14px', fontWeight:'bold', border:'1px solid #E2E8F0' }}>{formData.plate_number}</span>
          <span style={{ color: colors.textSec }}>{formData.color} • {formData.carType}</span>
        </div>

        {evaluationResult && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontSize: '12px', color: colors.textSec, marginBottom: '4px' }}>Розраховані тарифи:</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {evaluationResult.allowedTariffs.map(t => (
                <span key={t} style={{ backgroundColor: '#CCFBF1', color: '#0F766E', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                  {t === 'STANDARD' ? 'Стандарт' : t === 'COMFORT' ? 'Комфорт' : 'Бізнес'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: colors.textMain, fontWeight: '500' }}>
        <span style={{marginRight:'5px'}}>📷</span> 
        Завантажено фото: <span style={{color: colors.primary, fontWeight:'bold'}}>{Object.values(files).filter(f => f !== null).length} з 10</span>
      </div>
    </Layout>
  );

  if (step === 5) return (
  <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: '0' }}>
    <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
    <h2 style={{ color: colors.textMain, marginBottom: '10px' }}>Заявку прийнято!</h2>
    <p style={{ textAlign: 'center', lineHeight: '1.6', color: colors.textSec, maxWidth: '90%' }}>
      Дякуємо! Ваша заявка на додавання авто <b>{formData.brand} {formData.model}</b> отримана.<br />
      Диспетчер перевірить фото та документи найближчим часом.
    </p>
    
    {/* 🛠️ ИСПРАВЛЕНИЕ: Перенаправляем на /add-car-success, чтобы WebViewActivity.kt поймал "success" и закрыл экран */}
    <button 
      onClick={() => window.location.href = '/add-car-success'} 
      style={{ ...fixedBottomBtnStyle, position: 'relative', marginTop: '40px', borderRadius: '16px', width: '100%' }}
    >
      Закрити
    </button>
  </div>
);

  return <div>Помилка завантаження</div>;
};

export default AddCarPage;
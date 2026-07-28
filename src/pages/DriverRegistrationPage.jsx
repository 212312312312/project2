import React, { useState, useEffect, useRef } from 'react';
import { requestDriverSms, verifyDriverSms, registerDriver } from '../services/authService';
import { getCities, getCarBrands, getCarModels, evaluateCarTariffs } from '../services/publicService';

// --- СТИЛІ ---

const colors = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    textMain: '#1E293B',
    textSec: '#64748B',
    primary: '#14B8A6', // Бірюзовий
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

const sectionTitleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: colors.textMain,
    marginTop: '25px',
    marginBottom: '15px'
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

// --- КОМПОНЕНТИ ---

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

// --- РОЗУМНИЙ ВИПАДАЮЧИЙ СПИСОК З ПОШУКОМ ---
const SearchableSelect = ({ label, name, value, options, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // Знаходимо обраний елемент
    const selectedOption = options.find(opt => 
        typeof opt === 'object' ? String(opt.id || opt.name) === String(value) : String(opt) === String(value)
    );

    const displayLabel = selectedOption 
        ? (typeof selectedOption === 'object' ? selectedOption.name : selectedOption)
        : '';

    // Закриття випадашки при кліку поза її межами
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

    // Фільтрація варантів за пошуковим словом
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

const PhoneInput = ({ value, onChange }) => {
    const formatForDisplay = (str) => {
        if (!str) return '';
        let formatted = str;
        if (str.length > 3) formatted = str.slice(0, 3) + ' ' + str.slice(3);
        if (str.length > 5) formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
        if (str.length > 7) formatted = formatted.slice(0, 9) + ' ' + formatted.slice(9);
        return formatted;
    };

    const displayValue = formatForDisplay(value);
    const maskTemplate = "XXX XX XX XXX";
    const remainingMask = maskTemplate.slice(displayValue.length);

    const handleLocalChange = (e) => {
        let digits = e.target.value.replace(/\D/g, '');
        if (digits.length > 10) digits = digits.slice(0, 10);
        onChange({ target: { name: 'phoneNumber', value: digits } });
    };

    const phoneInputStyle = {
        ...inputBaseStyle,
        padding: '22px', 
        fontSize: '20px',
        fontFamily: 'monospace'
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ 
                ...phoneInputStyle, 
                position: 'absolute', top: 0, left: 0, 
                borderColor: 'transparent', pointerEvents: 'none', zIndex: 1
            }}>
                <span style={{ color: colors.textMain }}>{displayValue}</span>
                <span style={{ color: '#CBD5E1' }}>{remainingMask}</span>
            </div>
            <input 
                type="tel"
                value={displayValue} 
                onChange={handleLocalChange}
                style={{ 
                    ...phoneInputStyle, 
                    position: 'relative', zIndex: 2, 
                    backgroundColor: 'transparent', color: 'transparent', 
                    caretColor: colors.textMain
                }}
            />
        </div>
    );
};

const SmsInput = ({ value, onChange }) => (
    <div style={{ position: 'relative', width: '100%', height: '60px', marginTop: '20px' }}>
        <input
            name="smsCode"
            type="tel"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={value}
            onChange={onChange}
            maxLength={6}
            style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, zIndex: 10, cursor: 'text'
            }}
            autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = value[index] || '';
                const isActive = index === value.length;
                const isFilled = index < value.length;
                return (
                    <div key={index} style={{
                        width: '14%', height: '100%', borderRadius: '12px',
                        backgroundColor: colors.card,
                        border: isActive ? `2px solid ${colors.primary}` : `1px solid ${isFilled ? colors.primary : colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', fontWeight: 'bold', color: colors.textMain,
                        boxShadow: isActive ? `0 0 0 4px ${colors.primaryLight}` : 'none',
                        transition: 'all 0.2s ease'
                    }}>
                        {digit}
                    </div>
                );
            })}
        </div>
    </div>
);

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

const DriverRegistrationPage = () => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [cities, setCities] = useState([]);
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [evaluating, setEvaluating] = useState(false);

    const [formData, setFormData] = useState({
        phoneNumber: '',
        smsCode: '',
        password: '',
        lastName: '',
        firstName: '',
        middleName: '',
        email: '',
        rnokpp: '',
        driverLicense: '',
        city: 'Київ',
        brandId: '',
        make: '',
        modelId: '',
        model: '',
        year: '',
        color: '',
        plateNumber: '',
        carType: 'Седан'
    });

    const [files, setFiles] = useState({
        avatar: null,
        driverLicenseFront: null,
        driverLicenseBack: null,
        techPassportFront: null,
        techPassportBack: null,
        insurance: null,
        carFront: null,
        carBack: null,
        carLeft: null,
        carRight: null,
        carInteriorFront: null,
        carInteriorBack: null
    });

    const currentYear = new Date().getFullYear();
    const availableYears = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

    const colorsList = ['Чорний', 'Білий', 'Сірий', 'Сріблястий', 'Синій', 'Червоний', 'Зелений', 'Коричневий', 'Жовтий', 'Інший'];
    const carTypesList = ['Седан', 'Хетчбек', 'Універсал', 'Кросовер / Позашляховик', 'Мінівен', 'Купе'];

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
        
        if (name === 'smsCode') {
            const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 6);
            setFormData(prev => ({ ...prev, [name]: cleanValue }));
        } else if (name === 'brandId') {
            const selectedBrand = brands.find(b => b.id === Number(value));
            setFormData(prev => ({
                ...prev,
                brandId: value,
                make: selectedBrand ? selectedBrand.name : '',
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

    const handlePhoneSubmit = async () => {
        if (formData.phoneNumber.length < 10) return setError("Введіть коректний номер (10 цифр)");
        setLoading(true); setError('');
        try {
            await requestDriverSms(formData.phoneNumber);
            setStep(1);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleSmsSubmit = async () => {
        if (formData.smsCode.length < 6) return setError("Введіть повний 6-значний код");
        setLoading(true); setError('');
        try {
            await verifyDriverSms(formData.phoneNumber, formData.smsCode);
            setStep(2);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const nextStep = () => {
        setError('');
        setStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handlePersonalSubmit = () => {
        if (!formData.lastName) return setError("Введіть Прізвище");
        if (!formData.firstName) return setError("Введіть Ім'я");
        if (!formData.city) return setError("Оберіть місто роботи");

        const pwd = formData.password;
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const isEnglish = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(pwd);

        if (!pwd || pwd.length < 6) return setError("Пароль: мінімум 6 символів");
        if (!isEnglish) return setError("Пароль: тільки англійські літери та цифри");
        if (!hasUpperCase) return setError("Пароль: має бути хоча б 1 велика літера (A-Z)");
        if (!hasNumber) return setError("Пароль: має бути хоча б 1 цифра");

        if (!formData.email || !formData.email.includes('@')) return setError("Введіть коректний Email");
        if (!formData.rnokpp || formData.rnokpp.length < 8) return setError("Введіть коректний РНОКПП (ІПН)");
        if (!formData.driverLicense) return setError("Введіть номер посвідчення водія");
        
        nextStep();
    };

    const handleCarSubmit = () => {
        if (!formData.make) return setError("Оберіть марку авто");
        if (!formData.model) return setError("Оберіть модель авто");
        if (!formData.year) return setError("Оберіть рік випуску");
        if (!evaluationResult || !evaluationResult.isAllowed) {
            return setError("На жаль, дане авто не допущене до роботи в системі");
        }
        if (!formData.color) return setError("Оберіть колір");
        if (!formData.plateNumber || formData.plateNumber.length < 3) return setError("Введіть коректний держ. номер");
        
        nextStep();
    };

    const handleDocsSubmit = () => {
        if (!files.avatar) return setError("Завантажте ваше фото (селфі)");
        if (!files.driverLicenseFront) return setError("Завантажте права (Лицьова)");
        if (!files.driverLicenseBack) return setError("Завантажте права (Зворот)");
        if (!files.techPassportFront) return setError("Завантажте тех. паспорт (Лицьова)");
        if (!files.techPassportBack) return setError("Завантажте тех. паспорт (Зворот)");
        if (!files.insurance) return setError("Завантажте фото страховки");
        nextStep();
    };

    const handleExteriorSubmit = () => {
        if (!files.carFront) return setError("Завантажте фото авто спереду");
        if (!files.carBack) return setError("Завантажте фото авто ззаду");
        if (!files.carLeft) return setError("Завантажте фото авто зліва");
        if (!files.carRight) return setError("Завантажте фото авто справа");
        nextStep();
    };

    const handleInteriorSubmit = () => {
        if (!files.carInteriorFront) return setError("Завантажте фото салону спереду");
        if (!files.carInteriorBack) return setError("Завантажте фото салону ззаду");
        nextStep();
    };

    const handleFinalSubmit = async () => {
        setLoading(true); setError('');
        try {
            const fullName = `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim();
            const payload = {
                phoneNumber: formData.phoneNumber,
                smsCode: formData.smsCode,
                password: formData.password,
                fullName: fullName,
                email: formData.email,
                rnokpp: formData.rnokpp,
                driverLicense: formData.driverLicense,
                city: formData.city,
                make: formData.make,
                model: formData.model,
                color: formData.color,
                plateNumber: formData.plateNumber,
                year: parseInt(formData.year),
                carType: formData.carType
            };

            await registerDriver(payload, files);
            setStep(8);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---

    if (step === 0) return (
        <Layout title="Реєстрація" subtitle="Введіть номер телефону для початку роботи" btnText="Далі" onNext={handlePhoneSubmit} showBack={false} loading={loading} error={error}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Номер телефону</label>
                <PhoneInput value={formData.phoneNumber} onChange={handleChange} />
            </div>
        </Layout>
    );

    if (step === 1) return (
        <Layout title="Код підтвердження" subtitle={`Введіть 6 цифр з SMS, відправлених на ${formData.phoneNumber}`} btnText="Підтвердити" onNext={handleSmsSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
            <SmsInput value={formData.smsCode} onChange={handleChange} />
        </Layout>
    );

    if (step === 2) return (
        <Layout title="Особисті дані" subtitle="Заповніть всі поля уважно" btnText="Далі" onNext={handlePersonalSubmit} showBack={false} loading={loading} error={error}>
            {/* МІСТО РОБОТИ З ПОШУКОМ */}
            <SearchableSelect
    label="Місто роботи *"
    name="city"
    value={formData.city}
    options={cities}
    onChange={handleChange}
    placeholder="Оберіть місто..."
    valueKey="name"
/>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>Прізвище *</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Ім'я *</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>По батькові</label>
                <input name="middleName" value={formData.middleName} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Пароль (Англ, 1 велика, 1 цифра) *</label>
                <input name="password" type="password" placeholder="Мін. 6 символів" value={formData.password} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Email *</label>
                <input name="email" type="email" placeholder="mail@example.com" value={formData.email} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>РНОКПП (ІПН) *</label>
                <input name="rnokpp" placeholder="XXXXXXXXXX" value={formData.rnokpp} onChange={handleChange} style={inputBaseStyle} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Номер посвідчення водія *</label>
                <input name="driverLicense" placeholder="ABC 123456" value={formData.driverLicense} onChange={handleChange} style={inputBaseStyle} />
            </div>
        </Layout>
    );

    if (step === 3) return (
        <Layout 
            title="Ваше Авто" 
            subtitle="Дані транспортного засобу" 
            btnText="Далі" 
            onNext={handleCarSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
            btnDisabled={evaluationResult && !evaluationResult.isAllowed}
        >
            {/* МАРКА АВТО З ПОШУКОМ */}
            <SearchableSelect
                label="Марка авто *"
                name="brandId"
                value={formData.brandId}
                options={brands}
                onChange={handleChange}
                placeholder="Оберіть або введіть марку..."
            />

            {/* МОДЕЛЬ АВТО З ПОШУКОМ */}
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
                <div style={{ ...inputGroupStyle, flex: 1 }}>
                    <label style={labelStyle}>Рік випуску *</label>
                    <select name="year" value={formData.year} onChange={handleChange} style={selectStyle} disabled={!formData.modelId}>
                        <option value="">{formData.modelId ? "Оберіть..." : "Модель?"}</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div style={{ ...inputGroupStyle, flex: 1 }}>
                    <label style={labelStyle}>Колір *</label>
                    <select name="color" value={formData.color} onChange={handleChange} style={selectStyle}>
                        <option value="">Оберіть...</option>
                        {colorsList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* ІНДИКАТОР ОЦІНКИ ТАРИФІВ */}
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
                    marginBottom: '20px'
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
                            Дане авто ({formData.make} {formData.model} {formData.year} р.) недопущене до пасажирських перевезення у м. {formData.city}.
                        </div>
                    )}
                </div>
            )}

            <div style={inputGroupStyle}>
                <label style={labelStyle}>Держ. номер *</label>
                <input 
                    name="plateNumber" 
                    placeholder="AA1234AA" 
                    value={formData.plateNumber} 
                    onChange={handleChange} 
                    style={{...inputBaseStyle, textTransform: 'uppercase'}} 
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

    if (step === 4) return (
        <Layout title="Фото документів" subtitle="Завантажте якісні фото оригіналів" btnText="Далі" onNext={handleDocsSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
            <div style={sectionTitleStyle}>Водій</div>
            <FileUploadItem label="Ваше фото (Селфі)" fieldName="avatar" file={files.avatar} onChange={handleFileChange} />
            <FileUploadItem label="Права (Лицьова сторона)" fieldName="driverLicenseFront" file={files.driverLicenseFront} onChange={handleFileChange} />
            <FileUploadItem label="Права (Зворотна сторона)" fieldName="driverLicenseBack" file={files.driverLicenseBack} onChange={handleFileChange} />

            <div style={sectionTitleStyle}>Автомобіль</div>
            <FileUploadItem label="Тех. паспорт (Лицьова)" fieldName="techPassportFront" file={files.techPassportFront} onChange={handleFileChange} />
            <FileUploadItem label="Тех. паспорт (Зворот)" fieldName="techPassportBack" file={files.techPassportBack} onChange={handleFileChange} />
            <FileUploadItem label="Страховий поліс" fieldName="insurance" file={files.insurance} onChange={handleFileChange} />
        </Layout>
    );

    if (step === 5) return (
        <Layout title="Зовнішній вигляд" subtitle="Фото авто з чотирьох сторін (чисте авто)" btnText="Далі" onNext={handleExteriorSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
            <FileUploadItem label="Спереду (видно номер)" fieldName="carFront" file={files.carFront} onChange={handleFileChange} />
            <FileUploadItem label="Ззаду (видно номер)" fieldName="carBack" file={files.carBack} onChange={handleFileChange} />
            <FileUploadItem label="Лівий бік" fieldName="carLeft" file={files.carLeft} onChange={handleFileChange} />
            <FileUploadItem label="Правий бік" fieldName="carRight" file={files.carRight} onChange={handleFileChange} />
        </Layout>
    );

    if (step === 6) return (
        <Layout title="Салон автомобіля" subtitle="Покажіть стан сидінь та чистоту" btnText="Далі" onNext={handleInteriorSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
            <FileUploadItem label="Передній ряд сидінь" fieldName="carInteriorFront" file={files.carInteriorFront} onChange={handleFileChange} />
            <FileUploadItem label="Задній ряд сидінь" fieldName="carInteriorBack" file={files.carInteriorBack} onChange={handleFileChange} />
        </Layout>
    );

    if (step === 7) return (
        <Layout title="Підсумкова перевірка" subtitle="Впевніться, що дані вірні" btnText="✅ Відправити заявку" onNext={handleFinalSubmit} showBack={true} onBack={handleBack} loading={loading} error={error}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` }}>
                <h4 style={{ margin: '0 0 10px 0', color: colors.primary }}>👤 Водій</h4>
                <div style={{ marginBottom: '5px', fontSize:'16px' }}><b>{formData.lastName} {formData.firstName}</b></div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>{formData.phoneNumber}</div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>Місто: <b>{formData.city}</b></div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>{formData.email}</div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>ІПН: {formData.rnokpp}</div>
                
                <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '15px 0' }} />
                
                <h4 style={{ margin: '0 0 10px 0', color: colors.primary }}>🚘 Автомобіль</h4>
                <div style={{ marginBottom: '5px', fontSize:'16px' }}><b>{formData.make} {formData.model}</b> ({formData.year})</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '6px 10px', borderRadius: '8px', fontSize: '14px', fontWeight:'bold', border:'1px solid #E2E8F0' }}>{formData.plateNumber}</span>
                    <span style={{ color: colors.textSec }}>{formData.color}</span>
                </div>

                {evaluationResult && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: colors.textSec, marginBottom: '4px' }}>Дозволені тарифи:</div>
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
                Завантажено фото: <span style={{color: colors.primary, fontWeight:'bold'}}>{Object.values(files).filter(f => f !== null).length} з 12</span>
            </div>
        </Layout>
    );

    if (step === 8) return (
        <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: '0' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: colors.textMain, marginBottom: '10px' }}>Заявку прийнято!</h2>
            <p style={{ textAlign: 'center', lineHeight: '1.6', color: colors.textSec, maxWidth: '90%' }}>
                Дякуємо, {formData.firstName}!<br />
                Ми вже почали перевірку ваших документів.<br />
                Чекайте на SMS з підтвердженням активації.
            </p>
            <button onClick={() => window.location.href = '/registration-success'} style={{ ...fixedBottomBtnStyle, position: 'relative', marginTop: '40px', borderRadius: '16px', width: '100%' }}>
                Зрозуміло
            </button>
        </div>
    );

    return <div>Помилка завантаження</div>;
};

export default DriverRegistrationPage;
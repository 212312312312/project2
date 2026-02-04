import React, { useState, useEffect } from 'react';
import { requestDriverSms, verifyDriverSms, registerDriver } from '../services/authService';
import { getCarOptions } from '../services/publicService';

// --- СТИЛИ ---

const colors = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    textMain: '#1E293B',
    textSec: '#64748B',
    primary: '#14B8A6', // Бирюзовый
    primaryLight: '#CCFBF1',
    border: '#E2E8F0',
    error: '#EF4444',
    bgInput: '#F1F5F9'
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

// Базовый стиль инпута
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
    WebkitTapHighlightColor: 'transparent' // <--- ДОБАВИТЬ СЮДА
};

// Стиль для выпадающего списка (кастомная стрелка)
const selectStyle = {
    ...inputBaseStyle,
    appearance: 'none', // Убираем стандартную стрелку браузера
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: '40px' // Отступ, чтобы текст не наезжал на стрелку
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
    WebkitTapHighlightColor: 'transparent' // <--- И СЮДА
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
    WebkitTapHighlightColor: 'transparent' // <--- И СЮДА
};

// --- КОМПОНЕНТЫ ---

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

// Компонент ввода телефона (Только цифры, формат 0XX XXX XX XX)
const PhoneInput = ({ value, onChange }) => {
    // value хранит чистые цифры, например "0971234567"
    
    // Форматирование: XXX XX XX XXX
    const formatForDisplay = (str) => {
        if (!str) return '';
        let formatted = str;
        // Добавляем пробелы после 3-й, 5-й и 7-й цифры
        if (str.length > 3) formatted = str.slice(0, 3) + ' ' + str.slice(3);
        if (str.length > 5) formatted = formatted.slice(0, 6) + ' ' + formatted.slice(6);
        if (str.length > 7) formatted = formatted.slice(0, 9) + ' ' + formatted.slice(9);
        return formatted;
    };

    const displayValue = formatForDisplay(value);

    // Маска XXX XX XX XXX (всего 10 цифр + 3 пробела = 13 символов)
    const maskTemplate = "XXX XX XX XXX";
    const remainingMask = maskTemplate.slice(displayValue.length);

    const handleLocalChange = (e) => {
        // Оставляем только цифры
        let digits = e.target.value.replace(/\D/g, '');
        
        // Лимит 10 цифр
        if (digits.length > 10) digits = digits.slice(0, 10);

        onChange({
            target: {
                name: 'phoneNumber',
                value: digits 
            }
        });
    };

    // Обновленные, увеличенные стили
    const phoneInputStyle = {
        ...inputBaseStyle,
        padding: '22px', 
        fontSize: '20px',
        fontFamily: 'monospace'
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* ФОНОВАЯ МАСКА */}
            <div style={{ 
                ...phoneInputStyle, 
                position: 'absolute', 
                top: 0, left: 0, 
                borderColor: 'transparent', 
                pointerEvents: 'none', 
                zIndex: 1
            }}>
                <span style={{ color: colors.textMain }}>{displayValue}</span>
                <span style={{ color: '#CBD5E1' }}>{remainingMask}</span>
            </div>

            {/* РЕАЛЬНЫЙ INPUT */}
            <input 
                type="tel"
                value={displayValue} 
                onChange={handleLocalChange}
                style={{ 
                    ...phoneInputStyle, 
                    position: 'relative', 
                    zIndex: 2, 
                    backgroundColor: 'transparent', 
                    color: 'transparent', 
                    caretColor: colors.textMain,
                }}
            />
        </div>
    );
};

// Компонент ввода SMS (6 ячеек)
const SmsInput = ({ value, onChange }) => {
    return (
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
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
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
                            width: '14%',
                            height: '100%',
                            borderRadius: '12px',
                            backgroundColor: colors.card,
                            border: isActive ? `2px solid ${colors.primary}` : `1px solid ${isFilled ? colors.primary : colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: colors.textMain,
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
};

// Компонент загрузки файла с ПРЕВЬЮ
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
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        height: '140px',
        marginBottom: '16px',
        borderRadius: '16px',
        border: file ? `2px solid ${colors.primary}` : `2px dashed ${colors.border}`,
        backgroundColor: file ? '#fff' : colors.bgInput,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    };

    return (
        <div>
            <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.textMain }}>
                {label} <span style={{color: colors.error}}>*</span>
            </div>
            <input
                type="file"
                accept="image/*"
                id={fieldName}
                style={{ display: 'none' }}
                onChange={(e) => onChange(e, fieldName)}
            />
            <label htmlFor={fieldName} style={containerStyle}>
                {file && previewUrl ? (
                    <>
                        <img 
                            src={previewUrl} 
                            alt="Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} 
                        />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background:'#fff', borderRadius:'50%' }}>
                            <CheckCircleIcon />
                        </div>
                        <div style={{ 
                            position: 'absolute', 
                            bottom: 0, left: 0, right: 0, 
                            background: 'rgba(0,0,0,0.5)', 
                            color: '#fff', 
                            fontSize: '12px', 
                            padding: '6px', 
                            textAlign: 'center' 
                        }}>
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

// Обертка Layout
const Layout = ({ title, subtitle, btnText, onNext, children, showBack = true, onBack, loading, error }) => (
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

        <button onClick={onNext} disabled={loading} style={fixedBottomBtnStyle}>
            {loading ? 'Обробка...' : btnText}
        </button>
    </div>
);

const DriverRegistrationPage = () => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [carOptions, setCarOptions] = useState({ makes: [], colors: [], types: [] });
    const [availableModels, setAvailableModels] = useState([]);

    const [formData, setFormData] = useState({
        phoneNumber: '', // Чистый номер без +380
        smsCode: '',
        password: '',
        lastName: '',
        firstName: '',
        middleName: '',
        email: '',
        rnokpp: '',
        driverLicense: '',
        make: '',
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

    useEffect(() => {
        getCarOptions().then(data => setCarOptions(data));
    }, []);

    useEffect(() => {
        if (formData.make) {
            const selectedMake = carOptions.makes.find(m => m.name === formData.make);
            setAvailableModels(selectedMake ? selectedMake.models : []);
        }
    }, [formData.make, carOptions]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'smsCode') {
             const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 6);
             setFormData(prev => ({ ...prev, [name]: cleanValue }));
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

    // --- ЛОГИКА ---

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
        
        // --- ВАЛИДАЦИЯ ПАРОЛЯ ---
        const pwd = formData.password;
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const isEnglish = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(pwd); // Проверка на отсутствие кириллицы

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
        if (!formData.year) return setError("Введіть рік випуску");
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
        <Layout 
            title="Реєстрація" 
            subtitle="Введіть номер телефону для початку роботи" 
            btnText="Далі"
            onNext={handlePhoneSubmit} 
            showBack={false}
            loading={loading} error={error}
        >
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Номер телефону</label>
                <PhoneInput value={formData.phoneNumber} onChange={handleChange} />
            </div>
        </Layout>
    );

    if (step === 1) return (
        <Layout 
            title="Код підтвердження" 
            subtitle={`Введіть 6 цифр з SMS, відправлених на ${formData.phoneNumber}`} 
            btnText="Підтвердити" 
            onNext={handleSmsSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
        >
            <SmsInput value={formData.smsCode} onChange={handleChange} />
        </Layout>
    );

    if (step === 2) return (
        <Layout 
            title="Особисті дані" 
            subtitle="Заповніть всі поля уважно" 
            btnText="Далі" 
            onNext={handlePersonalSubmit}
            showBack={false} // <--- БЫЛО true, СТАЛО false
            onBack={handleBack} // Можно оставить или убрать, так как showBack=false
            loading={loading} error={error}
        >
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
        >
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Марка *</label>
                <select name="make" value={formData.make} onChange={handleChange} style={selectStyle}>
                    <option value="">Оберіть...</option>
                    {carOptions.makes.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>Модель *</label>
                <select name="model" value={formData.model} onChange={handleChange} style={selectStyle} disabled={!formData.make}>
                    <option value="">Оберіть...</option>
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...inputGroupStyle, flex: 1 }}>
                    <label style={labelStyle}>Рік *</label>
                    <input name="year" type="number" placeholder="2018" value={formData.year} onChange={handleChange} style={inputBaseStyle} />
                </div>
                <div style={{ ...inputGroupStyle, flex: 1 }}>
                    <label style={labelStyle}>Колір *</label>
                    <select name="color" value={formData.color} onChange={handleChange} style={selectStyle}>
                        <option value="">Оберіть...</option>
                        {carOptions.colors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
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
                    {carOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
        </Layout>
    );

    if (step === 4) return (
        <Layout 
            title="Фото документів" 
            subtitle="Завантажте якісні фото оригіналів" 
            btnText="Далі" 
            onNext={handleDocsSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
        >
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
        <Layout 
            title="Зовнішній вигляд" 
            subtitle="Фото авто з чотирьох сторін (чисте авто)" 
            btnText="Далі" 
            onNext={handleExteriorSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
        >
            <FileUploadItem label="Спереду (видно номер)" fieldName="carFront" file={files.carFront} onChange={handleFileChange} />
            <FileUploadItem label="Ззаду (видно номер)" fieldName="carBack" file={files.carBack} onChange={handleFileChange} />
            <FileUploadItem label="Лівий бік" fieldName="carLeft" file={files.carLeft} onChange={handleFileChange} />
            <FileUploadItem label="Правий бік" fieldName="carRight" file={files.carRight} onChange={handleFileChange} />
        </Layout>
    );

    if (step === 6) return (
        <Layout 
            title="Салон автомобіля" 
            subtitle="Покажіть стан сидінь та чистоту" 
            btnText="Далі" 
            onNext={handleInteriorSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
        >
            <FileUploadItem label="Передній ряд сидінь" fieldName="carInteriorFront" file={files.carInteriorFront} onChange={handleFileChange} />
            <FileUploadItem label="Задній ряд сидінь" fieldName="carInteriorBack" file={files.carInteriorBack} onChange={handleFileChange} />
        </Layout>
    );

    if (step === 7) return (
        <Layout 
            title="Підсумкова перевірка" 
            subtitle="Впевніться, що дані вірні" 
            btnText="✅ Відправити заявку" 
            onNext={handleFinalSubmit}
            showBack={true} onBack={handleBack}
            loading={loading} error={error}
        >
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` }}>
                <h4 style={{ margin: '0 0 10px 0', color: colors.primary }}>👤 Водій</h4>
                <div style={{ marginBottom: '5px', fontSize:'16px' }}><b>{formData.lastName} {formData.firstName}</b></div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>{formData.phoneNumber}</div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>{formData.email}</div>
                <div style={{ color: colors.textSec, fontSize:'14px' }}>ІПН: {formData.rnokpp}</div>
                
                <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '15px 0' }} />
                
                <h4 style={{ margin: '0 0 10px 0', color: colors.primary }}>🚘 Автомобіль</h4>
                <div style={{ marginBottom: '5px', fontSize:'16px' }}><b>{formData.make} {formData.model}</b> ({formData.year})</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '6px 10px', borderRadius: '8px', fontSize: '14px', fontWeight:'bold', border:'1px solid #E2E8F0' }}>{formData.plateNumber}</span>
                    <span style={{ color: colors.textSec }}>{formData.color}</span>
                </div>
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
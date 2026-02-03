import React, { useState, useEffect } from 'react';
import { requestDriverSms, verifyDriverSms, registerDriver } from '../services/authService';
import { getCarOptions } from '../services/publicService';

// Стили (можно вынести в отдельный CSS файл)
const containerStyle = {
    padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif',
    backgroundColor: '#fff', minHeight: '100vh'
};
const inputStyle = {
    width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', 
    border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '16px'
};
const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#555', marginTop: '10px', display: 'block' };
const btnStyle = {
    width: '100%', padding: '15px', backgroundColor: '#2E7D32', color: '#fff', 
    border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', 
    marginTop: '20px', cursor: 'pointer'
};
const fileBoxStyle = {
    marginBottom:'15px', padding:'15px', border:'1px dashed #ccc', borderRadius:'8px', backgroundColor: '#f9f9f9'
};
const errorStyle = { color: 'red', fontSize: '14px', marginBottom: '10px' };
const stepTitleStyle = { fontSize: '22px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', color: '#333' };

const DriverRegistrationPage = () => {
    // Этапы: 0-Phone, 1-SMS, 2-Personal, 3-Car, 4-Docs, 5-Review, 6-Success
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [carOptions, setCarOptions] = useState({ makes: [], colors: [], types: [] });
    const [availableModels, setAvailableModels] = useState([]);

    // Данные формы (текстовые)
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
        make: '',
        model: '',
        year: '',
        color: '',
        plateNumber: '',
        vin: '',
        carType: 'Седан'
    });

    // Состояние для ФАЙЛОВ
    const [files, setFiles] = useState({
        avatar: null,
        driverLicenseFront: null,
        driverLicenseBack: null,
        techPassportFront: null,
        techPassportBack: null,
        insurance: null,
        carPhoto: null
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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Обработчик выбора файлов
    const handleFileChange = (e, fieldName) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [fieldName]: e.target.files[0] }));
        }
    };

    // --- ПЕРЕХОДЫ ---

    const handlePhoneSubmit = async () => {
        if (formData.phoneNumber.length < 10) return setError("Введіть коректний номер");
        setLoading(true); setError('');
        try {
            await requestDriverSms(formData.phoneNumber);
            setStep(1);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleSmsSubmit = async () => {
        if (formData.smsCode.length < 4) return setError("Введіть код з SMS");
        setLoading(true); setError('');
        try {
            await verifyDriverSms(formData.phoneNumber, formData.smsCode);
            setStep(2);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handlePersonalSubmit = () => {
        if (!formData.lastName || !formData.firstName || !formData.password) return setError("Заповніть обов'язкові поля");
        if (formData.password.length < 6) return setError("Пароль має бути не менше 6 символів");
        setError('');
        setStep(3);
    };

    const handleCarSubmit = () => {
        if (!formData.make || !formData.model || !formData.plateNumber || !formData.year) return setError("Заповніть дані авто");
        setError('');
        setStep(4);
    };

    const handleDocsSubmit = () => {
        // Можно добавить валидацию, что файлы выбраны
        // if (!files.avatar) return setError("Будь ласка, завантажте фото");
        setError('');
        setStep(5);
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
                vin: formData.vin,
                year: parseInt(formData.year),
                carType: formData.carType
            };

            // Передаем и данные, и файлы
            await registerDriver(payload, files);
            setStep(6);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- РЕНДЕР ---

    if (step === 0) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Реєстрація Водія</h2>
            <div style={{textAlign:'center', marginBottom:'20px'}}>Введіть номер телефону для початку</div>
            <label style={labelStyle}>Номер телефону</label>
            <input name="phoneNumber" type="tel" placeholder="+380..." value={formData.phoneNumber} onChange={handleChange} style={inputStyle} />
            {error && <div style={errorStyle}>{error}</div>}
            <button onClick={handlePhoneSubmit} disabled={loading} style={btnStyle}>{loading ? '...' : 'Далі'}</button>
        </div>
    );

    if (step === 1) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Підтвердження</h2>
            <div style={{textAlign:'center', marginBottom:'20px'}}>Ми відправили код на {formData.phoneNumber}</div>
            <label style={labelStyle}>Код з SMS</label>
            <input name="smsCode" type="number" placeholder="123456" value={formData.smsCode} onChange={handleChange} style={inputStyle} />
            {error && <div style={errorStyle}>{error}</div>}
            <button onClick={handleSmsSubmit} disabled={loading} style={btnStyle}>{loading ? 'Перевірка...' : 'Підтвердити'}</button>
        </div>
    );

    if (step === 2) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Особисті дані</h2>
            <label style={labelStyle}>Прізвище *</label>
            <input name="lastName" placeholder="Шевченко" value={formData.lastName} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Ім'я *</label>
            <input name="firstName" placeholder="Тарас" value={formData.firstName} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>По батькові</label>
            <input name="middleName" placeholder="Григорович" value={formData.middleName} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Email</label>
            <input name="email" type="email" placeholder="example@mail.com" value={formData.email} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>РНОКПП (ІПН)</label>
            <input name="rnokpp" placeholder="1234567890" value={formData.rnokpp} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Номер посвідчення водія</label>
            <input name="driverLicense" placeholder="ABC 123456" value={formData.driverLicense} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Пароль *</label>
            <input name="password" type="password" placeholder="Мінімум 6 символів" value={formData.password} onChange={handleChange} style={inputStyle} />
            {error && <div style={errorStyle}>{error}</div>}
            <button onClick={handlePersonalSubmit} style={btnStyle}>Далі</button>
        </div>
    );

    if (step === 3) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Дані Автомобіля</h2>
            <label style={labelStyle}>Марка *</label>
            <select name="make" value={formData.make} onChange={handleChange} style={inputStyle}>
                <option value="">Оберіть марку</option>
                {carOptions.makes.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <label style={labelStyle}>Модель *</label>
            <select name="model" value={formData.model} onChange={handleChange} style={inputStyle} disabled={!formData.make}>
                <option value="">Оберіть модель</option>
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label style={labelStyle}>Рік випуску *</label>
            <input name="year" type="number" placeholder="2018" value={formData.year} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Держ. номер *</label>
            <input name="plateNumber" placeholder="KA 1234 AB" value={formData.plateNumber} onChange={handleChange} style={inputStyle} />
            <label style={labelStyle}>Колір *</label>
            <select name="color" value={formData.color} onChange={handleChange} style={inputStyle}>
                <option value="">Оберіть колір</option>
                {carOptions.colors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={labelStyle}>Тип кузова</label>
            <select name="carType" value={formData.carType} onChange={handleChange} style={inputStyle}>
                {carOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={labelStyle}>VIN-код *</label>
            <input name="vin" placeholder="XXXXXXXXXXXXXXXXX" value={formData.vin} onChange={handleChange} style={inputStyle} />
            {error && <div style={errorStyle}>{error}</div>}
            <button onClick={handleCarSubmit} style={btnStyle}>Далі</button>
        </div>
    );

    if (step === 4) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Фото документів</h2>
            <p style={{color:'#666', fontSize:'14px', marginBottom:'20px'}}>Натисніть, щоб обрати файл (камера або галерея).</p>

            <div style={fileBoxStyle}>
                <label style={labelStyle}>📸 Ваше фото (Селфі)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} style={{marginTop:'10px'}} />
                {files.avatar && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Файл обрано: {files.avatar.name}</span>}
            </div>

            <div style={fileBoxStyle}>
                <label style={labelStyle}>📄 Посвідчення водія (Лицева)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'driverLicenseFront')} style={{marginTop:'10px'}} />
                {files.driverLicenseFront && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}
                
                <label style={{...labelStyle, marginTop:'15px'}}>📄 Посвідчення водія (Зворот)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'driverLicenseBack')} style={{marginTop:'10px'}} />
                {files.driverLicenseBack && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}
            </div>

            <div style={fileBoxStyle}>
                <label style={labelStyle}>🚗 Тех. паспорт (Лицева)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'techPassportFront')} style={{marginTop:'10px'}} />
                {files.techPassportFront && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}

                <label style={{...labelStyle, marginTop:'15px'}}>🚗 Тех. паспорт (Зворот)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'techPassportBack')} style={{marginTop:'10px'}} />
                {files.techPassportBack && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}
            </div>

            <div style={fileBoxStyle}>
                <label style={labelStyle}>📃 Автоцивілка (Страховка)</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'insurance')} style={{marginTop:'10px'}} />
                {files.insurance && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}
            </div>
            
            <div style={fileBoxStyle}>
                <label style={labelStyle}>🚘 Фото автомобіля</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'carPhoto')} style={{marginTop:'10px'}} />
                {files.carPhoto && <span style={{color:'green', display:'block', marginTop:'5px'}}>✅ Обрано</span>}
            </div>

            <button onClick={handleDocsSubmit} style={btnStyle}>Далі</button>
        </div>
    );

    if (step === 5) return (
        <div style={containerStyle}>
            <h2 style={stepTitleStyle}>Перевірка даних</h2>
            <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                <h4 style={{marginTop:0}}>👤 Водій</h4>
                <div><b>ПІБ:</b> {formData.lastName} {formData.firstName} {formData.middleName}</div>
                <div><b>Телефон:</b> {formData.phoneNumber}</div>
            </div>
            <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                <h4 style={{marginTop:0}}>🚘 Авто</h4>
                <div>{formData.make} {formData.model} ({formData.year})</div>
                <div><b>Номер:</b> {formData.plateNumber}</div>
                <div><b>Колір:</b> {formData.color}</div>
            </div>
            {error && <div style={errorStyle}>{error}</div>}
            <button onClick={handleFinalSubmit} disabled={loading} style={btnStyle}>
                {loading ? 'Відправка...' : '✅ Відправити заявку'}
            </button>
            <button onClick={() => setStep(2)} style={{...btnStyle, background:'#fff', color:'#333', border:'1px solid #ddd', marginTop:'10px'}}>
                Назад (Редагувати)
            </button>
        </div>
    );

    if (step === 6) return (
        <div style={{...containerStyle, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
            <div style={{fontSize:'60px', marginBottom:'20px'}}>🎉</div>
            <h2 style={{color: '#2E7D32'}}>Заявку прийнято!</h2>
            <p style={{textAlign:'center', lineHeight:'1.5', color:'#555'}}>
                Дякуємо, {formData.firstName}!<br/>
                Ми отримали ваші дані та фото.<br/>
                Очікуйте SMS про активацію.
            </p>
            <button onClick={() => window.location.href = '/registration-success'} style={btnStyle}>
                Зрозуміло
            </button>
        </div>
    );

    return <div>Помилка завантаження</div>;
};

export default DriverRegistrationPage;
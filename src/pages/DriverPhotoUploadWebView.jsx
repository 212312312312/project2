import React, { useState, useEffect } from 'react';
import { photoControlService } from '../services/photoControlService';

// --- ДИЗАЙН-СИСТЕМА ТА СТИЛІ З УРАХУВАННЯМ SAFE AREA (NOTCH / HOME BAR) ---
const colors = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    textMain: '#1E293B',
    textSec: '#64748B',
    primary: '#14B8A6', // Бірюзовий акцент
    primaryLight: '#CCFBF1',
    border: '#E2E8F0',
    error: '#EF4444',
    bgInput: '#F1F5F9',
    success: '#10B981',
    warning: '#F59E0B'
};

const pageStyle = {
    paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'calc(20px + env(safe-area-inset-left, 0px))',
    paddingRight: 'calc(20px + env(safe-area-inset-right, 0px))',
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
    marginTop: '10px',
    marginBottom: '15px'
};

const fixedBottomBtnStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    paddingTop: '16px',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'calc(20px + env(safe-area-inset-left, 0px))',
    paddingRight: 'calc(20px + env(safe-area-inset-right, 0px))',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    zIndex: 100,
    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
    letterSpacing: '0.5px',
    boxSizing: 'border-box',
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

// --- ІКОНКИ ---
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

// --- КОМПОНЕНТ ЗАВАНТАЖЕННЯ ФОТО С ПРЕВЬЮ ---
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
        height: '150px', 
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
                        <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', borderRadius: '50%' }}>
                            <CheckCircleIcon />
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '12px', padding: '6px', textAlign: 'center' }}>
                            Натисніть щоб змінити
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: colors.textSec }}>
                        <div style={{ marginBottom: '5px' }}><CameraIcon /></div>
                        <div style={{ fontSize: '13px' }}>Зробити або обрати фото</div>
                    </div>
                )}
            </label>
        </div>
    );
};

// --- LAYOUT КАРКАС СТРАНИЦЫ ---
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

        <button 
            onClick={onNext} 
            disabled={loading || btnDisabled} 
            style={{ ...fixedBottomBtnStyle, opacity: (loading || btnDisabled) ? 0.6 : 1 }}
        >
            {loading ? 'Обробка...' : btnText}
        </button>
    </div>
);

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const DriverPhotoUploadWebView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const photoControlId = urlParams.get('id');
    const driverId = urlParams.get('driverId');

    const [step, setStep] = useState(1); // 1 - Экстерьер, 2 - Салон, 3 - Финал
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [files, setFiles] = useState({
        carFront: null,
        carBack: null,
        carLeft: null,
        carRight: null,
        carInteriorFront: null,
        carInteriorBack: null
    });

    const handleFileChange = (e, fieldName) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 15 * 1024 * 1024) {
                return setError('Файл занадто великий (макс. 15 МБ)');
            }
            setFiles(prev => ({ ...prev, [fieldName]: file }));
            setError('');
        }
    };

    const handleBack = () => {
        setError('');
        setStep(s => s - 1);
        window.scrollTo(0, 0);
    };

    const handleExteriorSubmit = () => {
        if (!files.carFront) return setError("Завантажте фото авто спереду");
        if (!files.carBack) return setError("Завантажте фото авто ззаду");
        if (!files.carLeft) return setError("Завантажте фото лівого боку");
        if (!files.carRight) return setError("Завантажте фото правого боку");
        
        setError('');
        setStep(2);
        window.scrollTo(0, 0);
    };

    const handleFinalSubmit = async () => {
        if (!files.carInteriorFront) return setError("Завантажте фото салону спереду");
        if (!files.carInteriorBack) return setError("Завантажте фото салону ззаду");

        if (!photoControlId || !driverId) {
            return setError("Некоректне або застаріле посилання");
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('front', files.carFront);
            formData.append('back', files.carBack);
            formData.append('left', files.carLeft);
            formData.append('right', files.carRight);
            formData.append('interiorFront', files.carInteriorFront);
            formData.append('interiorBack', files.carInteriorBack);

            await photoControlService.submitPhotos(photoControlId, driverId, formData);
            setStep(3);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Помилка відправки фото. Спробуйте ще раз.');
        } finally {
            setLoading(false);
        }
    };

    // --- КРОК 1: ЕКСТЕР'ЄР АВТО ---
    if (step === 1) {
        return (
            <Layout 
                title="Зовнішній вигляд авто" 
                subtitle="Зробіть 4 чітких фото кузова автомобіля з усіх боків" 
                btnText="Далі: Салон авто →" 
                onNext={handleExteriorSubmit} 
                showBack={false} 
                loading={loading} 
                error={error}
            >
                <div style={sectionTitleStyle}>Крок 1 з 2: Кузов авто</div>
                <FileUploadItem label="Спереду (видно номер)" fieldName="carFront" file={files.carFront} onChange={handleFileChange} />
                <FileUploadItem label="Ззаду (видно номер)" fieldName="carBack" file={files.carBack} onChange={handleFileChange} />
                <FileUploadItem label="Лівий бік" fieldName="carLeft" file={files.carLeft} onChange={handleFileChange} />
                <FileUploadItem label="Правий бік (головне фото)" fieldName="carRight" file={files.carRight} onChange={handleFileChange} />
            </Layout>
        );
    }

    // --- КРОК 2: САЛОН АВТО ---
    if (step === 2) {
        return (
            <Layout 
                title="Салон автомобіля" 
                subtitle="Покажіть стан сидінь та чистоту в салоні" 
                btnText="✅ Відправити на перевірку" 
                onNext={handleFinalSubmit} 
                showBack={true} 
                onBack={handleBack} 
                loading={loading} 
                error={error}
            >
                <div style={sectionTitleStyle}>Крок 2 з 2: Салон</div>
                <FileUploadItem label="Передній ряд сидінь" fieldName="carInteriorFront" file={files.carInteriorFront} onChange={handleFileChange} />
                <FileUploadItem label="Задній ряд сидінь" fieldName="carInteriorBack" file={files.carInteriorBack} onChange={handleFileChange} />
            </Layout>
        );
    }

    // --- КРОК 3: УСПІШНЕ ВІДПРАВЛЕННЯ ---
    if (step === 3) {
        return (
            <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingBottom: '0' }}>
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
                <h2 style={{ color: colors.textMain, marginBottom: '10px', textAlign: 'center' }}>Фото успішно відправлені!</h2>
                <p style={{ textAlign: 'center', lineHeight: '1.6', color: colors.textSec, maxWidth: '90%' }}>
                    Дякуємо!<br />
                    Диспетчер перевірить фотозвіт вашого авто найближчим часом.
                </p>
                <button 
                    onClick={() => {
                        if (window.Android && window.Android.closeWebView) {
                            window.Android.closeWebView();
                        } else {
                            window.close();
                        }
                    }} 
                    style={{ ...fixedBottomBtnStyle, position: 'relative', marginTop: '40px', borderRadius: '16px', width: '100%' }}
                >
                    Зрозуміло
                </button>
            </div>
        );
    }

    return null;
};

export default DriverPhotoUploadWebView;
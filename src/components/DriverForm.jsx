import React, { useState, useEffect } from 'react';
import '../assets/Form.css';

const DriverForm = ({ initialData, availableTariffs, onSubmit, onCancel, isLoading }) => {
  // 1. Дані
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', password: '',
    email: '', rnokpp: '', driverLicense: '',
    make: '', model: '', color: '', plateNumber: '', vin: '', year: new Date().getFullYear(),
    carType: 'Седан', 
    tariffIds: []
  });

  // 2. Файли
  const [selectedFile, setSelectedFile] = useState(null);    // Аватарка
  const [selectedCarFile, setSelectedCarFile] = useState(null); // Фото авто
  
  const [docFiles, setDocFiles] = useState({
    techPassportFront: null, techPassportBack: null, insurancePhoto: null,
    photoFront: null, photoBack: null, photoLeft: null, photoRight: null,
    photoSeatsFront: null, photoSeatsBack: null
  });
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phoneNumber || '',
        password: '',
        email: initialData.email || '',
        rnokpp: initialData.rnokpp || '',
        driverLicense: initialData.driverLicense || '',
        make: initialData.car?.make || '',
        model: initialData.car?.model || '',
        color: initialData.car?.color || '',
        plateNumber: initialData.car?.plateNumber || '',
        vin: initialData.car?.vin || '',
        year: initialData.car?.year || new Date().getFullYear(),
        carType: initialData.car?.carType || 'Седан',
        tariffIds: initialData.allowedTariffs ? initialData.allowedTariffs.map(t => t.id) : []
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTariffChange = (e) => {
    const tariffId = parseInt(e.target.value);
    setFormData(prev => {
      if (e.target.checked) return { ...prev, tariffIds: [...prev.tariffIds, tariffId] };
      return { ...prev, tariffIds: prev.tariffIds.filter(id => id !== tariffId) };
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleCarFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedCarFile(e.target.files[0]);
  };

  const handleDocChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) setDocFiles(prev => ({ ...prev, [name]: files[0] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData, year: parseInt(formData.year) };
    if (isEditMode) {
      delete dataToSend.password;
      delete dataToSend.phoneNumber; 
    }
    const carFilesCollection = { carFile: selectedCarFile, ...docFiles };
    onSubmit(dataToSend, selectedFile, carFilesCollection);
  };

  // --- ФУНКЦІЯ ПРЕВЬЮ (Магія тут) ---
  // fileObj - новий файл (File), dbUrl - посилання з бази (String)
  const renderPreview = (fileObj, dbUrl, placeholderText = "Немає фото") => {
    let src = null;
    
    if (fileObj) {
        // Якщо обрали новий файл - створюємо тимчасове посилання
        src = URL.createObjectURL(fileObj);
    } else if (isEditMode && dbUrl) {
        // Якщо є посилання з бази
        src = dbUrl;
    }

    return (
        <div className="image-preview-box">
            {src ? (
                <img src={src} alt="Preview" />
            ) : (
                <span>{placeholderText}</span>
            )}
        </div>
    );
  };

  return (
    <form className="app-form" onSubmit={handleSubmit} autoComplete="off">
      <input type="text" style={{display:'none'}} />
      <input type="password" style={{display:'none'}} />

      {/* --- СЕКЦІЯ 1: ОСОБИСТІ ДАНІ --- */}
      <div className="form-section">
        {/* Колонка фото */}
        <div className="photo-column">
            <label>Аватар водія</label>
            {renderPreview(selectedFile, initialData?.photoUrl, "Фото водія")}
            <label className="custom-file-upload">
                <input type="file" onChange={handleFileChange} accept="image/*" style={{display:'none'}}/>
                Обрати фото
            </label>
        </div>

        {/* Колонка полів */}
        <div className="fields-column">
            <h3 className="full-width">Особисті дані</h3>
            
            <div className="form-group">
                <label>ПІБ *</label>
                <input name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Телефон *</label>
                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required disabled={isEditMode} />
            </div>
            <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            {!isEditMode && (
                <div className="form-group">
                    <label>Пароль *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
                </div>
            )}
            <div className="form-group">
                <label>РНОКПП *</label>
                <input name="rnokpp" value={formData.rnokpp} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Посвідчення водія *</label>
                <input name="driverLicense" value={formData.driverLicense} onChange={handleChange} required />
            </div>
        </div>
      </div>

      {/* --- СЕКЦІЯ 2: АВТОМОБІЛЬ --- */}
      <div className="form-section">
        {/* Фото авто */}
        <div className="photo-column">
            <label>Фото авто (Головне)</label>
            {renderPreview(selectedCarFile, initialData?.car?.photoUrl, "Фото машини")}
            <label className="custom-file-upload">
                <input type="file" onChange={handleCarFileChange} accept="image/*" style={{display:'none'}}/>
                Обрати фото
            </label>
        </div>

        {/* Дані авто */}
        <div className="fields-column">
            <h3 className="full-width">Дані автомобіля</h3>

            <div className="form-group">
                <label>Марка *</label>
                <input name="make" value={formData.make} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Модель *</label>
                <input name="model" value={formData.model} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Держ. номер *</label>
                <input name="plateNumber" value={formData.plateNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Тип кузова *</label>
                <select name="carType" value={formData.carType} onChange={handleChange} required>
                    <option value="Седан">Седан</option>
                    <option value="Хетчбек">Хетчбек</option>
                    <option value="Універсал">Універсал</option>
                    <option value="Кросовер">Кросовер</option>
                    <option value="Пікап">Пікап</option>
                    <option value="Мінівен">Мінівен</option> 
                </select>
            </div>
            <div className="form-group">
                <label>Колір *</label>
                <input name="color" value={formData.color} onChange={handleChange} required placeholder="#FFFFFF або Назва" />
            </div>
            <div className="form-group">
                <label>Рік випуску *</label>
                <input type="number" name="year" value={formData.year} onChange={handleChange} required />
            </div>
            <div className="form-group full-width">
                <label>VIN код *</label>
                <input name="vin" value={formData.vin} onChange={handleChange} required />
            </div>
        </div>
      </div>

      {/* --- СЕКЦІЯ 3: ДОКУМЕНТИ ТА ОГЛЯД --- */}
      <div className="form-section" style={{flexDirection: 'column'}}>
        <h3>Документи та Фотозвіт</h3>
        
        <div className="docs-grid">
            {/* Техпаспорт */}
            <div className="doc-item">
                <label>Тех. паспорт (Перед)</label>
                {renderPreview(docFiles.techPassportFront, initialData?.car?.techPassportFront)}
                <label className="custom-file-upload">
                    <input type="file" name="techPassportFront" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Тех. паспорт (Зад)</label>
                {renderPreview(docFiles.techPassportBack, initialData?.car?.techPassportBack)}
                <label className="custom-file-upload">
                    <input type="file" name="techPassportBack" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Страховка (ОСАГО)</label>
                {renderPreview(docFiles.insurancePhoto, initialData?.car?.insurancePhoto)}
                <label className="custom-file-upload">
                    <input type="file" name="insurancePhoto" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>

            {/* Сторони авто */}
            <div className="doc-item">
                <label>Вид спереду</label>
                {renderPreview(docFiles.photoFront, initialData?.car?.photoFront)}
                <label className="custom-file-upload">
                    <input type="file" name="photoFront" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Вид ззаду</label>
                {renderPreview(docFiles.photoBack, initialData?.car?.photoBack)}
                <label className="custom-file-upload">
                    <input type="file" name="photoBack" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Вид зліва</label>
                {renderPreview(docFiles.photoLeft, initialData?.car?.photoLeft)}
                <label className="custom-file-upload">
                    <input type="file" name="photoLeft" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Вид справа</label>
                {renderPreview(docFiles.photoRight, initialData?.car?.photoRight)}
                <label className="custom-file-upload">
                    <input type="file" name="photoRight" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Салон (Перед)</label>
                {renderPreview(docFiles.photoSeatsFront, initialData?.car?.photoSeatsFront)}
                <label className="custom-file-upload">
                    <input type="file" name="photoSeatsFront" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
            <div className="doc-item">
                <label>Салон (Зад)</label>
                {renderPreview(docFiles.photoSeatsBack, initialData?.car?.photoSeatsBack)}
                <label className="custom-file-upload">
                    <input type="file" name="photoSeatsBack" onChange={handleDocChange} accept="image/*" style={{display:'none'}}/>
                    Завантажити
                </label>
            </div>
        </div>
      </div>

      {/* --- СЕКЦІЯ 4: ТАРИФИ --- */}
      <div className="form-section" style={{flexDirection: 'column'}}>
        <h3>Доступні тарифи</h3>
        <div className="checkbox-group">
            {availableTariffs.length > 0 ? (
            availableTariffs.map(tariff => (
                <label key={tariff.id} className="checkbox-label">
                <input 
                    type="checkbox"
                    value={tariff.id}
                    checked={formData.tariffIds.includes(tariff.id)}
                    onChange={handleTariffChange}
                />
                {tariff.name}
                </label>
            ))
            ) : <p>Тарифи не знайдені</p>}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>Скасувати</button>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Збереження...' : (isEditMode ? 'Оновити' : 'Створити')}
        </button>
      </div>
    </form>
  );
};

export default DriverForm;
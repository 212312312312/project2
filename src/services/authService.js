import api from './api';

// --- ЛОГИН ---
export const loginUser = async (login, password) => {
  try {
    const response = await api.post('/auth/login', { login, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка входу. Спробуйте ще раз.');
  }
};

// --- РЕЄСТРАЦІЯ ВОДІЯ (WEBVIEW) ---

export const requestDriverSms = async (phoneNumber) => {
  try {
    const response = await api.post('/auth/driver/sms/request', { phoneNumber });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося відправити SMS');
  }
};

export const verifyDriverSms = async (phoneNumber, code) => {
  try {
    const response = await api.post('/auth/driver/sms/verify-code', { phoneNumber, code });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Невірний код');
  }
};

/** * 3. Финальная регистрация (Multipart/Form-Data)
 */
export const registerDriver = async (driverData, files = {}) => {
  try {
    const formData = new FormData();

    // 1. Добавляем JSON данные как строку (ключ "request")
    formData.append('request', JSON.stringify(driverData));

    // 2. Добавляем файлы
    if (files.avatar) formData.append('avatar', files.avatar);
    if (files.driverLicenseFront) formData.append('driverLicenseFront', files.driverLicenseFront);
    if (files.driverLicenseBack) formData.append('driverLicenseBack', files.driverLicenseBack);
    if (files.techPassportFront) formData.append('techPassportFront', files.techPassportFront);
    if (files.techPassportBack) formData.append('techPassportBack', files.techPassportBack);
    if (files.insurance) formData.append('insurance', files.insurance);
    if (files.carPhoto) formData.append('carPhoto', files.carPhoto);

    // 3. ОТПРАВЛЯЕМ
    // ВАЖЛИВО: Не вказуємо Content-Type вручну. 
    // Axios побачить, що це FormData, і браузер сам додасть правильний заголовок з boundary.
    const response = await api.post('/auth/driver/register', formData);
    
    return response.data;
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error(error.response?.data?.message || 'Помилка реєстрації');
  }
};
import axios from 'axios';

// 1. Создаем "экземпляр" (instance) axios
const api = axios.create({
  // ВАЖНО: Используем относительный путь. 
  baseURL: '/api/v1',
  
  // !!! ВИДАЛЯЄМО ЦЕЙ РЯДОК !!!
  // headers: { 'Content-Type': 'application/json' }, 
  
  // Axios САМ визначить:
  // - Якщо шлемо об'єкт -> поставить application/json
  // - Якщо шлемо FormData (файли) -> поставить multipart/form-data
});

// 2. Создаем "Перехватчик Запросов"
api.interceptors.request.use(
  (config) => {
    // 3. Получаем токен из localStorage
    const token = localStorage.getItem('token');
    
    // 4. Если токен есть, прикрепляем его
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 5. Перехватчик Ответов (для 401/403)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isRegistrationPage = window.location.pathname.includes('/driver-register');

    if (!isRegistrationPage && error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; 
      console.error("Auth Error. Logging out.");
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios';

// 1. Создаем "экземпляр" (instance) axios
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1'
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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // 1. Удаляем "сломанный" токен
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 2. "Выкидываем" пользователя на страницу логина
      window.location.href = '/login'; 
      console.error("Auth Error. Logging out.");
    }
    return Promise.reject(error);
  }
);

export default api;
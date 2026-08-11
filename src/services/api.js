import axios from 'axios';

// 0. Автоматически определяем адрес текущего сервера (ПК, телефон или Cloud Run)
const SERVER_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : 'https://api.unitua.com';

// 1. Создаем экземпляр axios с относительным или динамическим baseURL
const api = axios.create({
  baseURL: `${SERVER_URL}/api/v1`,
  withCredentials: true // автоматически пересылать HttpOnly куки бэкенду
});

// 2. Создаем "Перехватчик Запросов"
api.interceptors.request.use(
  (config) => {
    // 3. Пытаемся достать токен из localStorage
    let token = localStorage.getItem('token');
    
    // 🛠️ ФИКС ДЛЯ WEBVIEW: Если в localStorage токена нет, читаем его из URL (?token=...)
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        token = urlToken;
        // Сохраняем токен в localStorage WebView для последующих запросов
        localStorage.setItem('token', urlToken);
      }
    }
    
    // 4. Если токен найден — прикрепляем заголовок Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 5. Перехватчик Ответов с поддержкой автоматического Refresh Token очереди
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🛠️ ФИКС ДЛЯ WEBVIEW: Проверяем, является ли текущая страница публичным WebView водителя
    const currentPath = window.location.pathname;
    const isPublicOrWebView = 
      currentPath.includes('/driver-register') ||
      currentPath.includes('/driver/photo-upload') ||
      currentPath.includes('/photo-control') ||
      currentPath.includes('/add-car');

    // Если это НЕ WebView водителя, сервер вернул 401 и запрос еще не пытался повториться
    if (!isPublicOrWebView && error.response && error.response.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${SERVER_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });

        processQueue(null);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        localStorage.clear();
        
        // 🛠️ Редирект на /login выполняется ТОЛЬКО если это НЕ WebView водителя!
        if (!isPublicOrWebView) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response && error.response.status === 403) {
      console.error("Критическая ошибка прав доступа (Forbidden).");
    }

    return Promise.reject(error);
  }
);

// ЗАМЕНИТЬ ФУНКЦИЮ getImageUrl В КОНЦЕ ФАЙЛА src/services/api.js:
export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = SERVER_URL.replace(/\/$/, '');
    return `${baseUrl}${cleanPath}`;
};

export default api;
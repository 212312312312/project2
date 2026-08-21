import axios from 'axios';

// 0. Динамический адрес: берет текущий хост и порт (localhost, 192.168.x.x или домен)
const SERVER_URL = typeof window !== 'undefined' && window.location.origin 
  ? window.location.origin 
  : 'http://localhost:8080';

// 1. Создаем экземпляр axios с относительным baseURL
const api = axios.create({
  baseURL: '/api/v1', // Относительный путь работает везде автоматически
  withCredentials: true
});

// 2. Создаем "Перехватчик Запросов"
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        token = urlToken;
        localStorage.setItem('token', urlToken);
      }
    }
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 5. Перехватчик Ответов
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const currentPath = window.location.pathname;
    const isPublicOrWebView = 
      currentPath.includes('/driver-registration') ||
      currentPath.includes('/driver-register') ||
      currentPath.includes('/driver/photo-upload') ||
      currentPath.includes('/photo-control') ||
      currentPath.includes('/add-car');

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
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });

        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        localStorage.clear();
        
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
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
    const isRegistrationPage = window.location.pathname.includes('/driver-register');

    // Если это не страница регистрации, сервер вернул 401 и этот запрос еще не пытался повториться
    if (!isRegistrationPage && error.response && error.response.status === 401 && !originalRequest._retry) {
      
      // Если мы уже в процессе обновления токена — ставим запрос в очередь ожидания
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Если рефреш-токена вообще нет — принудительный разлогин
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Запрашиваем новый Access Token через бэкенд, передавая старый рефреш в Body (согласно нашему AuthController)
        const response = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Сохраняем новые данные сессии
        localStorage.setItem('token', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Обновляем заголовок текущего упавшего запроса
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Пропускаем все скопившиеся в очереди запросы с новым токеном
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Повторяем наш изначальный запрос
        return api(originalRequest);
      } catch (refreshError) {
        // Если рефреш-токен тоже протух или украден — сжигаем сессию полностью
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Если ошибка 403 (Доступ запрещен по ролям) — жестко прерываем выполнение
    if (error.response && error.response.status === 403) {
      console.error("Критическая ошибка прав доступа (Forbidden).");
    }

    return Promise.reject(error);
  }
);

export default api;
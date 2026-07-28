import axios from 'axios';

// 0. Базовый адрес вашего продакшн-сервера в Google Cloud Run
const SERVER_URL = 'https://taxi-server-594834712305.europe-central2.run.app';

// 1. Создаем "экземпляр" (instance) axios
const api = axios.create({
  baseURL: `${SERVER_URL}/api/v1`,
  withCredentials: true // автоматически пересылать HttpOnly куки бэкенду
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
      
      // Если мы уже в процессе обновления — ждем завершения и повторяем исходный запрос
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
        // Вызываем обновление сессии по полному URL бэкенда.
        // Тело запроса пустое {}, бэкенд прочитает куку refreshToken сам!
        await axios.post(`${SERVER_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });

        // Уведомляем очередь, что рефреш прошел успешно
        processQueue(null);
        isRefreshing = false;

        // Повторяем упавший запрос (он автоматически отправится с новой accessToken кукой)
        return api(originalRequest);
      } catch (refreshError) {
        // Если кука рефреша протухла — сжигаем данные профиля и перенаправляем на логин
        processQueue(refreshError);
        isRefreshing = false;
        localStorage.clear(); // Чистим оставшийся кэш (user, role) во избежание багов UI
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
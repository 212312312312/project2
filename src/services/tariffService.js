import api from './api';

/**
 * (Read) Отримання списку всіх тарифів
 * @returns {Promise<Array>}
 */
export const getAllTariffs = async () => {
  try {
    const response = await api.get('/admin/tariffs');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to load tariffs');
  }
};

/**
 * Зміна черги/порядку відображення тарифів
 */
export const reorderTariff = async (id, direction) => {
  try {
    const response = await api.post(`/admin/tariffs/${id}/reorder?direction=${direction}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка зміни порядку тарифів');
  }
};

/**
 * (Create) Створення нового тарифу з файлом зображення
 * @param {object} tariffData - JS-об'єкт форми
 * @param {File|null} file - Файл зображення
 */
export const createTariff = async (tariffData, file) => {
  const formData = new FormData();
  formData.append('request', JSON.stringify(tariffData));
  
  if (file) {
    formData.append('file', file);
  }

  try {
    const response = await api.post('/admin/tariffs', formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка створення тарифу');
  }
};

/**
 * (Update) Оновлення існуючого тарифу
 * @param {number} id - ID тарифу
 * @param {object} tariffData - JS-об'єкт форми
 * @param {File|null} file - Новий файл зображення (якщо обрано)
 */
export const updateTariff = async (id, tariffData, file) => {
  const formData = new FormData();
  formData.append('request', JSON.stringify(tariffData));
  
  if (file) {
    formData.append('file', file);
  }

  try {
    const response = await api.put(`/admin/tariffs/${id}`, formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка оновлення тарифу');
  }
};

/**
 * (Delete) Видалення тарифу
 * @param {number} id - ID тарифу
 */
export const deleteTariff = async (id) => {
  try {
    const response = await api.delete(`/admin/tariffs/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення тарифу');
  }
};

/**
 * Отримання глобального мінімального кілометражу поїздки (у км)
 */
export const getMinDistance = async () => {
  try {
    const response = await api.get('/admin/tariffs/min-distance');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка завантаження мінімального кілометражу');
  }
};

/**
 * Оновлення глобального мінімального кілометражу поїздки для всіх тарифів
 */
export const updateMinDistance = async (distance) => {
  try {
    const response = await api.put(`/admin/tariffs/min-distance?distance=${distance}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка оновлення мінімального кілометражу');
  }
};

/**
 * Отримання списку доступних тарифів з EvoS / СОЗ
 * @returns {Promise<Array<string>>}
 */
export const getEvosTariffs = async () => {
  try {
    const response = await api.get('/admin/tariffs/evos-tariffs');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Помилка завантаження тарифів EvoS:', error);
    return [];
  }
};

/**
 * Отримання повної конфігурації динамічних коефіцієнтів (час + погода + live-погода)
 */
export const getSurgeConfig = async () => {
  try {
    const response = await api.get('/admin/tariffs/surge');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка завантаження конфігурації коефіцієнтів');
  }
};

/**
 * Створення або оновлення правила коефіцієнта по часу
 */
export const saveTimeSurgeRule = async (ruleData) => {
  try {
    const response = await api.post('/admin/tariffs/surge/time-rules', ruleData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка збереження правила часу');
  }
};

/**
 * Видалення правила коефіцієнта по часу
 */
export const deleteTimeSurgeRule = async (id) => {
  try {
    const response = await api.delete(`/admin/tariffs/surge/time-rules/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення правила');
  }
};

/**
 * Перемикання активності правила часу
 */
export const toggleTimeSurgeRule = async (id) => {
  try {
    const response = await api.put(`/admin/tariffs/surge/time-rules/${id}/toggle`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка перемикання правила');
  }
};

/**
 * Глобальне ввімкнення / вимкнення погодного коефіцієнта
 */
export const toggleWeatherSurge = async (enabled) => {
  try {
    const response = await api.put(`/admin/tariffs/surge/weather-toggle?enabled=${enabled}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка зміни статусу погоди');
  }
};

/**
 * Оновлення множника конкретного типу погоди
 */
export const updateWeatherSurgeRule = async (id, multiplier, isActive) => {
  try {
    const response = await api.put(
      `/admin/tariffs/surge/weather-rules/${id}?multiplier=${multiplier}&isActive=${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка оновлення погодного правила');
  }
};

/**
 * Отримання свіжих даних про погоду Open-Meteo
 */
export const getLiveWeather = async (lat, lng) => {
  try {
    const params = lat && lng ? `?lat=${lat}&lng=${lng}` : '';
    const response = await api.get(`/admin/tariffs/surge/live-weather${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка завантаження погоди');
  }
};
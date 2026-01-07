import api from './api'; // Наш настроенный axios

/**
 * (Read) Получает список ВСЕХ водителей
 */
export const getAllDrivers = async () => {
  try {
    const response = await api.get('/admin/drivers');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить список водителей');
  }
};

/**
 * (Read) Получает список водителей ONLINE (для карты)
 * ЭТОЙ ФУНКЦИИ НЕ БЫЛО, Я ДОБАВИЛ ЕЁ
 */
export const getOnlineDriversForMap = async () => {
  try {
    // ИСПРАВЛЕНО: Путь теперь /admin/drivers/location-map
    const response = await api.get(`/admin/drivers/location-map?t=${new Date().getTime()}`);
    return response.data;
  } catch (error) {
    console.error("Ошибка загрузки водителей на карту:", error);
    return []; 
  }
};

/**
 * (Create) Создает нового водителя
 */
export const createDriver = async (driverData, file) => {
  try {
    const formData = new FormData();
    formData.append('request', JSON.stringify(driverData));
    
    if (file) {
      formData.append('file', file);
    }

    const response = await api.post('/admin/drivers', formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при создании водителя');
  }
};

/**
 * (Update) Обновляет данные водителя
 */
export const updateDriver = async (id, driverData, file) => {
  try {
    const formData = new FormData();
    formData.append('request', JSON.stringify(driverData));
    
    if (file) {
      formData.append('file', file);
    }

    const response = await api.put(`/admin/drivers/${id}`, formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при обновлении водителя');
  }
};

/**
 * (Delete) Удаляет водителя
 */
export const deleteDriver = async (id) => {
  try {
    const response = await api.delete(`/admin/drivers/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при удалении водителя');
  }
};

// --- Функции Блокировки ---

export const blockDriverPermanently = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/block`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка блокировки');
  }
};

export const blockDriverTemporarily = async (id, durationHours) => {
  try {
    const response = await api.post(`/admin/drivers/${id}/temp-block`, { durationHours });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка временной блокировки');
  }
};

export const unblockDriver = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/unblock`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка разблокировки');
  }
};
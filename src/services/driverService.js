import api from './api'; // Наш настроенный axios

/**
 * (Read) Получает список ВСЕХ водителей
 * @returns {Promise<Array>} - Массив объектов DriverDto
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
 * (Create) Создает нового водителя (с поддержкой фото)
 * @param {object} driverData - DTO 'RegisterDriverRequest'
 * @param {File} [file] - Файл фото водителя (необязательно)
 * @returns {Promise<object>} - Сообщение об успехе
 */
export const createDriver = async (driverData, file) => {
  try {
    // Используем FormData для отправки JSON + Файла
    const formData = new FormData();
    // Бэкенд ждет JSON в поле "request" (строкой)
    formData.append('request', JSON.stringify(driverData));
    
    // Если файл есть, добавляем его
    if (file) {
      formData.append('file', file);
    }

    // Axios сам выставит Content-Type: multipart/form-data
    const response = await api.post('/admin/drivers', formData);
    return response.data; // { message: "..." }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при создании водителя');
  }
};

/**
 * (Update) Обновляет данные водителя (с поддержкой фото)
 * @param {number} id - ID водителя
 * @param {object} driverData - DTO 'UpdateDriverRequest'
 * @param {File} [file] - Новый файл фото (необязательно)
 * @returns {Promise<object>} - Обновленный объект DriverDto
 */
export const updateDriver = async (id, driverData, file) => {
  try {
    const formData = new FormData();
    formData.append('request', JSON.stringify(driverData));
    
    if (file) {
      formData.append('file', file);
    }

    const response = await api.put(`/admin/drivers/${id}`, formData);
    return response.data; // Обновленный DriverDto
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при обновлении водителя');
  }
};

/**
 * (Delete) "Умно" удаляет водителя
 * @param {number} id - ID водителя
 * @returns {Promise<object>} - Сообщение об успехе
 */
export const deleteDriver = async (id) => {
  try {
    const response = await api.delete(`/admin/drivers/${id}`);
    return response.data; // { message: "..." }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка при удалении водителя');
  }
};

// --- Функции Блокировки ---

/**
 * (Update) Блокирует водителя навсегда
 * @param {number} id - ID водителя
 * @returns {Promise<object>} - Обновленный DriverDto
 */
export const blockDriverPermanently = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/block`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка блокировки');
  }
};

/**
 * (Update) Блокирует водителя временно
 * @param {number} id - ID водителя
 * @param {number} durationHours - Кол-во часов
 * @returns {Promise<object>} - Обновленный DriverDto
 */
export const blockDriverTemporarily = async (id, durationHours) => {
  try {
    const response = await api.post(`/admin/drivers/${id}/temp-block`, { durationHours });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка временной блокировки');
  }
};

/**
 * (Update) Снимает все блокировки
 * @param {number} id - ID водителя
 * @returns {Promise<object>} - Обновленный DriverDto
 */
export const unblockDriver = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/unblock`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка разблокировки');
  }
};
import api from './api'; // Наш настроенный axios

// --- API для Карты (Map) ---

/**
 * (Read) Получает ТОЛЬКО ONLINE водителей для карты
 * @returns {Promise<Array>} - [{ id, fullName, latitude, longitude }, ...]
 */
export const getOnlineDriversForMap = async () => {
  try {
    const response = await api.get('/admin/drivers/online');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить водителей для карты');
  }
};

// --- API для Заказов (Orders) ---

/**
 * (Read) Получает "Активные заказы" (REQUESTED, ACCEPTED, IN_PROGRESS)
 * @returns {Promise<Array>} - Массив TaxiOrderDto
 */
export const getActiveOrders = async () => {
  try {
    const response = await api.get('/admin/orders/active');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить активные заказы');
  }
};

/**
 * (Read) Получает "Архив заказов" (COMPLETED, CANCELLED)
 * @returns {Promise<Array>} - Массив TaxiOrderDto
 */
export const getArchivedOrders = async () => {
  try {
    const response = await api.get('/admin/orders/archive');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить архив заказов');
  }
};

/**
 * (Read) Ищет в архиве по номеру телефона
 * @param {string} phone - Номер телефона
 * @returns {Promise<Array>} - Массив TaxiOrderDto
 */
export const searchArchiveByPhone = async (phone) => {
  try {
    // Запрос будет /api/v1/admin/orders/archive/search?phone=...
    const response = await api.get('/admin/orders/archive/search', {
      params: { phone }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка поиска в архиве');
  }
};

/**
 * (Update) Диспетчер отменяет заказ
 * @param {number} orderId - ID заказа
 * @returns {Promise<object>} - Обновленный TaxiOrderDto (статус CANCELLED)
 */
export const cancelOrder = async (orderId) => {
  try {
    // ИСПРАВЛЕНО: api.patch -> api.post (чтобы совпадало с сервером)
    const response = await api.post(`/admin/orders/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка отмены заказа');
  }
};

/**
 * (Update) Диспетчер назначает водителя на заказ
 * @param {number} orderId - ID заказа
 * @param {number} driverId - ID водителя
 * @returns {Promise<object>} - Обновленный TaxiOrderDto (статус ACCEPTED)
 */
export const assignDriverToOrder = async (orderId, driverId) => {
  try {
    // ИСПРАВЛЕНО: api.patch -> api.post (обычно действия делаются через POST)
    // Запрос будет /api/v1/admin/orders/10/assign?driverId=5
    const response = await api.post(`/admin/orders/${orderId}/assign`, null, {
      params: { driverId }
    });
    return response.data;
  } catch (error) {
    // Эта ошибка очень важна (например, "Водитель уже на заказе")
    throw new Error(error.response?.data?.message || 'Ошибка назначения водителя');
  }
};
import api from './api'; // Наш настроенный axios

/**
 * (Read) Получает список ВСЕХ клиентов
 * @returns {Promise<Array>} - Массив объектов ClientDto
 */
export const getAllClients = async () => {
  try {
    const response = await api.get('/admin/clients');
    // response.data = [{ id, phoneNumber, fullName, blocked }, ...]
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить список клиентов');
  }
};

/**
 * (Update) Блокирует клиента (Черный список)
 * @param {number} id - ID клиента
 * @returns {Promise<object>} - Обновленный ClientDto
 */
export const blockClient = async (id) => {
  try {
    const response = await api.patch(`/admin/clients/${id}/block`);
    return response.data; // Обновленный ClientDto
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка блокировки клиента');
  }
};

/**
 * (Update) Разблокирует клиента
 * @param {number} id - ID клиента
 * @returns {Promise<object>} - Обновленный ClientDto
 */
export const unblockClient = async (id) => {
  try {
    const response = await api.patch(`/admin/clients/${id}/unblock`);
    return response.data; // Обновленный ClientDto
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка разблокировки клиента');
  }
};
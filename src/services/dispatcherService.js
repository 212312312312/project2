import api from './api'; // Наш настроенный axios

/**
 * (Read) Получает список ВСЕХ диспетчеров
 * @returns {Promise<Array>} - Массив объектов DispatcherDto
 */
export const getAllDispatchers = async () => {
  try {
    const response = await api.get('/admin/dispatchers');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить диспетчеров');
  }
};

/**
 * (Create) Создает нового диспетчера
 * @param {object} data - { userLogin, fullName, password }
 * @returns {Promise<object>} - Новый DispatcherDto
 */
export const createDispatcher = async (data) => {
  try {
    const response = await api.post('/admin/dispatchers', data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка создания диспетчера');
  }
};

/**
 * (Update) Обновляет диспетчера
 * @param {number} id
 * @param {object} data - { userLogin, fullName, password? }
 * @returns {Promise<object>} - Обновленный DispatcherDto
 */
export const updateDispatcher = async (id, data) => {
  try {
    const response = await api.put(`/admin/dispatchers/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка обновления диспетчера');
  }
};

/**
 * (Delete) Удаляет диспетчера
 * @param {number} id
 * @returns {Promise<object>}
 */
export const deleteDispatcher = async (id) => {
  try {
    const response = await api.delete(`/admin/dispatchers/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка удаления диспетчера');
  }
};
import api from './api';

/**
 * Отправляет запрос на /auth/login
 * @param {string} login - Логин (например 'admin')
 * @param {string} password
 */
export const loginUser = async (login, password) => {
  try {
    const response = await api.post('/auth/login', {
      login,
      password
    });
    
    // response.data = { token, userId, fullName, role }
    return response.data;
    
  } catch (error) {
    // 'error.response.data.message' - это, например, "Пользователь не найден"
    throw new Error(error.response?.data?.message || 'Ошибка входа. Попробуйте снова.');
  }
};
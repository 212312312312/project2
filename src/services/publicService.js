import api from './api';

/**
 * Получает списки марок, моделей, цветов и типов авто
 * Используется в форме регистрации
 */
export const getCarOptions = async () => {
  try {
    const response = await api.get('/public/info/car-options');
    return response.data; 
    // Ожидаем: { makes: [{name, models:[]}], colors: [], types: [] }
  } catch (error) {
    console.error("Error loading car options:", error);
    return { makes: [], colors: [], types: [] }; // Возвращаем пустую структуру при ошибке
  }
};

/**
 * Отримує список публічних тарифів (Економ, Комфорт і т.д.)
 * Використовується в адмінці для активації водія
 */
export const getTariffs = async () => {
  try {
    const response = await api.get('/public/tariffs');
    return response.data;
  } catch (error) {
    console.error("Error loading tariffs:", error);
    return []; // Повертаємо пустий масив, щоб React не падав при map()
  }
};
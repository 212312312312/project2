import api from './api';

/**
 * Отримує список міст та їх категорій (Grade A / Grade B)
 */
export const getCities = async () => {
  try {
    const response = await api.get('/public/classifier/cities');
    return response.data;
  } catch (error) {
    console.error("Error loading cities:", error);
    return [];
  }
};

/**
 * Отримує список усіх марок автомобілів з класифікатора
 */
export const getCarBrands = async () => {
  try {
    const response = await api.get('/public/classifier/brands');
    return response.data;
  } catch (error) {
    console.error("Error loading car brands:", error);
    return [];
  }
};

/**
 * Отримує список моделей для обраної марки
 */
export const getCarModels = async (brandId) => {
  if (!brandId) return [];
  try {
    const response = await api.get(`/public/classifier/brands/${brandId}/models`);
    return response.data;
  } catch (error) {
    console.error("Error loading car models:", error);
    return [];
  }
};

/**
 * Оцінює допуск авто за класифікатором та повертає доступні тарифи
 */
export const evaluateCarTariffs = async (cityName, modelId, year) => {
  try {
    const response = await api.post('/public/classifier/evaluate', {
      cityName,
      modelId: Number(modelId),
      year: Number(year)
    });
    return response.data;
  } catch (error) {
    console.error("Error evaluating car tariffs:", error);
    throw error;
  }
};

/**
 * Отримує списки марок, моделей, кольорів та типів авто (залишено для зворотної сумісності)
 */
export const getCarOptions = async () => {
  try {
    const response = await api.get('/public/info/car-options');
    return response.data; 
  } catch (error) {
    console.error("Error loading car options:", error);
    return { makes: [], colors: [], types: [] };
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
    return [];
  }
};
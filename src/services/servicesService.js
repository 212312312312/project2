import api from './api'; // 👈 Импортируем наш настроенный Axios экземпляр

// baseURL в api.js уже равен '/api/v1', поэтому пишем только относительный путь
const ROUTE_URL = '/admin/services'; 

export const getAllServices = async () => {
  try {
    const response = await api.get(ROUTE_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching services:', error);
    throw new Error('Помилка завантаження послуг');
  }
};

export const createService = async (serviceData) => {
  try {
    const response = await api.post(ROUTE_URL, serviceData);
    return response.data;
  } catch (error) {
    console.error('Error creating service:', error);
    throw new Error('Помилка створення послуги');
  }
};

export const deleteService = async (id) => {
  try {
    await api.delete(`${ROUTE_URL}/${id}`);
  } catch (error) {
    console.error('Error deleting service:', error);
    throw new Error('Помилка видалення послуги');
  }
};
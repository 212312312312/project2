import api from './api';

// Получить все оценки (для админа)
export const getAllRatings = async () => {
  const response = await api.get('/admin/ratings');
  return response.data;
};

// Переключить статус "Игнорировать" (для админа)
export const toggleIgnoreRating = async (id) => {
  const response = await api.post(`/admin/ratings/${id}/ignore`);
  return response.data;
};

// Отправить оценку (для клиента/водителя - пригодится позже)
export const rateDriver = async (data) => {
  return await api.post('/client/rate', data);
};

export const rateClient = async (data) => {
  return await api.post('/driver/rate', data);
};
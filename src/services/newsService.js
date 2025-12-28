import api from './api'; // Ваш налаштований axios instance

// Отримати всі новини (для адміна)
export const getAllNews = async () => {
  try {
    const response = await api.get('/admin/news');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка завантаження новин');
  }
};

// Створити новину
export const createNews = async (newsData) => {
  // newsData = { title: "...", content: "..." }
  try {
    const response = await api.post('/admin/news', newsData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка створення новини');
  }
};

// Видалити новину
export const deleteNews = async (id) => {
  try {
    await api.delete(`/admin/news/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення новини');
  }
};
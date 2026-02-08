import api from './api';

// Получить все новости
export const getAllNews = async () => {
  try {
    const response = await api.get('/admin/news');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка завантаження новин');
  }
};

// !!! ВАЖНОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ !!!
export const createNews = async (newsData) => {
  try {
    // Используем FormData, чтобы отправить и текст, и файл
    const formData = new FormData();
    formData.append('title', newsData.title);
    formData.append('content', newsData.content);
    formData.append('target', newsData.target || 'ALL'); 
    
    if (newsData.image) {
      formData.append('image', newsData.image);
    }

    // Axios сам выставит правильный boundary, если передать FormData.
    // Но для надежности можно указать заголовок:
    const response = await api.post('/admin/news', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("News create error:", error);
    throw new Error(error.response?.data?.message || 'Помилка створення новини');
  }
};

// Удалить новость
export const deleteNews = async (id) => {
  try {
    await api.delete(`/admin/news/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення новини');
  }
};
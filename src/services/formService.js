import api from './api';

export const formService = {
  // Получить схему (GET работает, мы это знаем)
  getFormSchema: async (key) => {
    // Если api.js настроен на /api/v1, то запрос пойдет на /api/v1/admin/forms/{key}
    const response = await api.get(`/admin/forms/${key}`);
    return response.data;
  },

  // Сохранить схему (PUT)
  saveFormSchema: async (key, schema) => {
    // Важно: отправляем на тот же адрес, но методом PUT
    const response = await api.put(`/admin/forms/${key}`, schema);
    return response.data;
  }
};
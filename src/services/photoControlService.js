import api from './api';

export const photoControlService = {
  // Запросить фотоконтроль у водителя
  requestPhotoControl: async (driverId) => {
    const response = await api.post('/photo-control/request', { driverId });
    return response.data;
  },

  // Получить список всех заявок фотоконтроля (для админа/диспетчера)
  getAllPhotoControls: async () => {
    const response = await api.get('/photo-control/admin/all');
    return response.data;
  },

  // Проверить заявку (Одобрить / Отклонить)
  reviewPhotoControl: async (id, approved, rejectReason = null) => {
    const response = await api.post(`/photo-control/admin/${id}/review`, {
      approved,
      rejectReason,
    });
    return response.data;
  },

  // Скасувати заявку фотоконтролю
  cancelPhotoControl: async (id) => {
    const response = await api.post(`/photo-control/admin/${id}/cancel`);
    return response.data;
  },

  // Загрузка фото водителем (из WebView - поддерживает файлы через FormData)
  submitPhotos: async (id, driverId, photoData) => {
    const isFormData = photoData instanceof FormData;
    const response = await api.post(
      `/photo-control/driver/${id}/submit?driverId=${driverId}`, 
      photoData,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
    );
    return response.data;
  }
};
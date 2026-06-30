import api from './api';

export const analyticsService = {
  getGeneralAnalytics: async () => {
    // Стало (исправлено):
const response = await api.get('/admin/analytics/general');
    return response.data;
  }
};
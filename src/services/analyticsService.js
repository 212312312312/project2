import api from './api';

export const analyticsService = {
  getGeneralAnalytics: async () => {
    const response = await api.get('/admin/analytics/general');
    return response.data;
  },
  getDeepAnalytics: async () => {
    const response = await api.get('/admin/analytics/deep');
    return response.data;
  }
};
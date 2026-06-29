import api from './api';

export const analyticsService = {
  getGeneralAnalytics: async () => {
    const response = await api.get('/api/v1/admin/analytics/general');
    return response.data;
  }
};
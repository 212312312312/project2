import api from './api';

export const analyticsService = {
  getGeneralAnalytics: async (params = {}) => {
    const queryParams = {};
    if (params.period) queryParams.period = params.period;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    const response = await api.get('/admin/analytics/general', { params: queryParams });
    return response.data;
  },

  getDeepAnalytics: async (params = {}) => {
    const queryParams = {};
    if (params.period) queryParams.period = params.period;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    const response = await api.get('/admin/analytics/deep', { params: queryParams });
    return response.data;
  },

  addManualFinanceEntry: async (payload) => {
    const response = await api.post('/admin/analytics/manual-finance', payload);
    return response.data;
  },

  deleteManualFinanceEntry: async (id) => {
    const response = await api.delete(`/admin/analytics/manual-finance/${id}`);
    return response.data;
  }
};
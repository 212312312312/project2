import api from './api';

export const payoutService = {
  getPendingPayouts: async () => {
    const response = await api.get('/api/admin/payouts/pending');
    return response.data;
  },

  getPaidArchive: async () => {
    const response = await api.get('/api/admin/payouts/archive');
    return response.data;
  },

  confirmPayout: async (payoutId, comment = '') => {
    const response = await api.post('/api/admin/payouts/confirm', { payoutId, comment });
    return response.data;
  }
};
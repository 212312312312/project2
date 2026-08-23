import api from './api';

export const supportService = {
  getTickets: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/support/admin/tickets', { params });
  },

  getTicketMessages: (ticketId) => {
    return api.get(`/support/admin/tickets/${ticketId}/messages`);
  },

  startChat: (ticketId) => {
    return api.post(`/support/admin/tickets/${ticketId}/start`);
  },

  sendMessage: (ticketId, text) => {
    return api.post(`/support/admin/tickets/${ticketId}/reply`, { text });
  },

  closeTicket: (ticketId) => {
    return api.post(`/support/admin/tickets/${ticketId}/close`);
  }
};
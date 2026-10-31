import { call } from './client';
import { mock } from '../mock/mockApi';

/**
 * Every function matches the API contract (method + url) and falls back to src/mock.
 */
export const api = {
  // Auth
  login: (data) => call({ method: 'post', url: '/api/auth/login', data }, () => mock.login(data)),
  registerDonor: (data) => call({ method: 'post', url: '/api/donors/register', data }, () => mock.registerDonor(data)),
  registerHospital: (data) => call({ method: 'post', url: '/api/hospitals/register', data }, () => mock.registerHospital(data)),

  // Stats / charts
  getStats: () => call({ url: '/api/stats' }, () => mock.getStats()),
  getCharts: () => call({ url: '/api/stats', params: { detail: 1 } }, () => mock.getCharts()),

  // Donors
  getDonors: (params) => call({ url: '/api/donors', params }, () => mock.getDonors(params)),
  countDonors: (params) => call({ url: '/api/donors/count', params }, () => mock.countDonors(params)),
  getDonor: (id) => call({ url: `/api/donors/${id}` }, () => mock.getDonor(id)),
  updateDonor: (id, data) => call({ method: 'put', url: `/api/donors/${id}`, data }, () => mock.updateDonor(id, data)),
  changePassword: (id, data) => call({ method: 'put', url: `/api/donors/${id}/password`, data }, () => mock.changePassword(id, data)),
  getEligibility: (id) => call({ url: `/api/donors/${id}/eligibility` }, () => mock.getEligibility(id)),
  setAvailability: (id, available) => call({ method: 'put', url: `/api/donors/${id}/availability`, data: { available } }, () => mock.setAvailability(id, available)),
  setDonorActive: (id, active) => call({ method: 'put', url: `/api/donors/${id}/active`, data: { active } }, () => mock.setDonorActive(id, active)),
  getDonorRequests: (id) => call({ url: `/api/donors/${id}/requests` }, () => mock.getDonorRequests(id)),
  respond: (requestId, donorId, accept) => call({ method: 'post', url: `/api/requests/${requestId}/respond`, data: { donorId, accept } }, () => mock.respond(requestId, donorId, accept)),
  getDonorDonations: (id) => call({ url: `/api/donors/${id}/donations` }, () => mock.getDonorDonations(id)),
  getLeaderboard: () => call({ url: '/api/donors/leaderboard' }, () => mock.getLeaderboard()),

  // Requests
  getRequests: (params) => call({ url: '/api/requests', params }, () => mock.getRequests(params)),
  getRequest: (id) => call({ url: `/api/requests/${id}` }, () => mock.getRequest(id)),
  createRequest: (data) => call({ method: 'post', url: '/api/requests', data }, () => mock.createRequest(data)),
  getMatches: (id) => call({ url: `/api/requests/${id}/matches` }, () => mock.getMatches(id)),
  notify: (id, data) => call({ method: 'post', url: `/api/requests/${id}/notify`, data }, () => mock.notify(id, data)),
  fulfill: (id) => call({ method: 'post', url: `/api/requests/${id}/fulfill` }, () => mock.fulfill(id)),
  cancelRequest: (id) => call({ method: 'post', url: `/api/requests/${id}/cancel` }, () => mock.cancelRequest(id)),
  overrideStatus: (id, status) => call({ method: 'put', url: `/api/requests/${id}/status`, data: { status } }, () => mock.overrideStatus(id, status)),

  // Donations
  recordDonation: (data) => call({ method: 'post', url: '/api/donations', data }, () => mock.recordDonation(data)),

  // Inventory
  getInventory: (params) => call({ url: '/api/inventory', params }, () => mock.getInventory(params)),
  setThreshold: (data) => call({ method: 'put', url: '/api/inventory/threshold', data }, () => mock.setThreshold(data)),

  // Camps
  getCamps: (params) => call({ url: '/api/camps', params }, () => mock.getCamps(params)),
  getCamp: (id) => call({ url: `/api/camps/${id}` }, () => mock.getCamp(id)),
  createCamp: (data) => call({ method: 'post', url: '/api/camps', data }, () => mock.createCamp(data)),
  updateCamp: (id, data) => call({ method: 'put', url: `/api/camps/${id}`, data }, () => mock.updateCamp(id, data)),
  deleteCamp: (id) => call({ method: 'delete', url: `/api/camps/${id}` }, () => mock.deleteCamp(id)),
  registerForCamp: (id, donorId) => call({ method: 'post', url: `/api/camps/${id}/register`, data: { donorId } }, () => mock.registerForCamp(id, donorId)),

  // Hospitals
  getHospitals: (params) => call({ url: '/api/hospitals', params }, () => mock.getHospitals(params)),
  setHospitalStatus: (id, status) => call({ method: 'put', url: `/api/hospitals/${id}/status`, data: { status } }, () => mock.setHospitalStatus(id, status)),
  addHospital: (data) => call({ method: 'post', url: '/api/hospitals', data }, () => mock.addHospital(data)),

  // Transfers
  getTransfers: (params) => call({ url: '/api/transfers', params }, () => mock.getTransfers(params)),
  createTransfer: (data) => call({ method: 'post', url: '/api/transfers', data }, () => mock.createTransfer(data)),

  // Reports / audit
  getMonthlyReport: (params) => call({ url: '/api/reports/monthly', params }, () => mock.getMonthlyReport(params)),
  getAudit: (params) => call({ url: '/api/audit', params }, () => mock.getAudit(params)),
};

export const resetDemoData = () => mock.resetDemo();

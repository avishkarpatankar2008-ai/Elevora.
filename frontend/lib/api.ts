/**
 * ELEVORA API Client - Source A compatible contracts & proxy integration
 */

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = typeof data === 'object' && data !== null ? (data.detail || data.message || JSON.stringify(data)) : data;
    throw new Error(errorMsg || `API error: ${response.status}`);
  }
  return data;
}

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(res);
  },

  async post(endpoint: string, body?: any) {
    const isFormData = body instanceof FormData;
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(endpoint: string, body?: any) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(endpoint: string) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // Auth helper endpoints
  async login(credentials: { email: string; password: string }) {
    return this.post('/auth/login', credentials);
  },

  async signup(data: { email: string; password: string; name?: string }) {
    return this.post('/auth/register', data);
  },

  async logout() {
    return this.post('/auth/logout');
  },

  async getCurrentUser() {
    return this.get('/auth/me');
  },

  // Dashboard & Analytics
  async getDashboardStats() {
    return this.get('/dashboard/stats');
  },

  // History & Reports
  async getHistory(limit = 10, offset = 0) {
    return this.get(`/interviews/history?limit=${limit}&offset=${offset}`);
  },

  async getReport(id: string) {
    return this.get(`/interviews/${id}/report`);
  },

  // Interview Profiles & Config
  async getInterviewProfiles() {
    return this.get('/interview-profiles');
  },

  async createInterviewProfile(data: any) {
    return this.post('/interview-profiles', data);
  },

  async createInterview(data: any) {
    return this.post('/interviews', data);
  },

  async startInterview(id: string) {
    return this.post(`/interviews/${id}/start`);
  },

  async submitAnswer(id: string, data: any) {
    return this.post(`/interviews/${id}/answers`, data);
  },

  async endInterview(id: string) {
    return this.post(`/interviews/${id}/end`);
  },

  // Settings & Profile
  async getSettings() {
    return this.get('/settings');
  },

  async updateSettings(data: any) {
    return this.put('/settings', data);
  },
};

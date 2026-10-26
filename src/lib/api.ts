// API Client for Nexus AI Platform

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Who is calling comes from the HttpOnly session cookie the browser sends with every same-origin request.
class ApiClient {
  private getHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json' };
  }

  public async get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  public async post<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  public async put<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  public async patch<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  public async delete<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  public async getAnalyticsTrends(days: number = 30, agentId: string = 'all'): Promise<any> {
    return this.get<any>(`/api/v1/analytics/trends?days=${days}&agentId=${encodeURIComponent(agentId)}`);
  }

  // Scale AI Model Customization & Fine-Tuning
  public async getFineTuning(): Promise<{ jobs: any[]; catalog: any[] }> {
    return this.get<any>('/api/v1/fine-tuning');
  }

  public async createFineTuningJob(payload: any): Promise<any> {
    return this.post<any>('/api/v1/fine-tuning', payload);
  }

  public async deployFineTunedModel(jobId: string): Promise<any> {
    return this.post<any>(`/api/v1/fine-tuning/${jobId}/deploy`);
  }

  public async deleteFineTuningJob(jobId: string): Promise<any> {
    return this.delete<any>(`/api/v1/fine-tuning/${jobId}`);
  }

  // Scale AI Data Foundry & RLHF
  public async getDataFoundry(): Promise<{ datasets: any[] }> {
    return this.get<any>('/api/v1/data-foundry');
  }

  public async generateSyntheticData(payload: any): Promise<any> {
    return this.post<any>('/api/v1/data-foundry/generate', payload);
  }

  public async annotateSample(payload: any): Promise<any> {
    return this.post<any>('/api/v1/data-foundry/annotate', payload);
  }

  public async deleteSyntheticDataset(id: string): Promise<any> {
    return this.delete<any>(`/api/v1/data-foundry/${id}`);
  }

  // Scale SEAL Safety & Red-Teaming
  public async getRedTeaming(): Promise<{ runs: any[]; guardrails: any }> {
    return this.get<any>('/api/v1/red-teaming');
  }

  public async executeRedTeaming(payload: any): Promise<any> {
    return this.post<any>('/api/v1/red-teaming/execute', payload);
  }

  public async testAdversarialProbe(prompt: string): Promise<any> {
    return this.post<any>('/api/v1/red-teaming/test-probe', { prompt });
  }

  public async updateGuardrails(payload: any): Promise<any> {
    return this.patch<any>('/api/v1/red-teaming/guardrails', payload);
  }
}

export const api = new ApiClient();

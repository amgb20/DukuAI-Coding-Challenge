import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      // Redirect to login or show auth modal
    }
    return Promise.reject(error);
  }
);

export interface HealthResponse {
  status: string;
  message: string;
  version: string;
}

export interface ComparisonMetrics {
  mse: number;
  ssim: number;
  difference_percentage: number;
  changed_pixels: number;
  total_pixels: number;
}

export interface ComparisonVisualizations {
  heatmap?: string;
  overlay?: string;
  enhanced_diff?: string;
  raw_diff?: string;
  changed_objects?: string;
}

export interface ComparisonImageInfo {
  dimensions: string;
  processed: boolean;
  image1_name?: string;
  image2_name?: string;
}

export interface ComparisonResponse {
  id: string;
  difference_score: number;
  metrics: ComparisonMetrics;
  visualizations?: ComparisonVisualizations;
  image_info: ComparisonImageInfo;
  processing_time_ms: number;
  created_at: string;
  status: string;
}

export interface ComparisonStats {
  total_comparisons: number;
  average_difference_score: number;
  average_processing_time_ms: number;
  min_difference_score: number;
  max_difference_score: number;
}

export const apiService = {
  // Health check
  async healthCheck(): Promise<HealthResponse> {
    const response = await api.get('/health');
    return response.data;
  },

  // Image comparison operations
  async compareImages(
    image1: File, 
    image2: File, 
    image1Name?: string, 
    image2Name?: string, 
    includeVisualizations: boolean = true,
    sensitivity: number = 50,
    ignoreRegions: any[] = []
  ): Promise<ComparisonResponse> {
    const formData = new FormData();
    formData.append('image1', image1);
    formData.append('image2', image2);
    if (image1Name) formData.append('image1_name', image1Name);
    if (image2Name) formData.append('image2_name', image2Name);
    formData.append('include_visualizations', includeVisualizations.toString());
    formData.append('sensitivity', sensitivity.toString());
    
    // Add ignore regions as JSON string
    if (ignoreRegions.length > 0) {
      formData.append('ignore_regions', JSON.stringify(ignoreRegions));
    }

    const response = await api.post('/comparison', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getComparison(id: string): Promise<ComparisonResponse> {
    const response = await api.get(`/comparison/${id}`);
    return response.data;
  },

  async getComparisons(limit: number = 10, offset: number = 0): Promise<any[]> {
    const response = await api.get(`/comparisons?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getComparisonStats(): Promise<ComparisonStats> {
    const response = await api.get('/comparisons/stats');
    return response.data;
  },

  async deleteComparison(id: string): Promise<void> {
    await api.delete(`/comparison/${id}`);
  },

  // Generic API methods
  async get<T>(endpoint: string): Promise<T> {
    const response = await api.get(endpoint);
    return response.data;
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await api.post(endpoint, data);
    return response.data;
  },

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await api.put(endpoint, data);
    return response.data;
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await api.delete(endpoint);
    return response.data;
  },
};

export default apiService;

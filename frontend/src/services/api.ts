import axios from 'axios';
import { AnalyzeResponse, ImageMetadata, ModelInfo, EvaluationResultItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  async checkHealth() {
    const { data } = await apiClient.get('/health');
    return data;
  },

  async uploadImages(files: File[]): Promise<ImageMetadata[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const { data } = await apiClient.post<ImageMetadata[]>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getSampleImagery(): Promise<ImageMetadata[]> {
    const { data } = await apiClient.get<ImageMetadata[]>('/samples');
    return data;
  },

  async analyze(
    query: string,
    imageIds: string[],
    useAdaptedModel: boolean = false,
    parameters: Record<string, any> = {}
  ): Promise<AnalyzeResponse> {
    const { data } = await apiClient.post<AnalyzeResponse>('/analyze', {
      query,
      image_ids: imageIds,
      use_adapted_model: useAdaptedModel,
      parameters,
    });
    return data;
  },

  async getModels(): Promise<ModelInfo[]> {
    const { data } = await apiClient.get<ModelInfo[]>('/models');
    return data;
  },

  async getEvaluations(): Promise<EvaluationResultItem[]> {
    const { data } = await apiClient.get<EvaluationResultItem[]>('/evaluation');
    return data;
  },

  async getResult(resultId: string): Promise<AnalyzeResponse> {
    const { data } = await apiClient.get<AnalyzeResponse>(`/results/${resultId}`);
    return data;
  },

  getPdfReportUrl(resultId: string): string {
    return `${API_BASE_URL}/reports/${resultId}/pdf`;
  },

  getJsonReportUrl(resultId: string): string {
    return `${API_BASE_URL}/reports/${resultId}/json`;
  },

  getGeoJsonReportUrl(resultId: string): string {
    return `${API_BASE_URL}/reports/${resultId}/geojson`;
  },

  getArtifactUrl(relativePath: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath;
    return `${API_BASE_URL.replace('/api/v1', '')}${relativePath}`;
  }
};

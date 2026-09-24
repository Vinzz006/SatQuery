export type TaskType =
  | 'vqa'
  | 'captioning'
  | 'grounding'
  | 'change_detection'
  | 'change_vqa'
  | 'optical_sar_analysis'
  | 'spectral_index'
  | 'band_composite'
  | 'general_remote_sensing_analysis';

export type ModalityType = 'optical' | 'sar' | 'multispectral' | 'unknown';

export interface ImageMetadata {
  id: string;
  filename: string;
  original_name: string;
  file_path: string;
  width: number;
  height: number;
  bands: number;
  crs?: string | null;
  bounds?: { minx: number; miny: number; maxx: number; maxy: number } | null;
  resolution?: number[] | null;
  modality: ModalityType;
  file_size_bytes: number;
  has_geotiff_metadata: boolean;
  preview_url?: string | null;
}

export interface EvidenceArtifact {
  id: string;
  type: string; // 'change_map' | 'mask' | 'overlay' | 'bounding_box' | 'fused_composite' | 'spectral_index' | 'timelapse_animation'
  title: string;
  description: string;
  url: string;
  properties: Record<string, any>;
}

export interface ExecutionTraceStep {
  step: number;
  name: string;
  status: 'completed' | 'in_progress' | 'skipped' | 'failed';
  details: string;
  timestamp: string;
  duration_ms: number;
}

export interface AnalyzeResponse {
  id: string;
  task: TaskType;
  query: string;
  answer: string;
  confidence?: number | null;
  confidence_label: string;
  models: string[];
  images: ImageMetadata[];
  evidence: EvidenceArtifact[];
  trace: ExecutionTraceStep[];
  statistics: Record<string, any>;
  execution_time_ms: number;
  report_url?: string | null;
  geojson_url?: string | null;
  status: string;
  error?: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  capability: string;
  is_adapted: boolean;
  status: string;
  device: string;
  description: string;
}

export interface EvaluationResultItem {
  dataset: string;
  task: string;
  model: string;
  metric: string;
  value: string;
  date: string;
  notes?: string | null;
}

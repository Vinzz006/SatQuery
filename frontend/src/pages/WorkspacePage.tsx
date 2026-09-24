import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ImageMetadata, AnalyzeResponse } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { GeoMapViewer } from '../components/GeoMapViewer';
import { GroundedAnswerCard } from '../components/GroundedAnswerCard';
import { ExecutionTraceViewer } from '../components/ExecutionTraceViewer';
import { VoiceQueryInput } from '../components/VoiceQueryInput';
import { Terrain3DViewer } from '../components/Terrain3DViewer';
import {
  Upload,
  Play,
  Layers,
  AlertCircle,
  FileQuestion,
  Loader2,
  Globe,
  SplitSquareVertical,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Crosshair,
  Box,
  Film
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [sampleImagery, setSampleImagery] = useState<ImageMetadata[]>([]);
  const [query, setQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useAdaptedModel, setUseAdaptedModel] = useState<boolean>(true);

  // Phase 11, 12 & 13 Advanced Controls & View Mode
  const [viewMode, setViewMode] = useState<'slider' | 'map' | '3d'>('slider');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [thresholdFactor, setThresholdFactor] = useState<number>(1.2);
  const [sarFilterSize, setSarFilterSize] = useState<number>(5);
  const [roi, setRoi] = useState<[number, number, number, number] | null>(null);

  // Load sample assets on mount
  useEffect(() => {
    api.getSampleImagery()
      .then((samples) => {
        setSampleImagery(samples);
        // Default to Demo Scenario 4 (Bi-temporal Change) initially
        const t1 = samples.find(s => s.filename.includes('2024')) || samples[0];
        const t2 = samples.find(s => s.filename.includes('2026')) || samples[1];
        if (t1 && t2) {
          setImages([t1, t2]);
          setQuery('What changed between these two images?');
        } else if (samples.length > 0) {
          setImages([samples[0]]);
          setQuery('What type of land cover dominates this region?');
        }
      })
      .catch((err) => console.error("Failed to load sample imagery:", err));
  }, []);

  // Preset demo scenario handlers
  const loadDemoScenario = (scenario: number) => {
    setErrorMessage(null);
    setAnalysisResult(null);

    if (scenario === 1) {
      // Demo 1: Single Image VQA (Prefers true GeoTIFF)
      const opt = sampleImagery.find(s => s.filename === 'isro_sdsc_optical.tif') ||
                  sampleImagery.find(s => s.filename.includes('vqa_optical'));
      if (opt) setImages([opt]);
      setQuery('What type of land cover dominates this region?');
    } else if (scenario === 2) {
      // Demo 2: Text-Guided Grounding
      const ground = sampleImagery.find(s => s.filename.includes('grounding_fields'));
      if (ground) setImages([ground]);
      setQuery('Highlight the water body.');
    } else if (scenario === 3) {
      // Demo 3: Captioning
      const opt = sampleImagery.find(s => s.filename.includes('optical'));
      if (opt) setImages([opt]);
      setQuery('Describe this satellite image.');
    } else if (scenario === 4) {
      // Demo 4: Bi-temporal Change (Prefers true GeoTIFFs)
      const t1 = sampleImagery.find(s => s.filename === 'isro_sdsc_t1_2024.tif') ||
                 sampleImagery.find(s => s.filename.includes('2024_t1'));
      const t2 = sampleImagery.find(s => s.filename === 'isro_sdsc_t2_2026.tif') ||
                 sampleImagery.find(s => s.filename.includes('2026_t2'));
      if (t1 && t2) setImages([t1, t2]);
      setQuery('What changed between these two images?');
    } else if (scenario === 5) {
      // Demo 5: Optical + SAR Fusion (Prefers true GeoTIFFs)
      const opt = sampleImagery.find(s => s.filename === 'isro_sdsc_optical.tif') ||
                  sampleImagery.find(s => s.filename.includes('optical'));
      const sar = sampleImagery.find(s => s.filename === 'isro_sdsc_sar.tif') ||
                  sampleImagery.find(s => s.filename.includes('sar'));
      if (opt && sar) setImages([opt, sar]);
      setQuery('Use both images to identify built-up regions.');
    } else if (scenario === 6) {
      // Demo 6: Spectral NDVI & Vegetation Health (GeoTIFF)
      const opt = sampleImagery.find(s => s.filename === 'isro_sdsc_optical.tif') ||
                  sampleImagery.find(s => s.filename.includes('optical'));
      if (opt) setImages([opt]);
      setQuery('Compute NDVI vegetation index and canopy vigor across the spaceport.');
    } else if (scenario === 7) {
      // Demo 7: False-Color Infrared (CIR) Composite (GeoTIFF)
      const opt = sampleImagery.find(s => s.filename === 'isro_sdsc_optical.tif') ||
                  sampleImagery.find(s => s.filename.includes('optical'));
      if (opt) setImages([opt]);
      setQuery('Generate False-Color Infrared (CIR) composite to evaluate vegetation and water boundaries.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedMetas = await api.uploadImages(Array.from(e.target.files));
      setImages(uploadedMetas);
      if (uploadedMetas.length === 2) {
        setQuery('What changed between these two images?');
      } else {
        setQuery('What type of land cover dominates this region?');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Upload failed. Please check the file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setErrorMessage("Please select or upload at least one satellite image.");
      return;
    }
    if (!query.trim()) {
      setErrorMessage("Please enter an analytical question or task.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const imageIds = images.map(img => img.filename);
      const res = await api.analyze(
        query,
        imageIds,
        useAdaptedModel,
        {
          threshold_factor: thresholdFactor,
          sar_filter_size: sarFilterSize,
          ...(roi ? { roi } : {})
        }
      );
      setAnalysisResult(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Analysis failed. Please inspect backend logs.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header bar with demo presets */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-cyan-900/30">
        <div>
          <h1 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Interactive Remote-Sensing Analysis Workspace
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Automatic multimodal routing across VQA, Captioning, Grounding, Change AI, and Optical+SAR Fusion.
          </p>
        </div>

        {/* Demo Quick Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 mr-1 hidden sm:inline">ISRO Demos:</span>
          <button
            onClick={() => loadDemoScenario(1)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 1: VQA (GeoTIFF)
          </button>
          <button
            onClick={() => loadDemoScenario(2)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 2: Grounding
          </button>
          <button
            onClick={() => loadDemoScenario(3)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 3: Caption
          </button>
          <button
            onClick={() => loadDemoScenario(4)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all font-semibold"
          >
            Demo 4: Change (GeoTIFF)
          </button>
          <button
            onClick={() => loadDemoScenario(5)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 5: Opt+SAR (GeoTIFF)
          </button>
          <button
            onClick={() => loadDemoScenario(6)}
            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 hover:border-emerald-600 transition-all font-semibold"
          >
            Demo 6: Spectral (NDVI)
          </button>
          <button
            onClick={() => loadDemoScenario(7)}
            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 hover:border-rose-600 transition-all font-semibold"
          >
            Demo 7: False-Color (CIR)
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (Upload & Query) + Right Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & Query Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Image Ingestion Box */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-semibold text-slate-200 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                Imagery Ingestion ({images.length}/2 loaded)
              </span>
              <label className="cursor-pointer text-xs font-mono text-cyan-400 hover:text-cyan-300 underline">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Drag & Drop Upload Zone */}
            <label className="border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 animate-bounce" />
              <div className="text-center font-mono text-xs text-slate-300">
                <span>Drop GeoTIFF (.tif) or Benchmark imagery</span>
                <p className="text-[10px] text-slate-500 mt-0.5">EPSG:4326 geospatial metadata preserved</p>
              </div>
              <input
                type="file"
                multiple
                accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Loaded Image Badges */}
            {images.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {images.map((img, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 truncate font-sans text-xs">{img.original_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {img.has_geotiff_metadata && (
                        <span className="px-1 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[9px] border border-indigo-800">
                          GeoTIFF
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 text-[10px] border border-cyan-900">
                        {img.modality.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {img.width}x{img.height}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Natural Language Query Box */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-semibold text-slate-200 flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4 text-cyan-400" />
                Natural Language Mission Query
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">Voice Input:</span>
                <VoiceQueryInput onTranscript={(speech) => setQuery(speech)} disabled={isAnalyzing} />
              </div>
            </div>

            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Compute NDVI vegetation index or What changed between these two images?"
              className="w-full rounded-lg bg-slate-950/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />

            {/* Quick Prompt Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400">Quick Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Generate False-Color Infrared (CIR) composite",
                  "Synthesize Agriculture & Soil Moisture composite",
                  "Compute NDVI vegetation index and canopy vigor",
                  "Map surface water and wetlands via NDWI",
                  "Evaluate built-up impervious index (NDBI)",
                  "What type of land cover dominates this region?",
                  "Highlight the water body.",
                  "What changed between these two images?",
                  "Has the built-up area increased?",
                  "Use both images to identify built-up regions."
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(prompt)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-800 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Adapted Model Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={useAdaptedModel}
                  onChange={(e) => setUseAdaptedModel(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Neural Checkpoint Active (EuroSAT Head)
                </span>
              </label>
            </div>

            {/* Advanced Geospatial Parameters Accordion */}
            <div className="border-t border-slate-800 pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Advanced Geospatial Parameters
                </span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-3 text-xs font-mono">
                  {/* Sensitivity Factor Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Change Threshold Factor:</span>
                      <span className="text-cyan-400 font-bold">{thresholdFactor.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.8"
                      step="0.05"
                      value={thresholdFactor}
                      onChange={(e) => setThresholdFactor(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>High Sensitivity (0.8x)</span>
                      <span>Conservative (1.8x)</span>
                    </div>
                  </div>

                  {/* SAR Filter Kernel */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>SAR Lee Filter Kernel:</span>
                      <span className="text-cyan-400 font-bold">{sarFilterSize}x{sarFilterSize}</span>
                    </div>
                    <div className="flex gap-2">
                      {[3, 5, 7].map((k) => (
                        <button
                          key={k}
                          onClick={() => setSarFilterSize(k)}
                          className={`flex-1 py-1 rounded text-xs border ${
                            sarFilterSize === k
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {k}x{k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ROI Active Banner */}
            {roi && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-xs font-mono text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>ROI Active: [{roi.join(', ')}]</span>
                </span>
                <button
                  onClick={() => setRoi(null)}
                  className="text-slate-400 hover:text-red-400 underline text-[11px]"
                >
                  Clear ROI
                </button>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || images.length === 0}
              className={`w-full py-3 rounded-lg font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAnalyzing || images.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Routing & Synthesizing Multi-Specialist AI...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute Analysis & Trace
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Right Column: Visual HUD & Results (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* View Mode Switcher Header: Split Slider vs Leaflet GIS Map */}
          <div className="glass-panel px-4 py-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              VISUALIZATION ENGINE
            </span>
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-all ${
                  viewMode === 'slider' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                Split Slider View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-all ${
                  viewMode === 'map' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Leaflet GIS Map
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-all ${
                  viewMode === '3d' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                3D Orbital Mesh
              </button>
            </div>
          </div>

          {/* Dynamic View: Split Slider vs Leaflet GIS Map vs 3D Orbital Mesh */}
          {viewMode === 'slider' ? (
            <SplitImageViewer
              images={images}
              evidence={analysisResult?.evidence || []}
            />
          ) : viewMode === 'map' ? (
            <GeoMapViewer
              images={images}
              evidence={analysisResult?.evidence || []}
              roi={roi}
              onRoiChange={setRoi}
            />
          ) : (
            <Terrain3DViewer
              images={images}
              evidence={analysisResult?.evidence || []}
            />
          )}

          {/* Bi-Temporal Time-Series Timelapse Animation Card if present */}
          {analysisResult?.evidence?.some(e => e.type === 'timelapse_animation') && (
            <div className="glass-panel p-4 rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono uppercase font-semibold text-amber-300 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-amber-400 animate-pulse" />
                  Bi-Temporal Time-Series Morph Timelapse
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Looping Temporal Transition
                </span>
              </div>
              {(() => {
                const tl = analysisResult.evidence.find(e => e.type === 'timelapse_animation');
                if (!tl) return null;
                return (
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center">
                    <img
                      src={api.getArtifactUrl(tl.url)}
                      alt={tl.title}
                      className="max-h-[380px] w-full object-contain"
                    />
                    <div className="w-full px-3 py-2 bg-slate-900/90 text-xs font-mono text-slate-300 flex items-center justify-between border-t border-slate-800">
                      <span>{tl.description}</span>
                      <span className="text-cyan-400 font-bold">400ms / Epoch Hold</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Grounded Result Card */}
          {analysisResult && (
            <GroundedAnswerCard analysis={analysisResult} />
          )}

          {/* Observable Execution Trace */}
          {analysisResult && (
            <ExecutionTraceViewer
              trace={analysisResult.trace}
              totalTimeMs={analysisResult.execution_time_ms}
            />
          )}

        </div>

      </div>

    </div>
  );
};

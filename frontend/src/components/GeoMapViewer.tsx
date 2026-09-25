import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { ImageMetadata, EvidenceArtifact, DetectedFeature } from '../types';
import { api } from '../services/api';
import { MapPin, Globe, Navigation, Eye, Sliders, Crop, X, Crosshair, Layers } from 'lucide-react';

interface Props {
  images: ImageMetadata[];
  evidence?: EvidenceArtifact[];
  detectedFeatures?: DetectedFeature[];
  selectedFeatureId?: string | null;
  onSelectFeature?: (feature: DetectedFeature) => void;
  roi?: [number, number, number, number] | null;
  onRoiChange?: (roi: [number, number, number, number] | null) => void;
}

export const GeoMapViewer: React.FC<Props> = ({
  images,
  evidence = [],
  detectedFeatures = [],
  selectedFeatureId,
  onSelectFeature,
  roi,
  onRoiChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const evidenceOverlayRef = useRef<L.ImageOverlay | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const featureLayersMapRef = useRef<Map<string, { poly?: L.Polygon; marker?: L.CircleMarker }>>(new Map());
  const roiRectRef = useRef<L.Rectangle | null>(null);
  const tempRectRef = useRef<L.Rectangle | null>(null);
  const drawingStartRef = useRef<L.LatLng | null>(null);

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'dark' | 'osm'>('satellite');
  const [evidenceOpacity, setEvidenceOpacity] = useState<number>(85);
  const [showEvidence, setShowEvidence] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState<number>(0);
  const [isDrawingRoi, setIsDrawingRoi] = useState<boolean>(false);
  const [roiActive, setRoiActive] = useState<boolean>(false);

  const primaryImage = images.length > 0 ? images[0] : null;
  const activeEvidence = evidence.length > 0 ? evidence[activeEvidenceIndex] : null;

  // Determine geospatial bounds
  const getGeoBounds = (img: ImageMetadata | null): L.LatLngBoundsExpression => {
    if (img && img.bounds) {
      return [
        [img.bounds.miny, img.bounds.minx],
        [img.bounds.maxy, img.bounds.maxx]
      ];
    }
    // Default to ISRO SDSC SHAR, Sriharikota, India
    return [
      [13.7000, 80.2000],
      [13.7500, 80.2500]
    ];
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialBounds = getGeoBounds(primaryImage);
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).fitBounds(initialBounds);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Track cursor coordinates
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      map.on('mouseout', () => {
        setCursorCoords(null);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer based on baseMapType
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let maxZoom = 19;

    if (baseMapType === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (baseMapType === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    L.tileLayer(tileUrl, { maxZoom }).addTo(map);
  }, [baseMapType]);

  // Update Raster Imagery Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !primaryImage) return;

    const bounds = getGeoBounds(primaryImage);

    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    const imgUrl = api.getArtifactUrl(primaryImage.preview_url || '');
    if (imgUrl) {
      const overlay = L.imageOverlay(imgUrl, bounds, { opacity: 0.95 }).addTo(map);
      imageOverlayRef.current = overlay;
      map.fitBounds(bounds);
    }
  }, [primaryImage]);

  // Update Evidence Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (evidenceOverlayRef.current) {
      map.removeLayer(evidenceOverlayRef.current);
      evidenceOverlayRef.current = null;
    }

    if (activeEvidence && showEvidence && primaryImage) {
      const bounds = getGeoBounds(primaryImage);
      const evUrl = api.getArtifactUrl(activeEvidence.url);
      if (evUrl) {
        const evOverlay = L.imageOverlay(evUrl, bounds, {
          opacity: evidenceOpacity / 100,
        }).addTo(map);
        evidenceOverlayRef.current = evOverlay;
      }
    }
  }, [activeEvidence, showEvidence, evidenceOpacity, primaryImage]);

  // Render and update Detected Vector Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!vectorLayerGroupRef.current) {
      vectorLayerGroupRef.current = L.layerGroup().addTo(map);
    }
    const layerGroup = vectorLayerGroupRef.current;
    layerGroup.clearLayers();
    featureLayersMapRef.current.clear();

    if (!showVectors || !detectedFeatures || detectedFeatures.length === 0) return;

    detectedFeatures.forEach((feat) => {
      let poly: L.Polygon | undefined;
      if (feat.polygon_coords && feat.polygon_coords.length > 2) {
        // GeoJSON coords are [lon, lat] -> Leaflet requires [lat, lon]
        const latLngs = feat.polygon_coords.map((pt) => [pt[1], pt[0]] as [number, number]);
        poly = L.polygon(latLngs, {
          color: '#06b6d4',
          weight: 2,
          fillColor: '#0891b2',
          fillOpacity: 0.35
        });

        poly.bindTooltip(
          `<b>${feat.label}</b><br/><span style="color:#38bdf8;">Area: ${feat.area_hectares} ha</span>`,
          { sticky: true }
        );

        const popupHtml = `
          <div style="font-family: monospace; font-size: 11px; padding: 4px; line-height: 1.5;">
            <div style="color: #06b6d4; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
              🛰️ ${feat.label}
            </div>
            <div><b>Area:</b> ${feat.area_hectares} ha (${feat.area_km2} km²)</div>
            <div><b>Perimeter:</b> ${feat.perimeter_m} m</div>
            <div><b>Centroid:</b> ${feat.centroid ? `${feat.centroid[0]}° N, ${feat.centroid[1]}° E` : 'N/A'}</div>
            <div><b>Detection Score:</b> ${Math.round((feat.score || 0.85) * 100)}%</div>
          </div>
        `;
        poly.bindPopup(popupHtml);

        poly.on('mouseover', () => {
          poly?.setStyle({ weight: 3, fillOpacity: 0.55, color: '#38bdf8' });
        });
        poly.on('mouseout', () => {
          poly?.setStyle({ weight: 2, fillOpacity: 0.35, color: '#06b6d4' });
        });
        poly.on('click', () => {
          onSelectFeature?.(feat);
        });

        layerGroup.addLayer(poly);
      }

      let marker: L.CircleMarker | undefined;
      if (feat.centroid) {
        marker = L.circleMarker([feat.centroid[0], feat.centroid[1]], {
          radius: 5,
          color: '#38bdf8',
          fillColor: '#06b6d4',
          fillOpacity: 0.9,
          weight: 2
        });
        marker.bindTooltip(`Centroid: ${feat.label}`, { direction: 'top', offset: [0, -6] });
        marker.on('click', () => {
          onSelectFeature?.(feat);
          if (poly) poly.openPopup();
        });
        layerGroup.addLayer(marker);
      }

      featureLayersMapRef.current.set(feat.id, { poly, marker });
    });
  }, [detectedFeatures, showVectors, onSelectFeature]);

  // Pan to selected feature when selected from table or parent
  useEffect(() => {
    if (!selectedFeatureId || !mapInstanceRef.current) return;
    const entry = featureLayersMapRef.current.get(selectedFeatureId);
    if (entry) {
      if (entry.poly) {
        mapInstanceRef.current.fitBounds(entry.poly.getBounds(), { maxZoom: 17, padding: [40, 40] });
        entry.poly.openPopup();
      } else if (entry.marker) {
        mapInstanceRef.current.setView(entry.marker.getLatLng(), 17);
      }
    }
  }, [selectedFeatureId]);

  // Handle ROI Interactive Drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRoi) return;

      if (!drawingStartRef.current) {
        // Point 1: Set corner A
        drawingStartRef.current = e.latlng;
      } else {
        // Point 2: Set corner B and finalize ROI
        const start = drawingStartRef.current;
        const end = e.latlng;
        const bounds = L.latLngBounds(start, end);

        // Remove previous ROI rect
        if (roiRectRef.current) {
          map.removeLayer(roiRectRef.current);
        }
        if (tempRectRef.current) {
          map.removeLayer(tempRectRef.current);
          tempRectRef.current = null;
        }

        // Draw finalized glowing rectangle
        const rect = L.rectangle(bounds, {
          color: '#06b6d4',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#0891b2',
          fillOpacity: 0.2
        }).addTo(map);
        roiRectRef.current = rect;

        // Calculate normalized bounding box [minx, miny, maxx, maxy]
        const imgBounds = primaryImage?.bounds || { minx: 80.20, miny: 13.70, maxx: 80.25, maxy: 13.75 };
        const latMin = Math.min(start.lat, end.lat);
        const latMax = Math.max(start.lat, end.lat);
        const lngMin = Math.min(start.lng, end.lng);
        const lngMax = Math.max(start.lng, end.lng);

        const normX0 = Math.max(0, Math.min(1, (lngMin - imgBounds.minx) / (imgBounds.maxx - imgBounds.minx)));
        const normX1 = Math.max(0, Math.min(1, (lngMax - imgBounds.minx) / (imgBounds.maxx - imgBounds.minx)));
        const normY0 = Math.max(0, Math.min(1, (imgBounds.maxy - latMax) / (imgBounds.maxy - imgBounds.miny)));
        const normY1 = Math.max(0, Math.min(1, (imgBounds.maxy - latMin) / (imgBounds.maxy - imgBounds.miny)));

        const roiTuple: [number, number, number, number] = [
          parseFloat(normX0.toFixed(4)),
          parseFloat(normY0.toFixed(4)),
          parseFloat(normX1.toFixed(4)),
          parseFloat(normY1.toFixed(4))
        ];

        onRoiChange?.(roiTuple);
        setRoiActive(true);
        setIsDrawingRoi(false);
        drawingStartRef.current = null;
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRoi || !drawingStartRef.current) return;

      const bounds = L.latLngBounds(drawingStartRef.current, e.latlng);
      if (tempRectRef.current) {
        tempRectRef.current.setBounds(bounds);
      } else {
        tempRectRef.current = L.rectangle(bounds, {
          color: '#f59e0b',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#f59e0b',
          fillOpacity: 0.15
        }).addTo(map);
      }
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);

    // Change cursor style when drawing ROI
    if (isDrawingRoi) {
      L.DomUtil.addClass(map.getContainer(), 'cursor-crosshair');
    } else {
      L.DomUtil.removeClass(map.getContainer(), 'cursor-crosshair');
    }

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [isDrawingRoi, primaryImage, onRoiChange]);

  const clearRoi = () => {
    const map = mapInstanceRef.current;
    if (map && roiRectRef.current) {
      map.removeLayer(roiRectRef.current);
      roiRectRef.current = null;
    }
    if (map && tempRectRef.current) {
      map.removeLayer(tempRectRef.current);
      tempRectRef.current = null;
    }
    drawingStartRef.current = null;
    setIsDrawingRoi(false);
    setRoiActive(false);
    onRoiChange?.(null);
  };

  const fitToRaster = () => {
    if (mapInstanceRef.current && primaryImage) {
      mapInstanceRef.current.fitBounds(getGeoBounds(primaryImage));
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/30 flex flex-col">
      
      {/* HUD Header Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold uppercase">LEAFLET GIS MAP ENGINE</span>
          <span className="text-slate-400">|</span>
          <span className="text-cyan-300">
            {primaryImage?.crs || "EPSG:4326 (WGS84 Reference)"}
          </span>
        </div>

        {/* Controls: ROI Tool, Basemap, Fit */}
        <div className="flex items-center gap-2">
          {/* ROI Drawing Button */}
          {!roiActive ? (
            <button
              onClick={() => {
                setIsDrawingRoi(!isDrawingRoi);
                drawingStartRef.current = null;
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
                isDrawingRoi
                  ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-slate-800'
              }`}
              title="Click two corners on the map to define a Region of Interest for localized analysis"
            >
              <Crop className="w-3 h-3 text-cyan-400" />
              {isDrawingRoi ? 'Click 2 Points on Map' : 'Select Spatial ROI'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[11px] text-cyan-300">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>ROI Active</span>
              <button
                onClick={clearRoi}
                className="hover:text-red-400 ml-1 p-0.5"
                title="Clear selected ROI"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Vectors Toggle Button */}
          {detectedFeatures && detectedFeatures.length > 0 && (
            <button
              onClick={() => setShowVectors(!showVectors)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                showVectors
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/10'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
              title="Toggle Vector Polygons & Telemetry Layer"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>Vectors ({detectedFeatures.length})</span>
            </button>
          )}

          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setBaseMapType('satellite')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                baseMapType === 'satellite' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBaseMapType('dark')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                baseMapType === 'dark' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark GIS
            </button>
            <button
              onClick={() => setBaseMapType('osm')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                baseMapType === 'osm' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Street Map
            </button>
          </div>

          <button
            onClick={fitToRaster}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-[11px]"
            title="Recenter Map on Raster Footprint"
          >
            <Navigation className="w-3 h-3" />
            Fit Extent
          </button>
        </div>
      </div>

      {/* Layer selector bar if evidence available */}
      {evidence.length > 0 && (
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-mono">Map Overlay Layer:</span>
            <div className="flex items-center gap-1.5">
              {evidence.map((art, idx) => (
                <button
                  key={art.id}
                  onClick={() => {
                    setActiveEvidenceIndex(idx);
                    setShowEvidence(true);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                    activeEvidenceIndex === idx && showEvidence
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {art.title}
                </button>
              ))}
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  !showEvidence ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {showEvidence ? 'Hide Overlay' : 'Show Overlay'}
              </button>
            </div>
          </div>

          {showEvidence && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <Sliders className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Opacity: {evidenceOpacity}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={evidenceOpacity}
                onChange={(e) => setEvidenceOpacity(Number(e.target.value))}
                className="w-20 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Main Leaflet Map Container */}
      <div className="relative h-[480px] w-full bg-slate-950">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Live Cursor Latitude/Longitude HUD */}
        <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-3 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-slate-400 font-semibold">GEOSPATIAL CURSOR:</span>
          </div>
          {cursorCoords ? (
            <div className="flex items-center gap-2 font-bold">
              <span>LAT: {cursorCoords.lat.toFixed(5)}°</span>
              <span className="text-slate-600">|</span>
              <span>LON: {cursorCoords.lng.toFixed(5)}°</span>
            </div>
          ) : (
            <span className="text-slate-500">Hover over map for coordinates</span>
          )}
        </div>

        {/* ISRO Georeference Anchor Tag */}
        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded bg-slate-950/85 border border-cyan-800/60 text-[10px] font-mono text-cyan-300 backdrop-blur-sm">
          <span>TARGET: ISRO SDSC SHAR (SRIHARIKOTA, INDIA)</span>
        </div>

        {/* ROI Instruction Banner if Drawing */}
        {isDrawingRoi && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded bg-amber-950/90 border border-amber-500/60 text-xs font-mono text-amber-300 backdrop-blur-sm shadow-lg animate-bounce">
            Click 1st corner, then 2nd corner to bound Region of Interest
          </div>
        )}
      </div>

    </div>
  );
};

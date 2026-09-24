import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ImageMetadata, EvidenceArtifact } from '../types';
import { api } from '../services/api';
import { MapPin, Layers, Sliders, Globe, Navigation, Eye } from 'lucide-react';

interface Props {
  images: ImageMetadata[];
  evidence?: EvidenceArtifact[];
}

export const GeoMapViewer: React.FC<Props> = ({ images, evidence = [] }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const evidenceOverlayRef = useRef<L.ImageOverlay | null>(null);

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'dark' | 'osm'>('satellite');
  const [evidenceOpacity, setEvidenceOpacity] = useState<number>(85);
  const [showEvidence, setShowEvidence] = useState<boolean>(true);
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState<number>(0);

  const primaryImage = images.length > 0 ? images[0] : null;
  const activeEvidence = evidence.length > 0 ? evidence[activeEvidenceIndex] : null;

  // Determine geospatial bounds
  // If image has real GeoTIFF bounds: [[miny, minx], [maxy, maxx]]
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

    // Remove old tile layers
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

    // Remove existing image overlay
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

  // Update Evidence Overlay (Change Map / Mask / Overlay)
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

        {/* Controls: Basemap, Fit */}
        <div className="flex items-center gap-2">
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
      </div>

    </div>
  );
};

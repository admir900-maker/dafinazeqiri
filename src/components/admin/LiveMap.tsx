'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Country code → approximate [lat, lng]
const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [39, -98], CA: [56, -96], MX: [23, -102], BR: [-14, -51], AR: [-34, -64],
  GB: [54, -2], DE: [51, 10], FR: [46, 2], IT: [42, 12], ES: [40, -4],
  NL: [52, 5], BE: [50, 4], AT: [47, 14], CH: [47, 8], SE: [62, 15],
  NO: [60, 8], DK: [56, 10], FI: [64, 26], PL: [52, 20], CZ: [50, 15],
  PT: [39, -8], IE: [53, -8], GR: [39, 22], HR: [45, 16], RO: [46, 25],
  BG: [43, 25], HU: [47, 20], SK: [49, 19], SI: [46, 15], RS: [44, 21],
  BA: [44, 18], ME: [42, 19], MK: [41, 22], AL: [41, 20], XK: [42, 21],
  TR: [39, 35], RU: [60, 100], UA: [49, 32], SA: [24, 45], AE: [24, 54],
  IL: [31, 35], EG: [27, 30], ZA: [29, 24], NG: [10, 8], KE: [-1, 38],
  IN: [21, 78], CN: [35, 105], JP: [36, 138], KR: [36, 128], AU: [-25, 134],
  NZ: [-41, 174], TH: [15, 101], VN: [16, 108], ID: [-5, 120], PH: [13, 122],
  SG: [1, 104], MY: [4, 102], PK: [30, 70], BD: [24, 90], LK: [7, 81],
  CO: [4, -72], CL: [-35, -71], PE: [-10, -76], VE: [7, -66], EC: [-2, -78],
  QA: [25, 51], KW: [29, 48], BH: [26, 51], OM: [21, 57], JO: [31, 36],
  LB: [34, 36], LT: [56, 24], LV: [57, 25], EE: [59, 26], CY: [35, 33],
  LU: [50, 6], MT: [36, 14], IS: [65, -18],
};

const SERVER_LOC: L.LatLngExpression = [42.6, 21.0];

// Region presets: [south, west, north, east]
const MAP_REGIONS: Record<string, { label: string; bounds: L.LatLngBoundsExpression; flag: string }> = {
  world:          { label: 'World',     bounds: [[-60, -160], [75, 180]],   flag: '🌍' },
  europe:         { label: 'Europe',    bounds: [[34, -12], [72, 42]],      flag: '🇪🇺' },
  eastern_europe: { label: 'E. Europe', bounds: [[36, 12], [62, 42]],      flag: '🏔️' },
  balkans:        { label: 'Balkans',   bounds: [[35, 13], [48, 30]],       flag: '⛰️' },
  americas:       { label: 'Americas',  bounds: [[-56, -130], [72, -30]],   flag: '🌎' },
  asia:           { label: 'Asia',      bounds: [[-10, 60], [55, 150]],     flag: '🌏' },
  middle_east:    { label: 'Mid East',  bounds: [[12, 25], [42, 65]],       flag: '🕌' },
  africa:         { label: 'Africa',    bounds: [[-38, -20], [38, 55]],     flag: '🌍' },
};

interface LiveMapProps {
  liveData: any;
  mapMode: 'live' | 'historical';
  mapZoom: string;
  onCountryClick?: (countryCode: string) => void;
}

// Create curved polyline points between two latlngs
function curvedLatLngs(from: L.LatLng, to: L.LatLng, segments = 30): L.LatLng[] {
  const points: L.LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = from.lat * (1 - t) + to.lat * t;
    const lng = from.lng * (1 - t) + to.lng * t;
    // Arc offset: quadratic bulge perpendicular
    const dist = from.distanceTo(to) / 1000; // km
    const arcHeight = Math.min(dist * 0.003, 15); // caps at 15 degrees
    const offset = arcHeight * Math.sin(Math.PI * t);
    points.push(L.latLng(lat + offset, lng));
  }
  return points;
}

// SVG icon factory for country dots
function countryDotIcon(color: string, size: number, pulse: boolean): L.DivIcon {
  const pulseHtml = pulse ? `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size * 3}px;height:${size * 3}px;border-radius:50%;border:1.5px solid ${color};animation:mapPulse 2.5s ease-out infinite;opacity:0"></div>
  ` : '';
  return L.divIcon({
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: `
      <div style="position:relative;width:${size * 2}px;height:${size * 2}px">
        ${pulseHtml}
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size * 2}px;height:${size * 2}px;border-radius:50%;background:${color};opacity:0.15"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}80"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size * 0.4}px;height:${size * 0.4}px;border-radius:50%;background:#fff;opacity:0.7"></div>
      </div>
    `,
  });
}

function serverIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div style="position:relative;width:32px;height:32px">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.35) 0%,rgba(249,115,22,0) 70%)"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;border-radius:50%;border:1.5px solid rgba(249,115,22,0.4);animation:mapPulse 2s ease-out infinite"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;border-radius:50%;border:1px solid rgba(249,115,22,0.25);animation:mapPulse 2s ease-out 0.7s infinite"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#f97316;box-shadow:0 0 12px #f9731680"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:5px;height:5px;border-radius:50%;background:#fff;opacity:0.9"></div>
      </div>
    `,
  });
}

// Inject CSS animation once
let styleInjected = false;
function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes mapPulse {
      0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.6; }
      100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
    }
    .leaflet-container { background: #0a0a12 !important; }
    .leaflet-control-zoom a {
      background: #1a1a2e !important;
      color: #94a3b8 !important;
      border-color: #2a2a4a !important;
    }
    .leaflet-control-zoom a:hover {
      background: #252545 !important;
      color: #e2e8f0 !important;
    }
    .leaflet-control-attribution { display: none !important; }
    .country-tooltip {
      background: #0f172aee !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      font-size: 11px !important;
      padding: 6px 10px !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
    }
    .country-tooltip .leaflet-tooltip-arrow { display: none; }
    .server-tooltip {
      background: #1c1917ee !important;
      border: 1px solid #f97316 !important;
      border-radius: 8px !important;
      color: #f97316 !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      padding: 6px 10px !important;
      box-shadow: 0 8px 24px rgba(249,115,22,0.2) !important;
    }
    .server-tooltip .leaflet-tooltip-arrow { display: none; }
  `;
  document.head.appendChild(style);
}

export default function LiveMap({ liveData, mapMode, mapZoom, onCountryClick }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  const countries = useMemo(() => liveData?.countries || [], [liveData]);
  const maxCount = useMemo(() => Math.max(...countries.map((c: any) => c.count), 1), [countries]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    injectStyles();

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true,
    });

    // Dark tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Position zoom control
    map.zoomControl.setPosition('topright');

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle region zoom changes
  useEffect(() => {
    if (!mapRef.current) return;
    const region = MAP_REGIONS[mapZoom] || MAP_REGIONS.world;
    mapRef.current.flyToBounds(region.bounds, {
      padding: [20, 20],
      duration: 0.8,
      maxZoom: mapZoom === 'world' ? 3 : 12,
    });
  }, [mapZoom]);

  // Update markers and arcs when data changes
  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    const layers = layersRef.current;
    layers.clearLayers();

    const serverLatLng = L.latLng(SERVER_LOC as [number, number]);

    // Server marker
    const sMarker = L.marker(SERVER_LOC, { icon: serverIcon(), zIndexOffset: 1000 });
    sMarker.bindTooltip(
      `<div style="text-align:center"><strong>SERVER</strong><br/><span style="color:#a3a3a3;font-weight:400">Kosovo</span></div>`,
      { className: 'server-tooltip', direction: 'top', offset: [0, -20], permanent: false }
    );
    layers.addLayer(sMarker);

    // Country connections
    countries.forEach((c: any) => {
      const coords = COUNTRY_COORDS[c._id];
      if (!coords) return;
      const countryLatLng = L.latLng(coords[0], coords[1]);
      const intensity = Math.min(1, c.count / maxCount);
      const isBuyer = c.purchases > 0;
      const color = isBuyer ? '#34d399' : '#60a5fa';
      const arcColor = isBuyer ? '#22c55e' : '#3b82f6';

      // Curved arc
      const arcPoints = curvedLatLngs(countryLatLng, serverLatLng);
      const arc = L.polyline(arcPoints, {
        color: arcColor,
        weight: Math.max(1, intensity * 3),
        opacity: 0.4 + intensity * 0.3,
        dashArray: mapMode === 'live' ? '8 6' : undefined,
        smoothFactor: 1,
      });
      // Glow line behind
      const glow = L.polyline(arcPoints, {
        color: arcColor,
        weight: Math.max(4, intensity * 10),
        opacity: 0.06,
        smoothFactor: 1,
      });
      layers.addLayer(glow);
      layers.addLayer(arc);

      // Animated dot along arc in live mode
      if (mapMode === 'live' && arcPoints.length > 2) {
        const dotMarker = L.circleMarker(arcPoints[0], {
          radius: 3,
          fillColor: color,
          fillOpacity: 0.9,
          stroke: false,
        });
        layers.addLayer(dotMarker);
        let idx = 0;
        const speed = 80 + Math.random() * 60;
        const interval = setInterval(() => {
          idx = (idx + 1) % arcPoints.length;
          dotMarker.setLatLng(arcPoints[idx]);
        }, speed);
        // Store interval ID on marker for cleanup
        (dotMarker as any)._animInterval = interval;
      }

      // Country marker
      const dotSize = 8 + intensity * 8;
      const marker = L.marker(coords, {
        icon: countryDotIcon(color, dotSize, mapMode === 'live'),
        zIndexOffset: 500,
      });

      const tooltipContent = `
        <div>
          <strong>${c.country || c._id}</strong>
          <div style="color:#94a3b8;margin-top:2px">${c.count} visit${c.count !== 1 ? 's' : ''}${isBuyer ? ` · <span style="color:#34d399">${c.purchases} purchase${c.purchases !== 1 ? 's' : ''}</span>` : ''}</div>
          ${c.uniqueUsers ? `<div style="color:#64748b;margin-top:1px">${c.uniqueUsers} unique user${c.uniqueUsers !== 1 ? 's' : ''}</div>` : ''}
        </div>
      `;
      marker.bindTooltip(tooltipContent, {
        className: 'country-tooltip',
        direction: 'top',
        offset: [0, -dotSize],
      });

      if (onCountryClick) {
        marker.on('click', () => onCountryClick(c._id));
      }

      layers.addLayer(marker);
    });

    // Cleanup animation intervals
    return () => {
      layers.eachLayer((layer: any) => {
        if (layer._animInterval) clearInterval(layer._animInterval);
      });
    };
  }, [countries, maxCount, mapMode, onCountryClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 420 }} />;
}

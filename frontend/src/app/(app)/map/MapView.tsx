'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface NodeData { id: string; name: string; address?: string; geom?: any; status?: string; capacity?: number; installed_splitters?: number; plan_mbps?: number; ont_serial?: string; vlan?: number; splitter_ratio?: string; type?: string; }
interface CableData { id: string; name?: string; geom?: any; status: string; cable_type?: string; fiber_count?: number; used_fibers?: number; calculated_distance_km?: number; total_fibers?: number; node_a_name?: string; node_b_name?: string; node_a_id?: string; node_b_id?: string; cable_type_id?: string; cable_type_name?: string; cable_color?: string; cable_width?: number; cable_dashed?: boolean; }
interface LayerVisibility { pops: boolean; ctos: boolean; ces: boolean; clients: boolean; cables: boolean; dgos: boolean; }
type DrawMode = 'idle' | 'node' | 'cable' | 'chain' | 'path';

interface Props {
  pops: NodeData[]; ctos: NodeData[]; ces: NodeData[]; clients: NodeData[]; cables: CableData[]; dgos: NodeData[];
  layers: LayerVisibility; leaflet: any; getCableColor: (status?: string) => string;
  onMapClick: (lat: number, lng: number) => void; setMapRef: (ref: any) => void;
  cableStartNode?: NodeData | null; tempLineEnd?: { lat: number; lng: number } | null;
  chainStartNode?: NodeData | null; drawMode?: DrawMode; cableColor?: string; cableWidth?: number;
  pathPoints?: { lat: number; lng: number }[];
  onDblClick?: () => void;
  onRightClick?: () => void;
  searchedLocation?: { lat: number; lng: number } | null;
  satelliteView?: boolean;
}

const DEFAULT_CENTER: [number, number] = [-19.9, -43.9];
const DEFAULT_ZOOM = 13;

function MapRefHandler({ setMapRef }: { setMapRef: (ref: any) => void }) {
  const map = useMap();
  useEffect(() => { setMapRef(map); }, [map, setMapRef]);
  return null;
}

function ClickHandler({ onMapClick, onDblClick, onRightClick }: { onMapClick: (lat: number, lng: number) => void; onDblClick?: () => void; onRightClick?: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: any) => { onMapClick(e.latlng.lat, e.latlng.lng); };
    map.on('click', handler);
    if (onDblClick) {
      map.on('dblclick', (e: any) => { e.originalEvent.preventDefault(); onDblClick(); });
    }
    if (onRightClick) {
      map.on('contextmenu', (e: any) => { e.originalEvent.preventDefault(); onRightClick(); });
    }
    return () => { map.off('click', handler); if (onDblClick) map.off('dblclick'); if (onRightClick) map.off('contextmenu'); };
  }, [map, onMapClick, onDblClick, onRightClick]);
  return null;
}

export default function MapView({ pops, ctos, ces, clients, cables, dgos, layers, leaflet, getCableColor, onMapClick, setMapRef, cableStartNode, tempLineEnd, chainStartNode, drawMode, cableColor = '#6b7280', cableWidth = 3, pathPoints = [], onDblClick, onRightClick, searchedLocation, satelliteView }: Props) {
  const hasData = [...pops, ...ctos, ...ces, ...clients, ...dgos].filter(n => n.geom?.coordinates).length > 0;

  const allNodes = useMemo(() => [...pops, ...ctos, ...ces, ...clients, ...dgos], [pops, ctos, ces, clients, dgos]);

  const getAllCablePositions = useMemo(() => {
    const positions: [number, number][][] = [];
    for (const cable of cables) {
      if (cable.geom?.coordinates) {
        positions.push(cable.geom.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
      }
    }
    if (tempLineEnd && (cableStartNode || chainStartNode)) {
      const start = cableStartNode || chainStartNode;
      if (start?.geom?.coordinates) {
        positions.push([[start.geom.coordinates[1], start.geom.coordinates[0]], [tempLineEnd.lat, tempLineEnd.lng]]);
      }
    }
    return positions;
  }, [cables, tempLineEnd, cableStartNode, chainStartNode]);

  const getTempCableColor = useMemo(() => {
    if (drawMode === 'cable' || drawMode === 'chain') return cableColor;
    return '#94a3b8';
  }, [drawMode, cableColor]);

  const createIcon = (color: string, label: string, size: number) => {
    if (!leaflet) return undefined;
    return leaflet.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color:${color};width:${size*2}px;height:${size*2}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size*0.7}px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;">${label}</div>`,
      iconSize: [size*2, size*2], iconAnchor: [size, size],
    });
  };

  const popIcon = leaflet ? createIcon('#ef4444', 'P', 14) : undefined;
  const ctoIcon = leaflet ? createIcon('#22c55e', 'C', 10) : undefined;
  const ceIcon = leaflet ? createIcon('#3b82f6', 'E', 10) : undefined;
  const clientIcon = leaflet ? createIcon('#f97316', '', 6) : undefined;
  const dgoIcon = leaflet ? createIcon('#a855f7', '', 10) : undefined;
  const searchIcon = leaflet ? leaflet.divIcon({ className: '', html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));text-align:center;line-height:1;">📍</div>', iconSize: [28, 28], iconAnchor: [14, 28] }) : undefined;

  const NodePopup = ({ node, type }: { node: NodeData; type: string }) => {
    const colors: Record<string, string> = { pop: 'text-red-600', cto: 'text-green-600', ce: 'text-blue-600', client: 'text-orange-600', dgo: 'text-purple-600' };
    return (
      <div className="min-w-64">
        <h3 className={`font-bold text-base mb-2 ${colors[type] || 'text-gray-700'}`}>{node.name}</h3>
        <div className="space-y-0.5 text-sm text-gray-600">
          {node.address && <p><span className="font-medium text-gray-700">Endereço:</span> {node.address}</p>}
          {node.capacity && <p><span className="font-medium text-gray-700">Capacidade:</span> {node.capacity}</p>}
          {node.installed_splitters !== undefined && <p><span className="font-medium text-gray-700">Splitters:</span> {node.installed_splitters}</p>}
          {node.plan_mbps && <p><span className="font-medium text-gray-700">Plano:</span> {node.plan_mbps} Mbps</p>}
          {node.ont_serial && <p><span className="font-medium text-gray-700">ONT:</span> {node.ont_serial}</p>}
          {node.vlan && <p><span className="font-medium text-gray-700">VLAN:</span> {node.vlan}</p>}
          {node.splitter_ratio && <p><span className="font-medium text-gray-700">Ratio:</span> {node.splitter_ratio}</p>}
          {node.status && <p><span className="font-medium text-gray-700">Status:</span> <span className={`px-2 py-0.5 rounded text-xs ${node.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{node.status}</span></p>}
        </div>
      </div>
    );
  };

  const CablePopup = ({ cable }: { cable: CableData }) => (
    <div className="min-w-64">
      <h3 className="font-bold text-base mb-2 text-gray-800">{cable.name || `Cabo ${cable.node_a_name || '?'} → ${cable.node_b_name || '?'}`}</h3>
      <div className="space-y-0.5 text-sm text-gray-600">
        {cable.cable_type_name && <p><span className="font-medium text-gray-700">Tipo:</span> {cable.cable_type_name}</p>}
        {cable.fiber_count && <p><span className="font-medium text-gray-700">Fibras:</span> {cable.fiber_count}</p>}
        {cable.fiber_count && <p><span className="font-medium text-gray-700">Fibras:</span> {cable.used_fibers || 0}/{cable.fiber_count}</p>}
        {cable.calculated_distance_km && <p><span className="font-medium text-gray-700">Distância:</span> {Number(cable.calculated_distance_km).toFixed(2)} km</p>}
        <p><span className="font-medium text-gray-700">Status:</span> <span className={`px-2 py-0.5 rounded text-xs ${cable.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{cable.status || 'N/A'}</span></p>
        {cable.cable_color && <p><span className="font-medium text-gray-700">Cor:</span> <span className="inline-block w-4 h-4 rounded align-middle" style={{ backgroundColor: cable.cable_color }}></span> <span className="text-gray-500">{cable.cable_color}</span></p>}
      </div>
    </div>
  );

  const getNodeType = (node: NodeData): string => {
    if (pops.some(p => p.id === node.id)) return 'pop';
    if (ctos.some(c => c.id === node.id)) return 'cto';
    if (ces.some(e => e.id === node.id)) return 'ce';
    if (clients.some(cl => cl.id === node.id)) return 'client';
    return 'dgo';
  };

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <ZoomControl position="bottomright" />
      {satelliteView ? (
        <TileLayer attribution='&copy; <a href="https://www.esri.com">Esri</a>' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      ) : (
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      )}
      <MapRefHandler setMapRef={setMapRef} />
      <ClickHandler onMapClick={onMapClick} onDblClick={drawMode === 'path' ? onDblClick : undefined} onRightClick={drawMode === 'path' ? onRightClick : undefined} />

      {layers.cables && cables.map(cable => (
        cable.geom?.coordinates && (
          <Polyline key={cable.id} positions={cable.geom.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])} pathOptions={{
            color: cable.cable_color || getCableColor(cable.status),
            weight: cable.cable_width || 4,
            opacity: 0.8,
            dashArray: cable.cable_dashed ? '8,6' : undefined,
          }}>
            <Popup><CablePopup cable={cable} /></Popup>
          </Polyline>
        )
      ))}

      {tempLineEnd && (cableStartNode || chainStartNode) && (() => {
        const start = cableStartNode || chainStartNode;
        if (!start?.geom?.coordinates) return null;
        return (
          <Polyline
            key="__temp_line__"
            positions={[[start.geom.coordinates[1], start.geom.coordinates[0]], [tempLineEnd.lat, tempLineEnd.lng]]}
            pathOptions={{ color: getTempCableColor, weight: 3, opacity: 0.7, dashArray: '8,6' }}
          />
        );
      })()}

      {drawMode === 'path' && pathPoints.length >= 2 && (
        <Polyline
          key="__path_preview__"
          positions={pathPoints.map(p => [p.lat, p.lng])}
          pathOptions={{ color: cableColor, weight: cableWidth, opacity: 0.7, dashArray: '10,6' }}
        />
      )}

      {searchedLocation && searchIcon && (
        <Marker key="__search__" position={[searchedLocation.lat, searchedLocation.lng]} icon={searchIcon}>
          <Popup><div className="text-sm"><span className="font-bold">Localização</span><br/>{searchedLocation.lat.toFixed(5)}, {searchedLocation.lng.toFixed(5)}</div></Popup>
        </Marker>
      )}

      {layers.pops && pops.map(pop => (
        pop.geom?.coordinates && popIcon && (
          <Marker key={pop.id} position={[pop.geom.coordinates[1], pop.geom.coordinates[0]]} icon={popIcon}>
            <Popup><NodePopup node={pop} type="pop" /></Popup>
          </Marker>
        )
      ))}
      {layers.ctos && ctos.map(cto => (
        cto.geom?.coordinates && ctoIcon && (
          <Marker key={cto.id} position={[cto.geom.coordinates[1], cto.geom.coordinates[0]]} icon={ctoIcon}>
            <Popup><NodePopup node={cto} type="cto" /></Popup>
          </Marker>
        )
      ))}
      {layers.ces && ces.map(ce => (
        ce.geom?.coordinates && ceIcon && (
          <Marker key={ce.id} position={[ce.geom.coordinates[1], ce.geom.coordinates[0]]} icon={ceIcon}>
            <Popup><NodePopup node={ce} type="ce" /></Popup>
          </Marker>
        )
      ))}
      {layers.clients && clients.map(client => (
        client.geom?.coordinates && clientIcon && (
          <Marker key={client.id} position={[client.geom.coordinates[1], client.geom.coordinates[0]]} icon={clientIcon}>
            <Popup><NodePopup node={client} type="client" /></Popup>
          </Marker>
        )
      ))}
      {layers.dgos && dgos.map(dgo => (
        dgo.geom?.coordinates && dgoIcon && (
          <Marker key={dgo.id} position={[dgo.geom.coordinates[1], dgo.geom.coordinates[0]]} icon={dgoIcon}>
            <Popup><NodePopup node={dgo} type="dgo" /></Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}

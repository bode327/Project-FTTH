'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';

interface NodeData { id: string; name: string; address?: string; geom?: any; status?: string; capacity?: number; installed_splitters?: number; plan_mbps?: number; ont_serial?: string; vlan?: number; splitter_ratio?: string; type?: string; }
interface CableData { id: string; name?: string; geom?: any; status: string; cable_type?: string; fiber_count?: number; used_fibers?: number; calculated_distance_km?: number; total_fibers?: number; node_a_name?: string; node_b_name?: string; node_a_id?: string; node_b_id?: string; cable_type_id?: string; cable_type_name?: string; cable_color?: string; cable_width?: number; cable_dashed?: boolean; }
interface LayerVisibility { pops: boolean; ctos: boolean; ces: boolean; clients: boolean; cables: boolean; dgos: boolean; }
type DrawMode = 'idle' | 'node' | 'cable' | 'chain' | 'path';
interface ContextMenuItem { label: string; icon?: string; onClick?: () => void; className?: string; }

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }) {
  return (
    <div className="fixed bg-white rounded-lg shadow-xl border py-1 z-[2000] min-w-48" style={{ left: x, top: y }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick?.(); onClose(); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${item.className || ''}`}>
          {item.icon && <span>{item.icon}</span>}<span>{item.label}</span>
        </button>
      ))}
      <div className="border-t mt-1 pt-1"><button onClick={onClose} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Fechar</button></div>
    </div>
  );
}

function NodePopup({ node, type }: { node: NodeData; type: string }) {
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
}

function CablePopup({ cable }: { cable: CableData }) {
  return (
    <div className="min-w-64">
      <h3 className="font-bold text-base mb-2 text-gray-800">{cable.name || `Cabo ${cable.node_a_name || '?'} → ${cable.node_b_name || '?'}`}</h3>
      <div className="space-y-0.5 text-sm text-gray-600">
        {cable.cable_type_name && <p><span className="font-medium text-gray-700">Tipo:</span> {cable.cable_type_name}</p>}
        {cable.fiber_count && <p><span className="font-medium text-gray-700">Fibras:</span> {cable.fiber_count}</p>}
        {cable.calculated_distance_km && <p><span className="font-medium text-gray-700">Distância:</span> {Number(cable.calculated_distance_km).toFixed(2)} km</p>}
        <p><span className="font-medium text-gray-700">Status:</span> <span className={`px-2 py-0.5 rounded text-xs ${cable.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{cable.status || 'N/A'}</span></p>
      </div>
    </div>
  );
}

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
  onEditNode?: (node: NodeData, type: string) => void;
  onDeleteNode?: (node: NodeData, type: string) => void;
  onCenterOnNode?: (node: NodeData) => void;
  onEditIcon?: (node: NodeData, type: string) => void;
  getNodeIconUrl?: (node: NodeData) => string;
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
    if (onDblClick) map.on('dblclick', (e: any) => { e.originalEvent.preventDefault(); onDblClick(); });
    if (onRightClick) map.on('contextmenu', (e: any) => { e.originalEvent.preventDefault(); onRightClick(); });
    return () => { map.off('click', handler); if (onDblClick) map.off('dblclick'); if (onRightClick) map.off('contextmenu'); };
  }, [map, onMapClick, onDblClick, onRightClick]);
  return null;
}

export default function MapView({ pops, ctos, ces, clients, cables, dgos, layers, leaflet, getCableColor, onMapClick, setMapRef, cableStartNode, tempLineEnd, chainStartNode, drawMode, cableColor = '#6b7280', cableWidth = 3, pathPoints = [], onDblClick, onRightClick, searchedLocation, satelliteView, onEditNode, onDeleteNode, onCenterOnNode, onEditIcon, getNodeIconUrl }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeData; type: string } | null>(null);
  const hasData = [...pops, ...ctos, ...ces, ...clients, ...dgos].filter(n => n.geom?.coordinates).length > 0;

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

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

  const createIcon = (iconUrl: string) => {
    if (!leaflet) return undefined;
    return leaflet.icon({ iconUrl, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
  };

  const createDivIcon = (color: string, label: string, size: number) => {
    if (!leaflet) return undefined;
    return leaflet.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color:${color};width:${size*2}px;height:${size*2}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size*0.7}px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;">${label}</div>`,
      iconSize: [size*2, size*2], iconAnchor: [size, size],
    });
  };

  const BASE = '/assets/kml-icons';
  const pushpinDefaults = [
    { id: 'red-pushpin', url: `${BASE}/pushpin/red-pushpin.png` },
    { id: 'ylw-pushpin', url: `${BASE}/pushpin/ylw-pushpin.png` },
    { id: 'grn-pushpin', url: `${BASE}/pushpin/grn-pushpin.png` },
    { id: 'ltblu-pushpin', url: `${BASE}/pushpin/ltblu-pushpin.png` },
    { id: 'purple-pushpin', url: `${BASE}/pushpin/purple-pushpin.png` },
    { id: 'pink-pushpin', url: `${BASE}/pushpin/pink-pushpin.png` },
    { id: 'wht-pushpin', url: `${BASE}/pushpin/wht-pushpin.png` },
  ];
  const paddleDefaults = [
    { id: 'paddle/red-circle', url: `${BASE}/paddle/red-circle.png` },
    { id: 'paddle/ylw-circle', url: `${BASE}/paddle/ylw-circle.png` },
    { id: 'paddle/grn-circle', url: `${BASE}/paddle/grn-circle.png` },
    { id: 'paddle/blu-circle', url: `${BASE}/paddle/blu-circle.png` },
    { id: 'paddle/purple-circle', url: `${BASE}/paddle/purple-circle.png` },
    { id: 'paddle/red-diamond', url: `${BASE}/paddle/red-diamond.png` },
    { id: 'paddle/ylw-diamond', url: `${BASE}/paddle/ylw-diamond.png` },
  ];

  const getNodeDefaultIcon = (node: NodeData, type: string) => {
    if (getNodeIconUrl) return createIcon(getNodeIconUrl(node));
    const defaults: Record<string, typeof pushpinDefaults[0][]> = {
      pop: pushpinDefaults, cto: pushpinDefaults, ce: pushpinDefaults, client: pushpinDefaults, dgo: pushpinDefaults
    };
    const d = defaults[type] || pushpinDefaults;
    return createIcon(d[0].url);
  };

  const popIcon = leaflet ? getNodeDefaultIcon({ id: '' } as NodeData, 'pop') : undefined;
  const ctoIcon = leaflet ? getNodeDefaultIcon({ id: '' } as NodeData, 'cto') : undefined;
  const ceIcon = leaflet ? getNodeDefaultIcon({ id: '' } as NodeData, 'ce') : undefined;
  const clientIcon = leaflet ? getNodeDefaultIcon({ id: '' } as NodeData, 'client') : undefined;
  const dgoIcon = leaflet ? getNodeDefaultIcon({ id: '' } as NodeData, 'dgo') : undefined;
  const searchIcon = leaflet ? leaflet.divIcon({ className: '', html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));text-align:center;line-height:1;">📍</div>', iconSize: [28, 28], iconAnchor: [14, 28] }) : undefined;

  const getIconForNode = (node: NodeData, type: string) => {
    if (getNodeIconUrl) {
      const url = getNodeIconUrl(node);
      return createIcon(url);
    }
    return null;
  };

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

      {layers.pops && pops.map(pop => {
        const iconUrl = getNodeIconUrl ? getNodeIconUrl(pop) : '';
        if (!iconUrl) return null;
        const icon = createIcon(iconUrl);
        return pop.geom?.coordinates && icon ? (
          <Marker key={pop.id} position={[pop.geom.coordinates[1], pop.geom.coordinates[0]]} icon={icon} eventHandlers={{ contextmenu: (e: any) => { e.originalEvent?.preventDefault(); setContextMenu({ x: e.originalEvent?.clientX || e.containerPoint?.x || 0, y: e.originalEvent?.clientY || e.containerPoint?.y || 0, node: pop, type: 'pop' }); } }}>
            <Popup><NodePopup node={pop} type="pop" /></Popup>
          </Marker>
        ) : null;
      })}
      {layers.ctos && ctos.map(cto => {
        const iconUrl = getNodeIconUrl ? getNodeIconUrl(cto) : '';
        if (!iconUrl) return null;
        const icon = createIcon(iconUrl);
        return cto.geom?.coordinates && icon ? (
          <Marker key={cto.id} position={[cto.geom.coordinates[1], cto.geom.coordinates[0]]} icon={icon} eventHandlers={{ contextmenu: (e: any) => { e.originalEvent?.preventDefault(); setContextMenu({ x: e.originalEvent?.clientX || 0, y: e.originalEvent?.clientY || 0, node: cto, type: 'cto' }); } }}>
            <Popup><NodePopup node={cto} type="cto" /></Popup>
          </Marker>
        ) : null;
      })}
      {layers.ces && ces.map(ce => {
        const iconUrl = getNodeIconUrl ? getNodeIconUrl(ce) : '';
        if (!iconUrl) return null;
        const icon = createIcon(iconUrl);
        return ce.geom?.coordinates && icon ? (
          <Marker key={ce.id} position={[ce.geom.coordinates[1], ce.geom.coordinates[0]]} icon={icon} eventHandlers={{ contextmenu: (e: any) => { e.originalEvent?.preventDefault(); setContextMenu({ x: e.originalEvent?.clientX || 0, y: e.originalEvent?.clientY || 0, node: ce, type: 'ce' }); } }}>
            <Popup><NodePopup node={ce} type="ce" /></Popup>
          </Marker>
        ) : null;
      })}
      {layers.clients && clients.map(client => {
        const iconUrl = getNodeIconUrl ? getNodeIconUrl(client) : '';
        if (!iconUrl) return null;
        const icon = createIcon(iconUrl);
        return client.geom?.coordinates && icon ? (
          <Marker key={client.id} position={[client.geom.coordinates[1], client.geom.coordinates[0]]} icon={icon} eventHandlers={{ contextmenu: (e: any) => { e.originalEvent?.preventDefault(); setContextMenu({ x: e.originalEvent?.clientX || 0, y: e.originalEvent?.clientY || 0, node: client, type: 'client' }); } }}>
            <Popup><NodePopup node={client} type="client" /></Popup>
          </Marker>
        ) : null;
      })}
      {layers.dgos && dgos.map(dgo => {
        const iconUrl = getNodeIconUrl ? getNodeIconUrl(dgo) : '';
        if (!iconUrl) return null;
        const icon = createIcon(iconUrl);
        return dgo.geom?.coordinates && icon ? (
          <Marker key={dgo.id} position={[dgo.geom.coordinates[1], dgo.geom.coordinates[0]]} icon={icon} eventHandlers={{ contextmenu: (e: any) => { e.originalEvent?.preventDefault(); setContextMenu({ x: e.originalEvent?.clientX || 0, y: e.originalEvent?.clientY || 0, node: dgo, type: 'dgo' }); } }}>
            <Popup><NodePopup node={dgo} type="dgo" /></Popup>
          </Marker>
        ) : null;
      })}
      {contextMenu && onEditNode && onDeleteNode && onCenterOnNode && onEditIcon && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          items={[
            { label: contextMenu.node.name, icon: '📍', className: 'font-bold text-gray-800 cursor-default hover:bg-transparent pointer-events-none' },
            { label: 'Centralizar aqui', icon: '🎯', onClick: () => onCenterOnNode(contextMenu.node) },
            { label: 'Editar dados', icon: '✏️', onClick: () => onEditNode(contextMenu.node, contextMenu.type) },
            { label: 'Trocar ícone', icon: '🎨', onClick: () => onEditIcon(contextMenu.node, contextMenu.type) },
            { label: 'Excluir', icon: '🗑️', onClick: () => onDeleteNode(contextMenu.node, contextMenu.type), className: 'text-red-600' },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </MapContainer>
  );
}

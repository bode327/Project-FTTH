'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api, apiRoutes } from '@/lib/api';

interface NodeData {
  id: string; name: string; address?: string;
  geom?: { type: string; coordinates: number[] };
  status?: string; capacity?: number; installed_splitters?: number;
  plan_mbps?: number; ont_serial?: string; vlan?: number;
  splitter_ratio?: string; type?: string;
}

interface CableData {
  id: string; name?: string;
  geom?: { type: string; coordinates: number[][] };
  status: string; cable_type?: string; fiber_count?: number;
  used_fibers?: number; calculated_distance_km?: number; total_fibers?: number;
  node_a_name?: string; node_b_name?: string; node_a_id?: string; node_b_id?: string;
}

interface LayerVisibility {
  pops: boolean; ctos: boolean; ces: boolean;
  clients: boolean; cables: boolean; dgos: boolean;
}

type DrawMode = 'idle' | 'node' | 'cable' | 'chain' | 'path';
type NodeType = 'cto' | 'ce' | 'pop' | 'client' | 'dgo';

const DEFAULT_CENTER: [number, number] = [-19.9, -43.9];
const DEFAULT_ZOOM = 13;
const SNAP_DISTANCE = 0.0005;

const MapContainer = dynamic(() => import('./MapView'), { ssr: false });

export default function NetworkMapPage() {
  const [isMounted] = useState(true);
  const [pops, setPops] = useState<NodeData[]>([]);
  const [ctos, setCtos] = useState<NodeData[]>([]);
  const [ces, setCes] = useState<NodeData[]>([]);
  const [clients, setClients] = useState<NodeData[]>([]);
  const [dgos, setDgos] = useState<NodeData[]>([]);
  const [cables, setCables] = useState<CableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState<LayerVisibility>({
    pops: true, ctos: true, ces: true, clients: false, cables: true, dgos: false,
  });

  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('cto');
  const [selectedCableTypeId, setSelectedCableTypeId] = useState<string>('');
  const [cableTypes, setCableTypes] = useState<{ id: string; name: string; color: string; stroke_width: number; fiber_count: number; dashed: boolean }[]>([]);

  const [mapRef, setMapRef] = useState<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);

  const [cableStartNode, setCableStartNode] = useState<NodeData | null>(null);
  const [tempLineEnd, setTempLineEnd] = useState<{ lat: number; lng: number } | null>(null);
  const [chainStartNode, setChainStartNode] = useState<NodeData | null>(null);
  const [pathPoints, setPathPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [pathStartNode, setPathStartNode] = useState<NodeData | null>(null);

  const [designName, setDesignName] = useState('');
  const [designDesc, setDesignDesc] = useState('');
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showCableModal, setShowCableModal] = useState(false);

  const [newNodeCoords, setNewNodeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeAddress, setNewNodeAddress] = useState('');
  const [newNodeStatus, setNewNodeStatus] = useState('planned');
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');

  const [statusMsg, setStatusMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NodeData[]>([]);
  const [locationResults, setLocationResults] = useState<{ display_name: string; lat: number; lng: number }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showProjectTree, setShowProjectTree] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [satelliteView, setSatelliteView] = useState(false);
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const canEdit = userRole === 'superadmin' || userRole === 'admin';

  const showMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setLocationResults([]);
      setShowSearchResults(false);
      return;
    }
    const q = query.trim();

    const coordMatch = q.match(/^([-+]?\d+\.?\d*)\s*[,;\s]\s*([-+]?\d+\.?\d*)$/);
    const dmsMatch = q.match(/(\d+)[°]\s*(\d+)[']\s*(\d+(?:\.\d+)?)["]?\s*([NS])\s*(\d+)[°]\s*(\d+)[']\s*(\d+(?:\.\d+)?)["]?\s*([WE])/i);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        centerOnLocation({ lat, lng });
        setSearchQuery('');
        setShowSearchResults(false);
        return;
      }
    }
    if (dmsMatch) {
      const lat = dmsToDec(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3]), dmsMatch[4]);
      const lng = dmsToDec(parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]), parseFloat(dmsMatch[7]), dmsMatch[8]);
      if (!isNaN(lat) && !isNaN(lng)) {
        centerOnLocation({ lat, lng });
        setSearchQuery('');
        setShowSearchResults(false);
        return;
      }
    }

    const lowerQ = q.toLowerCase();
    const results: NodeData[] = [];
    for (const n of allNodes) {
      if ((n.name || '').toLowerCase().includes(lowerQ) || (n.address || '').toLowerCase().includes(lowerQ)) {
        results.push(n);
      }
    }
    setSearchResults(results.slice(0, 10));
    setShowSearchResults(true);
    if (q.length >= 3) {
      setSearchingLocation(true);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=br`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setLocationResults(data.map((d: any) => ({ display_name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
          }
        })
        .catch(() => {})
        .finally(() => setSearchingLocation(false));
    } else {
      setLocationResults([]);
    }
  };

  const dmsToDec = (deg: number, min: number, sec: number, dir: string) => {
    let dec = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') dec = -dec;
    return dec;
  };

  const allNodes = [...pops, ...ctos, ...ces, ...dgos];

  const findNearestNode = useCallback((lat: number, lng: number): NodeData | null => {
    let nearest: NodeData | null = null;
    let minDist = SNAP_DISTANCE;
    for (const n of allNodes) {
      if (!n.geom?.coordinates) continue;
      const dlat = lat - n.geom.coordinates[1];
      const dlng = lng - n.geom.coordinates[0];
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < minDist) { minDist = dist; nearest = n; }
    }
    return nearest;
  }, [allNodes]);

  const refreshAll = async () => {
    const areaParam = selectedArea ? `?area_id=${selectedArea}` : '';
    const [popsD, ctosD, cesD, clientsD, cablesD, nodesD] = await Promise.all([
      api.get(apiRoutes.pops + areaParam), api.get(apiRoutes.ctos + areaParam), api.get(apiRoutes.ces + areaParam),
      api.get(apiRoutes.clients + areaParam), api.get(apiRoutes.cables + areaParam), api.get(apiRoutes.networkNodes + areaParam),
    ]);
    const parseGeom = (item: any) => !item.geom ? item : { ...item, geom: typeof item.geom === 'string' ? JSON.parse(item.geom) : item.geom };
    if (popsD?.data) setPops(popsD.data.map(parseGeom));
    if (ctosD?.data) setCtos(ctosD.data.map(parseGeom));
    if (cesD?.data) setCes(cesD.data.map(parseGeom));
    if (clientsD?.data) setClients(clientsD.data.map(parseGeom));
    if (cablesD?.data) setCables(cablesD.data.map(parseGeom));
    if (nodesD?.data) {
      const nodes = nodesD.data.map(parseGeom);
      setDgos(nodes.filter((n: NodeData) => ['dgo', 'switch', 'router'].includes(n.type || '')));
    }
  };

  const loadProjectsAndAreas = async () => {
    const [projectsD, areasD, cableTypesD] = await Promise.all([
      api.get(apiRoutes.projects),
      api.get(apiRoutes.areas),
      api.get(apiRoutes.catalogs + '/cable-type'),
    ]);
    if (projectsD?.data) setProjects(projectsD.data);
    if (areasD?.data) setAreas(areasD.data);
    if (cableTypesD?.data) {
      setCableTypes(cableTypesD.data);
      if (cableTypesD.data.length > 0 && !selectedCableTypeId) {
        const dist = cableTypesD.data.find((t: any) => t.name === 'Distribuição');
        setSelectedCableTypeId(dist?.id || cableTypesD.data[0].id);
      }
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    import('leaflet').then(L => setLeaflet(L.default));
    loadProjectsAndAreas().catch(console.error);
    refreshAll().catch(console.error).finally(() => setLoading(false));
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    refreshAll().catch(console.error);
  }, [selectedArea, isMounted]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-box')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const getCableColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'maintenance': return '#9ca3af';
      case 'broken': return '#ef4444';
      case 'planned': return '#a855f7';
      default: return '#6b7280';
    }
  };

  const getCableColorByType = (typeId: string) => {
    const ct = cableTypes.find(t => t.id === typeId);
    return ct?.color || '#6b7280';
  };
  const getCableWidthByType = (typeId: string) => {
    const ct = cableTypes.find(t => t.id === typeId);
    return ct?.stroke_width || 3;
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const zoomToFit = useCallback(() => {
    if (!mapRef) return;
    const allPoints: [number, number][] = [];
    const addPoints = (arr: NodeData[]) => arr.forEach((n: NodeData) => { if (n.geom?.coordinates) allPoints.push([n.geom.coordinates[1], n.geom.coordinates[0]]); });
    if (layers.pops) addPoints(pops);
    if (layers.ctos) addPoints(ctos);
    if (layers.ces) addPoints(ces);
    if (layers.clients) addPoints(clients);
    if (layers.dgos) addPoints(dgos);
    if (allPoints.length > 0) mapRef.fitBounds(allPoints, { padding: [50, 50] });
  }, [mapRef, layers, pops, ctos, ces, clients, dgos]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (drawMode === 'idle') return;
    if (drawMode === 'node') {
      setNewNodeCoords({ lat, lng });
      setNewNodeName(''); setNewNodeAddress(''); setNewNodeStatus('planned');
      setShowAddNode(true);
      return;
    }
    if (drawMode === 'cable') {
      const nearest = findNearestNode(lat, lng);
      setTempLineEnd({ lat, lng });
      if (!cableStartNode) {
        if (nearest) { setCableStartNode(nearest); showMsg(`Início: ${nearest.name}. Clique em outro nó para criar cabo.`); }
        else { showMsg('Nenhum nó perto. Ative "Criar nó" para adicionar primeiro.'); setTempLineEnd(null); }
      } else {
        if (nearest && nearest.id !== cableStartNode.id) { setShowCableModal(true); }
        else { showMsg('Selecione outro nó diferente do início.'); setTempLineEnd(null); }
      }
      return;
    }
    if (drawMode === 'chain') {
      const nearest = findNearestNode(lat, lng);
      if (!chainStartNode) {
        if (nearest) { setChainStartNode(nearest); setTempLineEnd({ lat, lng }); showMsg(`${nearest.name} → clique no próximo nó ou lugar para criar nó + cabo.`); }
        else { setNewNodeCoords({ lat, lng }); setNewNodeName(''); setNewNodeAddress(''); setNewNodeStatus('planned'); setShowAddNode(true); }
      } else {
        if (nearest && nearest.id !== chainStartNode.id) { createCableBetweenNodes(chainStartNode, nearest); setChainStartNode(nearest); setTempLineEnd({ lat, lng }); showMsg(`Cabo criado: ${chainStartNode.name} → ${nearest.name}. Continue. ESC para sair.`); }
        else if (!nearest) { setNewNodeCoords({ lat, lng }); setNewNodeName(`${selectedNodeType.toUpperCase()} ${Date.now() % 10000}`); setNewNodeAddress(''); setNewNodeStatus('planned'); setShowAddNode(true); }
        else { showMsg('Selecione outro nó ou clique em lugar vazio.'); }
      }
    }
    if (drawMode === 'path') {
      if (pathPoints.length === 0) {
        const nearest = findNearestNode(lat, lng);
        setPathStartNode(nearest);
        setPathPoints([{ lat, lng }]);
        showMsg(nearest ? `Início: ${nearest.name}. Continue clicando. Duplo clique para finalizar.` : 'Clique para iniciar o traçado.');
      } else {
        setPathPoints(prev => [...prev, { lat, lng }]);
        showMsg(`${pathPoints.length + 1} pontos. Duplo clique no último nó para finalizar.`);
      }
      return;
    }
  }, [drawMode, cableStartNode, chainStartNode, findNearestNode, selectedNodeType, pathPoints]);

  const createCableBetweenNodes = async (nodeA: NodeData, nodeB: NodeData) => {
    setSaving(true);
    try {
      await api.post(apiRoutes.networkNodes + '/cables', {
        node_a_id: nodeA.id, node_b_id: nodeB.id, cable_type_id: selectedCableTypeId || undefined,
        area_id: selectedArea || null,
      });
      await refreshAll();
      showMsg(`Cabo criado: ${nodeA.name} → ${nodeB.name}`);
    } catch (err: any) {
      try {
        await api.post(apiRoutes.networkNodes + '/cables', {
          node_a_id: nodeA.id, node_b_id: nodeB.id,
          area_id: selectedArea || null,
          cable_type_id: selectedCableTypeId || undefined,
        });
        await refreshAll();
        showMsg(`Cabo criado: ${nodeA.name} → ${nodeB.name}`);
      } catch (e2: any) {
        alert('Erro ao criar cabo: ' + (e2.message || 'Verifique se os nós existem'));
      }
    } finally { setSaving(false); }
  };

  const handleCreateCableFromModal = async () => {
    if (!cableStartNode || !tempLineEnd) return;
    const nearest = findNearestNode(tempLineEnd.lat, tempLineEnd.lng);
    if (nearest && nearest.id !== cableStartNode.id) await createCableBetweenNodes(cableStartNode, nearest);
    setCableStartNode(null); setTempLineEnd(null); setShowCableModal(false);
  };

  const handleAddNodeFromMap = async () => {
    if (!newNodeCoords || !newNodeName.trim()) { alert('Nome e coordenadas são obrigatórios'); return; }
    setSaving(true);
    try {
      const routes: Record<string, string> = { pop: 'pops', cto: 'ctos', ce: 'ces', client: 'clients', dgo: 'ces' };
      const route = routes[selectedNodeType] || 'ctos';
      await api.post('/' + route, {
        name: newNodeName, address: newNodeAddress,
        lat: newNodeCoords.lat, lng: newNodeCoords.lng,
        status: newNodeStatus,
        area_id: selectedArea || null,
      });
      await refreshAll();
      setShowAddNode(false);
      if (drawMode === 'chain' && !chainStartNode) {
        const newNode = [...pops, ...ctos, ...ces, ...dgos].find(n =>
          n.geom?.coordinates?.[0] && Math.abs(n.geom.coordinates[0] - newNodeCoords.lng) < 0.0001 &&
          Math.abs(n.geom.coordinates[1] - newNodeCoords.lat) < 0.0001
        );
        if (newNode) setChainStartNode(newNode);
      }
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveDesign = async () => {
    if (!designName.trim()) { alert('Nome do design é obrigatório'); return; }
    setSaving(true);
    try {
      if (selectedDesign) {
        await api.put(apiRoutes.networkDesigns + '/' + selectedDesign.id, {
          name: designName, description: designDesc,
          canvas_data: { pops, ctos, ces, clients, cables, dgos },
        });
      } else {
        await api.post(apiRoutes.networkDesigns, {
          name: designName, description: designDesc,
          canvas_data: { pops, ctos, ces, clients, cables, dgos },
        });
      }
      const designsData = await api.get(apiRoutes.networkDesigns);
      setDesigns(designsData?.data || []);
      setShowSaveModal(false);
      showMsg('Design salvo com sucesso!');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleLoadDesign = (design: any) => {
    setSelectedDesign(design);
    setDesignName(design.name);
    setDesignDesc(design.description || '');
    if (design.canvas_data) {
      const data = design.canvas_data;
      if (data.pops) setPops(data.pops); if (data.ctos) setCtos(data.ctos); if (data.ces) setCes(data.ces);
      if (data.clients) setClients(data.clients); if (data.cables) setCables(data.cables); if (data.dgos) setDgos(data.dgos);
    }
    zoomToFit();
  };

  const handleNewDesign = () => { setSelectedDesign(null); setDesignName(''); setDesignDesc(''); };

  const centerOnNode = (node: NodeData) => {
    if (!node.geom?.coordinates || !mapRef) return;
    const [lng, lat] = node.geom.coordinates;
    mapRef.setView([lat, lng], 18);
    setSearchedLocation({ lat, lng });
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const centerOnLocation = (loc: { lat: number; lng: number }) => {
    if (!mapRef) return;
    mapRef.setView([loc.lat, loc.lng], 18);
    setSearchedLocation(loc);
    setShowSearchResults(false);
  };

  const cancelCableMode = () => { setCableStartNode(null); setTempLineEnd(null); setShowCableModal(false); };
  const cancelChainMode = () => { setChainStartNode(null); setTempLineEnd(null); };
  const cancelPathMode = () => { setPathPoints([]); setPathStartNode(null); };
  const undoPathPoint = () => {
    if (pathPoints.length <= 1) { cancelPathMode(); showMsg('Traçado cancelado.'); }
    else { setPathPoints(prev => prev.slice(0, -1)); showMsg(`Desfeito ponto. Restam ${pathPoints.length - 1} pontos.`); }
  };
  const finishPath = async () => {
    if (pathPoints.length < 2) { showMsg('Clique em pelo menos 2 pontos.'); return; }
    setSaving(true);
    try {
      const firstPt = pathPoints[0]; const lastPt = pathPoints[pathPoints.length - 1];
      const startNode = pathStartNode || findNearestNode(firstPt.lat, firstPt.lng);
      const endNode = findNearestNode(lastPt.lat, lastPt.lng);
      if (!startNode || !endNode) { showMsg('Nós precisam existir.'); setSaving(false); return; }
      await api.post(apiRoutes.networkNodes + '/cables', {
        node_a_id: startNode.id, node_b_id: endNode.id,
        cable_type_id: selectedCableTypeId || undefined,
        area_id: selectedArea || null,
        path: pathPoints.map(p => [p.lng, p.lat]),
      });
      await refreshAll();
      showMsg(`Cabo criado: ${startNode.name} → ${endNode.name} (${pathPoints.length} pontos)`);
      setPathPoints([]); setPathStartNode(null);
    } catch (err: any) { showMsg('Erro: ' + (err.message || '')); }
    finally { setSaving(false); }
  };
  const exitDrawMode = () => { setDrawMode('idle'); cancelCableMode(); cancelChainMode(); cancelPathMode(); };

  const getDrawModeLabel = () => {
    if (drawMode === 'idle') return 'Modo: Visualizar';
    if (drawMode === 'node') return `Modo: Criar nó (${selectedNodeType.toUpperCase()})`;
    if (drawMode === 'cable') return cableStartNode ? `Cabo: ${cableStartNode.name} → ?` : 'Modo: Cabo (clique nó início)';
    if (drawMode === 'chain') return chainStartNode ? `Encadeamento: ${chainStartNode.name} → ...` : 'Modo: Encadeamento (clique nó/ lugar)';
    if (drawMode === 'path') return `Traçado: ${pathPoints.length} ponto(s)`;
    return '';
  };

  if (!isMounted) return <div className="h-screen flex items-center justify-center">Carregando mapa...</div>;

  return (
    <div className="h-screen w-full relative">
      {statusMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[2000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {statusMsg}
        </div>
      )}

      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col gap-1.5 min-w-48">
          <button onClick={() => setShowLayers(!showLayers)} className="flex items-center justify-between font-bold text-sm text-gray-800 border-b pb-2">
            <span>Camadas</span>
            <span className="text-gray-400">{showLayers ? '−' : '+'}</span>
          </button>
          {showLayers && (<>
            {(['pops', 'ctos', 'ces', 'clients', 'dgos', 'cables'] as const).map(layer => (
              <label key={layer} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={layers[layer]} onChange={() => toggleLayer(layer)} className="accent-blue-600" />
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${layer === 'pops' ? 'bg-red-500' : layer === 'ctos' ? 'bg-green-500' : layer === 'ces' ? 'bg-blue-500' : layer === 'clients' ? 'bg-orange-400' : layer === 'dgos' ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                <span>{layer === 'pops' ? 'POPs' : layer === 'ctos' ? 'CTOs' : layer === 'ces' ? 'CEs' : layer === 'clients' ? 'Clientes' : layer === 'dgos' ? 'DGO/Switch' : 'Cabos'}</span>
              </label>
            ))}
            <button onClick={() => setShowProjectTree(!showProjectTree)} className="mt-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition font-medium text-left">
              {showProjectTree ? '▼' : '▶'} Projetos ({projects.length})
            </button>
            {showProjectTree && (
              <div className="max-h-48 overflow-y-auto border rounded p-1 text-xs space-y-0.5">
                {projects.length === 0 && <p className="text-gray-400 p-1">Nenhum projeto</p>}
                {projects.map(p => {
                  const area = areas.find(a => a.id === p.area_id);
                  const expanded = selectedProject === p.id;
                  return (
                    <div key={p.id}>
                      <button onClick={() => { setSelectedProject(expanded ? '' : p.id); setSelectedArea(''); }} className={`w-full text-left px-2 py-1 rounded flex items-center gap-1 ${expanded ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'}`}>
                        <span>{expanded ? '📂' : '📁'}</span>
                        <span className="truncate">{p.name}</span>
                      </button>
                      {expanded && area && (
                        <button onClick={() => setSelectedArea(area.id)} className={`w-full text-left pl-6 pr-2 py-0.5 rounded flex items-center gap-1 ${selectedArea === area.id ? 'bg-green-100 text-green-800 font-medium' : 'hover:bg-gray-50'}`}>
                          <span>📍</span><span className="truncate">{area.name}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => { setSatelliteView(!satelliteView); }} className={`w-full text-left mt-1 px-3 py-1.5 text-xs rounded transition font-medium flex items-center gap-2 ${satelliteView ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {satelliteView ? '🛰️' : '🗺️'} {satelliteView ? 'Satélite' : 'Mapa de Ruas'}
            </button>
            <button onClick={() => setShowLegend(!showLegend)} className="flex items-center justify-between text-xs font-medium text-gray-500 border-t pt-2 mt-1">
              <span>Legenda</span>
              <span className="text-gray-400">{showLegend ? '−' : '+'}</span>
            </button>
            {showLegend && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold">P</span> POP</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold">C</span> CTO</div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold">E</span> CE</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Cliente</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> DGO/Switch</div>
                <div className="mt-1.5 pt-1.5 border-t space-y-0.5">
                  {cableTypes.length > 0 ? cableTypes.map(ct => (
                    <div key={ct.id} className="flex items-center gap-1.5">
                      <span className="w-6 rounded-sm" style={{ backgroundColor: ct.color, height: ct.stroke_width || 3, opacity: 0.8 }}></span>
                      {ct.name} ({ct.fiber_count}F)
                    </div>
                  )) : (
                    <>
                      <div className="flex items-center gap-1.5"><span className="w-6 h-1 bg-red-600 rounded-sm"></span>Troncal</div>
                      <div className="flex items-center gap-1.5"><span className="w-6 h-1 bg-blue-600 rounded-sm"></span>Distribuição</div>
                      <div className="flex items-center gap-1.5"><span className="w-6 h-1 bg-amber-500 rounded-sm"></span>Drop</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>)}
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80 search-box">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)} placeholder="Buscar local, rua, cidade, POP, CTO..." className="w-full pl-10 pr-4 py-2.5 text-sm border-b focus:outline-none" />
            {showSearchResults && (searchResults.length > 0 || locationResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-xl border max-h-80 overflow-y-auto z-[1100]">
                {searchResults.length > 0 && (<>
                  <div className="px-4 py-1.5 text-xs text-gray-400 font-medium bg-gray-50 border-b">Nós da rede</div>
                  {searchResults.map(node => (
                    <button key={node.id} onClick={() => centerOnNode(node)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pops.some(p => p.id === node.id) ? 'bg-red-500' : ctos.some(c => c.id === node.id) ? 'bg-green-500' : ces.some(e => e.id === node.id) ? 'bg-blue-500' : clients.some(cl => cl.id === node.id) ? 'bg-orange-400' : 'bg-purple-500'}`}></span>
                      <div className="flex-1 min-w-0"><div className="font-medium text-gray-800 truncate">{node.name}</div>{node.address && <div className="text-xs text-gray-500 truncate">{node.address}</div>}</div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{pops.some(p => p.id === node.id) ? 'POP' : ctos.some(c => c.id === node.id) ? 'CTO' : ces.some(e => e.id === node.id) ? 'CE' : clients.some(cl => cl.id === node.id) ? 'Cliente' : 'DGO'}</span>
                    </button>
                  ))}
                </>)}
                {locationResults.length > 0 && (<>
                  <div className="px-4 py-1.5 text-xs text-gray-400 font-medium bg-gray-50 border-b">📍 Endereços</div>
                  {locationResults.map((loc, i) => (
                    <button key={`loc-${i}`} onClick={() => centerOnLocation(loc)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2">
                      <span className="text-base">📍</span>
                      <div className="flex-1 min-w-0"><div className="font-medium text-gray-800 truncate">{loc.display_name}</div></div>
                    </button>
                  ))}
                </>)}
              </div>
            )}
            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && locationResults.length === 0 && !searchingLocation && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-xl border p-4 text-center text-sm text-gray-500 z-[1100]">Nenhum resultado para "{searchQuery}"</div>
            )}
            {showSearchResults && searchingLocation && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-xl border p-4 text-center text-sm text-gray-400 z-[1100]">Buscando endereços...</div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2 min-w-52">
        <button onClick={() => setShowRightPanel(!showRightPanel)} className="flex items-center justify-between text-sm font-bold text-gray-800 border-b pb-1">
          <span>Ferramentas</span>
          <span className="text-gray-400">{showRightPanel ? '−' : '+'}</span>
        </button>
        {showRightPanel && (<>
          <button onClick={zoomToFit} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition font-medium">Ajustar zoom à rede</button>
          <button onClick={() => setShowSaveModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition font-medium">Salvar Projeto</button>
          {selectedDesign && <button onClick={handleNewDesign} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition">Novo Projeto</button>}

          <div className="border-t pt-2">
            <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Projeto / Área</h4>
            <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedArea(''); }} className="w-full text-sm border rounded p-1.5 mb-1">
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="w-full text-sm border rounded p-1.5">
              <option value="">Todas as áreas</option>
              {selectedProject ? (
                projects.find(p => p.id === selectedProject)?.area_id ? (
                  areas.filter(a => a.id === projects.find(p => p.id === selectedProject)?.area_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                ) : <option value="">Nenhuma área vinculada</option>
              ) : areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {canEdit && (
            <div className="border-t pt-2">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1">Edição da Rede</h4>
              <div className="flex flex-col gap-1.5 text-sm">
                <button onClick={() => { setDrawMode(d => d === 'node' ? 'idle' : 'node'); cancelCableMode(); cancelChainMode(); }}
                  className={`px-3 py-1.5 text-sm rounded font-medium transition text-left ${drawMode === 'node' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>📍 Criar Nó</button>
                <button onClick={() => { setDrawMode(d => d === 'cable' ? 'idle' : 'cable'); cancelChainMode(); cancelPathMode(); setCableStartNode(null); setTempLineEnd(null); }}
                  className={`px-3 py-1.5 text-sm rounded font-medium transition text-left ${drawMode === 'cable' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>🔗 Criar Cabo</button>
                <button onClick={() => { setDrawMode(d => d === 'chain' ? 'idle' : 'chain'); cancelCableMode(); cancelPathMode(); setChainStartNode(null); setTempLineEnd(null); }}
                  className={`px-3 py-1.5 text-sm rounded font-medium transition text-left ${drawMode === 'chain' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>🔄 Encadear</button>
                <button onClick={() => { setDrawMode(d => d === 'path' ? 'idle' : 'path'); cancelCableMode(); cancelChainMode(); setPathPoints([]); setPathStartNode(null); }}
                  className={`px-3 py-1.5 text-sm rounded font-medium transition text-left ${drawMode === 'path' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>✏️ Desenhar Caminho</button>
              </div>
              {drawMode !== 'idle' && (
                <button onClick={exitDrawMode} className="mt-1 w-full px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition font-medium">✕ Sair do modo edição</button>
              )}
            </div>
          )}

          {drawMode !== 'idle' && (
            <div className="border-t pt-2">
              <p className="text-xs text-gray-600 font-medium mb-1">{getDrawModeLabel()}</p>
              {drawMode === 'node' && (
                <select value={selectedNodeType} onChange={e => setSelectedNodeType(e.target.value as NodeType)} className="w-full text-sm border rounded p-1.5">
                  <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option>
                </select>
              )}
              {(drawMode === 'cable' || drawMode === 'chain' || drawMode === 'path') && cableTypes.length > 0 && (
                <select value={selectedCableTypeId} onChange={e => setSelectedCableTypeId(e.target.value)} className="w-full text-sm border rounded p-1.5">
                  {cableTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name} ({ct.fiber_count}F)</option>)}
                </select>
              )}
              {drawMode === 'path' && pathPoints.length >= 2 && (
                <button onClick={finishPath} disabled={saving} className="w-full mt-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition font-medium">
                  {saving ? 'Salvando...' : '✓ Finalizar cabo'}
                </button>
              )}
              {drawMode === 'path' && pathPoints.length > 0 && (
                <button onClick={undoPathPoint} className="w-full mt-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition font-medium">
                  ↩ Desfazer último ponto
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {drawMode === 'node' && 'Clique no mapa para posicionar o nó.'}
                {drawMode === 'cable' && 'Clique em nó início, depois em outro nó.'}
                {drawMode === 'chain' && 'Clique nó ou lugar vazio.'}
                {drawMode === 'path' && 'Clique para adicionar pontos. Duplo clique = finalizar. Clique direito = desfazer.'}
              </p>
            </div>
          )}

          {designs.length > 0 && (
            <div className="border-t pt-2">
              <label className="text-xs text-gray-500 mb-1 block font-medium">Carregar Projeto:</label>
              <select value={selectedDesign?.id || ''} onChange={e => { const d = designs.find(x => x.id === e.target.value); if (d) handleLoadDesign(d); }} className="w-full text-sm border rounded p-1.5">
                <option value="">Selecione...</option>
                {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </>)}
      </div>

      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-gray-100">
          <div className="text-gray-500 text-lg">Carregando dados da rede...</div>
        </div>
      ) : (
        <MapContainer
          pops={pops} ctos={ctos} ces={ces} clients={clients} cables={cables} dgos={dgos}
          layers={layers} leaflet={leaflet} getCableColor={getCableColor}
          onMapClick={handleMapClick} setMapRef={setMapRef}
          cableStartNode={cableStartNode} tempLineEnd={tempLineEnd}
          chainStartNode={chainStartNode} drawMode={drawMode}
          cableColor={getCableColorByType(selectedCableTypeId)}
          cableWidth={getCableWidthByType(selectedCableTypeId)}
          pathPoints={pathPoints}
          onDblClick={finishPath}
          onRightClick={undoPathPoint}
          searchedLocation={searchedLocation}
          satelliteView={satelliteView}
        />
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">{selectedDesign ? 'Salvar Alterações' : 'Salvar Novo Projeto'}</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
                <input value={designName} onChange={e => setDesignName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Bairro Centro - Fase 2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={designDesc} onChange={e => setDesignDesc(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Descrição opcional..." /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveDesign} disabled={saving} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showAddNode && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-1">Adicionar Nó</h3>
            <p className="text-xs text-gray-400 mb-4">
              {drawMode === 'chain' && chainStartNode ? `Encadeando a partir de: ${chainStartNode.name}` : ''}
              Coords: {newNodeCoords?.lat.toFixed(6)}, {newNodeCoords?.lng.toFixed(6)}
            </p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={selectedNodeType} onChange={e => setSelectedNodeType(e.target.value as NodeType)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input value={newNodeName} onChange={e => setNewNodeName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder={`Nome do ${selectedNodeType.toUpperCase()}`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input value={newNodeAddress} onChange={e => setNewNodeAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Endereço..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={newNodeStatus} onChange={e => setNewNodeStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="planned">Planejado</option><option value="active">Ativo</option><option value="maintenance">Manutenção</option>
                </select></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddNodeFromMap} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Adicionar'}</button>
              <button onClick={() => { setShowAddNode(false); setNewNodeCoords(null); }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showCableModal && cableStartNode && tempLineEnd && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-1">Criar Cabo</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-blue-600">{cableStartNode.name}</span> → <span className="font-semibold text-green-600">
                {findNearestNode(tempLineEnd.lat, tempLineEnd.lng)?.name || `(${tempLineEnd.lat.toFixed(5)}, ${tempLineEnd.lng.toFixed(5)})`}
              </span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cabo</label>
              <select value={selectedCableTypeId} onChange={e => setSelectedCableTypeId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                {cableTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name} ({ct.fiber_count}F)</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateCableFromModal} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Criando...' : 'Criar Cabo'}</button>
              <button onClick={cancelCableMode} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Fab, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Chip, Typography, IconButton, Switch, FormControlLabel, useMediaQuery, useTheme, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SatelliteIcon from '@mui/icons-material/SatelliteAlt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { api, apiRoutes } from '@/lib/api';

interface NodeData {
  id: string; name: string; address?: string;
  geom?: { type: string; coordinates: number[] };
  status?: string; capacity?: number; installed_splitters?: number;
  plan_mbps?: number; ont_serial?: string; vlan?: number;
  splitter_ratio?: string; type?: string; icon_id?: string;
}

interface CableData {
  id: string; name?: string;
  geom?: { type: string; coordinates: number[][] };
  status: string; cable_type?: string; fiber_count?: number;
  used_fibers?: number; calculated_distance_km?: number; total_fibers?: number;
  node_a_name?: string; node_b_name?: string; node_a_id?: string; node_b_id?: string;
  cable_type_id?: string; cable_color?: string; cable_width?: number; cable_dashed?: boolean;
}

interface LayerVisibility {
  pops: boolean; ctos: boolean; ces: boolean;
  clients: boolean; cables: boolean; dgos: boolean;
}

type DrawMode = 'idle' | 'node' | 'cable' | 'chain' | 'path';
type NodeType = 'cto' | 'ce' | 'pop' | 'client' | 'dgo';

const BASE = '/assets/kml-icons';
const getIconUrl = (iconId: string | null | undefined): string => {
  if (!iconId) return '';
  if (iconId.startsWith('paddle/')) return `${BASE}/${iconId}.png`;
  if (iconId.startsWith('shapes/')) return `${BASE}/${iconId}.png`;
  if (iconId.startsWith('pushpin/')) return `${BASE}/${iconId}.png`;
  return `${BASE}/${iconId}.png`;
};

const DEFAULT_CENTER: [number, number] = [-19.9, -43.9];
const DEFAULT_ZOOM = 13;
const SNAP_DISTANCE = 0.0005;

const MapContainer = dynamic(() => import('./MapView'), { ssr: false });

export default function NetworkMapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showCableModal, setShowCableModal] = useState(false);
  const [newNodeIcon, setNewNodeIcon] = useState('');

  const [newNodeCoords, setNewNodeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeAddress, setNewNodeAddress] = useState('');
  const [newNodeStatus, setNewNodeStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');

  const [statusMsg, setStatusMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NodeData[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [satelliteView, setSatelliteView] = useState(false);
  const [legendItems, setLegendItems] = useState<any[]>([]);
  
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  const [showKmlImport, setShowKmlImport] = useState(false);
  const [kmlPreview, setKmlPreview] = useState<any>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [kmlIconMappings, setKmlIconMappings] = useState<Record<string, string>>({});
  const [kmlCableMappings, setKmlCableMappings] = useState<Record<string, string>>({});
  const [kmlImporting, setKmlImporting] = useState(false);
  const [kmlStep, setKmlStep] = useState<'upload' | 'mapping' | 'importing'>('upload');

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const canEdit = userRole === 'superadmin' || userRole === 'admin';

  const getNodeIconUrl = useCallback((node: NodeData): string => {
    const iconId = node.icon_id;
    if (!iconId) {
      if (legendItems.length === 0) return '';
      const firstLegend = legendItems.find(l => l.node_type !== 'cable');
      return firstLegend ? getIconUrl(firstLegend.icon_id) : '';
    }
    return getIconUrl(iconId);
  }, [legendItems]);

  const showMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const deleteNode = async (node: NodeData) => {
    const routes: Record<string, string> = { pop: 'pops', cto: 'ctos', ce: 'ces', client: 'clients', dgo: 'ces' };
    const type = node.type || (pops.some(p => p.id === node.id) ? 'pop' : ctos.some(c => c.id === node.id) ? 'cto' : ces.some(e => e.id === node.id) ? 'ce' : 'dgo');
    const route = routes[type] || 'ctos';
    try {
      await api.delete('/' + route + '/' + node.id);
      showMsg(`${type.toUpperCase()} excluído.`);
      await refreshAll();
    } catch (err: any) { alert('Erro: ' + (err?.response?.data?.error || err.message)); }
  };

  const allNodes = useMemo(() => [...pops, ...ctos, ...ces, ...dgos], [pops, ctos, ces, dgos]);

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
    try {
      const [popsD, ctosD, cesD, clientsD, cablesD] = await Promise.all([
        api.get(apiRoutes.pops + areaParam), api.get(apiRoutes.ctos + areaParam), api.get(apiRoutes.ces + areaParam),
        api.get(apiRoutes.clients + areaParam), api.get(apiRoutes.cables + areaParam),
      ]);
      const parseGeom = (item: any) => !item.geom ? item : { ...item, geom: typeof item.geom === 'string' ? JSON.parse(item.geom) : item.geom };
      if (popsD?.data) setPops(popsD.data.map(parseGeom));
      if (ctosD?.data) setCtos(ctosD.data.map(parseGeom));
      if (cesD?.data) setCes(cesD.data.map(parseGeom));
      if (clientsD?.data) setClients(clientsD.data.map(parseGeom));
      if (cablesD?.data) setCables(cablesD.data.map(parseGeom));
    } catch (e) { console.error(e); }
  };

  const loadProjectsAndAreas = async () => {
    try {
      const [projectsD, areasD, cableTypesD] = await Promise.all([
        api.get(apiRoutes.projects), api.get(apiRoutes.areas), api.get(apiRoutes.catalogs + '/cable-type'),
      ]);
      if (projectsD?.data) setProjects(projectsD.data);
      if (areasD?.data) setAreas(areasD.data.map((item: any) => !item.geom ? item : { ...item, geom: typeof item.geom === 'string' ? JSON.parse(item.geom) : item.geom }));
      if (cableTypesD?.data) {
        setCableTypes(cableTypesD.data);
        if (cableTypesD.data.length > 0 && !selectedCableTypeId) {
          const dist = cableTypesD.data.find((t: any) => t.name === 'Distribuição');
          setSelectedCableTypeId(dist?.id || cableTypesD.data[0].id);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!isMounted) return;
    import('leaflet').then(L => setLeaflet(L.default));
    loadProjectsAndAreas().catch(console.error);
    refreshAll().catch(console.error).finally(() => setLoading(false));
    api.get(apiRoutes.legend).then(data => { if (data) setLegendItems(data.data || []); }).catch(() => {});
  }, [isMounted]);

  useEffect(() => { refreshAll().catch(console.error); }, [selectedArea]);

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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (drawMode === 'idle') return;
    if (drawMode === 'node') {
      setNewNodeCoords({ lat, lng });
      setNewNodeName(''); setNewNodeAddress(''); setNewNodeStatus('active');
      setShowAddNode(true);
      return;
    }
    if (drawMode === 'cable') {
      const nearest = findNearestNode(lat, lng);
      setTempLineEnd({ lat, lng });
      if (!cableStartNode) {
        if (nearest) { setCableStartNode(nearest); showMsg(`Início: ${nearest.name}`); }
        else { showMsg('Nenhum nó perto'); setTempLineEnd(null); }
      } else {
        if (nearest && nearest.id !== cableStartNode.id) { setShowCableModal(true); }
        else { showMsg('Selecione outro nó'); setTempLineEnd(null); }
      }
      return;
    }
    if (drawMode === 'chain') {
      const nearest = findNearestNode(lat, lng);
      if (!chainStartNode) {
        if (nearest) { setChainStartNode(nearest); setTempLineEnd({ lat, lng }); showMsg(`${nearest.name} → próximo`); }
        else { setNewNodeCoords({ lat, lng }); setNewNodeName(`${selectedNodeType.toUpperCase()} ${Date.now() % 10000}`); setNewNodeAddress(''); setNewNodeStatus('active'); setShowAddNode(true); }
      } else {
        if (nearest && nearest.id !== chainStartNode.id) { createCableBetweenNodes(chainStartNode, nearest); setChainStartNode(nearest); setTempLineEnd({ lat, lng }); }
        else if (!nearest) { setNewNodeCoords({ lat, lng }); setNewNodeName(`${selectedNodeType.toUpperCase()} ${Date.now() % 10000}`); setNewNodeAddress(''); setNewNodeStatus('active'); setShowAddNode(true); }
      }
    }
    if (drawMode === 'path') {
      if (pathPoints.length === 0) {
        const nearest = findNearestNode(lat, lng);
        setPathStartNode(nearest);
        setPathPoints([{ lat, lng }]);
        showMsg(nearest ? `Início: ${nearest.name}` : 'Clique para pontos');
      } else {
        setPathPoints(prev => [...prev, { lat, lng }]);
      }
    }
  }, [drawMode, cableStartNode, chainStartNode, findNearestNode, selectedNodeType, pathPoints]);

  const createCableBetweenNodes = async (nodeA: NodeData, nodeB: NodeData) => {
    setSaving(true);
    try {
      await api.post(apiRoutes.networkNodes + '/cables', {
        node_a_id: nodeA.id, node_b_id: nodeB.id,
        cable_type_id: selectedCableTypeId || undefined,
        area_id: selectedArea || null,
      });
      await refreshAll();
      showMsg(`Cabo: ${nodeA.name} → ${nodeB.name}`);
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleAddNodeFromMap = async () => {
    if (!newNodeCoords || !newNodeName.trim()) { alert('Nome obrigatório'); return; }
    setSaving(true);
    try {
      const route = selectedNodeType === 'pop' ? 'pops' : selectedNodeType === 'ce' ? 'ces' : selectedNodeType === 'client' ? 'clients' : 'ctos';
      await api.post('/' + route, {
        name: newNodeName, address: newNodeAddress,
        lat: newNodeCoords.lat, lng: newNodeCoords.lng,
        status: newNodeStatus, area_id: selectedArea || null, icon_id: newNodeIcon,
      });
      await refreshAll();
      setShowAddNode(false);
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const centerOnNode = (node: NodeData) => {
    if (!node.geom?.coordinates || !mapRef) return;
    mapRef.setView([node.geom.coordinates[1], node.geom.coordinates[0]], 18);
    setShowSearchPanel(false);
  };

  const zoomToFit = useCallback(() => {
    if (!mapRef) return;
    const allPoints: [number, number][] = [];
    const addPoints = (arr: NodeData[]) => arr.forEach((n: NodeData) => { if (n.geom?.coordinates) allPoints.push([n.geom.coordinates[1], n.geom.coordinates[0]]); });
    if (layers.pops) addPoints(pops);
    if (layers.ctos) addPoints(ctos);
    if (layers.ces) addPoints(ces);
    if (allPoints.length > 0) mapRef.fitBounds(allPoints, { padding: [50, 50] });
  }, [mapRef, layers, pops, ctos, ces]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const lowerQ = query.toLowerCase();
    setSearchResults(allNodes.filter(n => (n.name || '').toLowerCase().includes(lowerQ) || (n.address || '').toLowerCase().includes(lowerQ)).slice(0, 10));
  };

  const handleKmlPreview = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/kml/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.data) {
        setKmlPreview(data);
        const mappings: Record<string, string> = {};
        const cableMap: Record<string, string> = {};
        data.data.legendGroups?.forEach((lg: any) => { mappings[lg.styleId] = lg.suggestedType || 'cto'; });
        if (data.data.cableStyles?.length > 0 && cableTypes.length > 0) {
          const dist = cableTypes.find((t: any) => t.name === 'Distribuição');
          data.data.cableStyles.forEach((cs: any) => { cableMap[cs.styleId] = dist?.id || cableTypes[0]?.id || ''; });
        }
        setKmlIconMappings(mappings);
        setKmlCableMappings(cableMap);
      }
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  const handleKmlImport = async () => {
    if (!kmlFile) return;
    setKmlStep('importing');
    setKmlImporting(true);
    const formData = new FormData();
    formData.append('file', kmlFile);
    formData.append('iconMappings', JSON.stringify(kmlIconMappings));
    formData.append('cableMappings', JSON.stringify(kmlCableMappings));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/kml/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.data) {
        setShowKmlImport(false);
        setKmlPreview(null);
        setKmlFile(null);
        setKmlStep('upload');
        showMsg(`Importado: ${data.data.pointsImported} nós, ${data.data.cablesImported} cabos`);
        await refreshAll();
      } else { alert(data.error || 'Erro'); setKmlStep('mapping'); }
    } catch (err: any) { alert('Erro: ' + err.message); setKmlStep('mapping'); }
    finally { setKmlImporting(false); }
  };

  const cancelCableMode = () => { setCableStartNode(null); setTempLineEnd(null); setShowCableModal(false); };
  const cancelChainMode = () => { setChainStartNode(null); setTempLineEnd(null); };
  const cancelPathMode = () => { setPathPoints([]); setPathStartNode(null); };
  const finishPath = async () => {
    if (pathPoints.length < 2) { showMsg('Mínimo 2 pontos'); return; }
    setSaving(true);
    try {
      const firstPt = pathPoints[0]; const lastPt = pathPoints[pathPoints.length - 1];
      const startNode = pathStartNode || findNearestNode(firstPt.lat, firstPt.lng);
      const endNode = findNearestNode(lastPt.lat, lastPt.lng);
      if (!startNode || !endNode) { showMsg('Nós necessários'); setSaving(false); return; }
      await api.post(apiRoutes.networkNodes + '/cables', {
        node_a_id: startNode.id, node_b_id: endNode.id,
        cable_type_id: selectedCableTypeId || undefined,
        area_id: selectedArea || null,
        path: pathPoints.map(p => [p.lng, p.lat]),
      });
      await refreshAll();
      showMsg(`Cabo com ${pathPoints.length} pontos`);
      setPathPoints([]); setPathStartNode(null);
    } catch (err: any) { showMsg('Erro'); }
    finally { setSaving(false); }
  };
  const exitDrawMode = () => { setDrawMode('idle'); cancelCableMode(); cancelChainMode(); cancelPathMode(); };

  const getDrawModeLabel = () => {
    if (drawMode === 'idle') return '';
    if (drawMode === 'node') return `Criar ${selectedNodeType.toUpperCase()}`;
    if (drawMode === 'cable') return cableStartNode ? `${cableStartNode.name} → ?` : 'Cabo';
    if (drawMode === 'chain') return chainStartNode ? `Encadeando` : 'Encadear';
    if (drawMode === 'path') return `${pathPoints.length} pts`;
    return '';
  };

  if (!isMounted) return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Carregando...</Typography></Box>;

  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {statusMsg && (
        <Box sx={{ position: 'absolute', top: isMobile ? 70 : 80, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, bgcolor: 'primary.main', color: 'white', px: 3, py: 1.5, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="body2">{statusMsg}</Typography>
        </Box>
      )}

      {/* Top Search Bar - Mobile */}
      {isMobile && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
              <IconButton onClick={() => setShowLeftPanel(true)}><MenuIcon /></IconButton>
              <Box sx={{ flex: 1, py: 1 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Buscar POP, CTO, endereço..."
                  style={{ width: '100%', border: 'none', outline: 'none', padding: '8px', fontSize: '16px', background: 'transparent' }}
                />
              </Box>
              <IconButton onClick={() => setShowSearchPanel(!showSearchPanel)}><SearchIcon /></IconButton>
            </Box>
            {searchResults.length > 0 && (
              <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
                {searchResults.map((node, i) => (
                  <Box key={i} onClick={() => centerOnNode(node)} sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{node.name}</Typography>
                    {node.address && <Typography variant="caption" color="text.secondary">{node.address}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', gap: 1 }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => setShowLeftPanel(true)}><MenuIcon /></IconButton>
              <Box sx={{ py: 1, pr: 2 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Buscar..."
                  style={{ border: 'none', outline: 'none', padding: '8px 12px', width: 200, fontSize: '14px' }}
                />
              </Box>
            </Box>
            {searchResults.length > 0 && (
              <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
                {searchResults.map((node, i) => (
                  <Box key={i} onClick={() => centerOnNode(node)} sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Typography variant="body2">{node.name}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Right Controls - Desktop */}
      {!isMobile && (
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Tooltip title="Satélite">
            <IconButton onClick={() => setSatelliteView(!satelliteView)} sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'action.hover' } }}>
              <SatelliteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom fit">
            <IconButton onClick={zoomToFit} sx={{ bgcolor: 'background.paper', boxShadow: 2 }}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar KML">
            <IconButton onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/kml/export`, '_blank')} sx={{ bgcolor: 'background.paper', boxShadow: 2 }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Bottom FAB - Mobile */}
      {isMobile && (
        <Box sx={{ position: 'absolute', bottom: 80, right: 16, zIndex: 1000 }}>
          <Fab color="primary" onClick={() => setShowRightPanel(true)}><AddIcon /></Fab>
        </Box>
      )}

      {/* Left Panel - Layers & Controls */}
      <Drawer anchor="left" open={showLeftPanel} onClose={() => setShowLeftPanel(false)}>
        <Box sx={{ width: 280, height: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Camadas</Typography>
            <IconButton onClick={() => setShowLeftPanel(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
          <List dense>
            {[
              { key: 'pops', label: 'POPs', count: pops.length, color: '#dc2626' },
              { key: 'ctos', label: 'CTOs', count: ctos.length, color: '#16a34a' },
              { key: 'ces', label: 'CEs', count: ces.length, color: '#2563eb' },
              { key: 'clients', label: 'Clientes', count: clients.length, color: '#ea580c' },
              { key: 'cables', label: 'Cabos', count: cables.length, color: '#6b7280' },
              { key: 'dgos', label: 'DGO/Switch', count: dgos.length, color: '#9333ea' },
            ].map(item => (
              <ListItem key={item.key} secondaryAction={
                <Switch checked={layers[item.key as keyof LayerVisibility]} onChange={() => toggleLayer(item.key as keyof LayerVisibility)} size="small" />
              }>
                <ListItemIcon>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
                </ListItemIcon>
                <ListItemText primary={item.label} secondary={`${item.count} itens`} />
              </ListItem>
            ))}
          </List>
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>Projetos</Typography>
            <select
              value={selectedProject}
              onChange={e => { setSelectedProject(e.target.value); setSelectedArea(''); }}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid', marginBottom: 8 }}
            >
              <option value="">Todos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid' }}
            >
              <option value="">Todas áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Box>
        </Box>
      </Drawer>

      {/* Right Panel - Tools */}
      <Drawer anchor="right" open={showRightPanel} onClose={() => setShowRightPanel(false)}>
        <Box sx={{ width: isMobile ? '100vw' : 320, height: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Ferramentas</Typography>
            <IconButton onClick={() => setShowRightPanel(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
          
          <Box sx={{ p: 2 }}>
            <button onClick={zoomToFit} style={{ width: '100%', padding: '12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 8 }}>
              Ajustar zoom
            </button>
            <button onClick={() => setShowKmlImport(true)} style={{ width: '100%', padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}>
              📥 Importar KML/KMZ
            </button>

            {canEdit && (
              <>
                <Typography variant="subtitle2" gutterBottom>Edição</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { mode: 'node', label: '📍 Criar Nó', color: drawMode === 'node' ? '#7c3aed' : '#f3f4f6' },
                    { mode: 'cable', label: '🔗 Criar Cabo', color: drawMode === 'cable' ? '#7c3aed' : '#f3f4f6' },
                    { mode: 'chain', label: '🔄 Encadear', color: drawMode === 'chain' ? '#7c3aed' : '#f3f4f6' },
                    { mode: 'path', label: '✏️ Traçar', color: drawMode === 'path' ? '#7c3aed' : '#f3f4f6' },
                  ].map(item => (
                    <button
                      key={item.mode}
                      onClick={() => setDrawMode(drawMode === item.mode ? 'idle' : item.mode as DrawMode)}
                      style={{ padding: '12px', background: item.color, color: drawMode === item.mode ? 'white' : '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                    >
                      {item.label}
                    </button>
                  ))}
                </Box>
              </>
            )}

            {drawMode !== 'idle' && (
              <>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{getDrawModeLabel()}</Typography>
                  {drawMode === 'node' && (
                    <select value={selectedNodeType} onChange={e => setSelectedNodeType(e.target.value as NodeType)} style={{ width: '100%', padding: 8, marginTop: 8, borderRadius: 8 }}>
                      <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option>
                    </select>
                  )}
                  {(drawMode === 'cable' || drawMode === 'chain' || drawMode === 'path') && cableTypes.length > 0 && (
                    <select value={selectedCableTypeId} onChange={e => setSelectedCableTypeId(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8, borderRadius: 8 }}>
                      {cableTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </select>
                  )}
                  {drawMode === 'path' && pathPoints.length >= 2 && (
                    <button onClick={finishPath} disabled={saving} style={{ width: '100%', padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, marginTop: 8, cursor: 'pointer' }}>
                      {saving ? 'Salvando...' : '✓ Finalizar'}
                    </button>
                  )}
                  <button onClick={exitDrawMode} style={{ width: '100%', padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, marginTop: 8, cursor: 'pointer' }}>
                    ✕ Sair
                  </button>
                </Box>
              </>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Visualização</Typography>
              <FormControlLabel
                control={<Switch checked={satelliteView} onChange={() => setSatelliteView(!satelliteView)} />}
                label="Satélite"
              />
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Map */}
      {loading ? (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography>Carregando mapa...</Typography>
        </Box>
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
          searchedLocation={searchedLocation}
          satelliteView={satelliteView}
          onCenterOnNode={centerOnNode}
          onEditNode={(node: NodeData) => { if (node.geom?.coordinates) { setNewNodeCoords({ lat: node.geom.coordinates[1], lng: node.geom.coordinates[0] }); setNewNodeName(node.name); setNewNodeAddress(node.address || ''); setShowAddNode(true); } }}
          onDeleteNode={(node: NodeData) => { if (confirm(`Excluir "${node.name}"?`)) { deleteNode(node); } }}
          getNodeIconUrl={getNodeIconUrl}
        />
      )}

      {/* Add Node Modal */}
      {showAddNode && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 2000, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <Box sx={{ bgcolor: 'background.paper', width: '100%', maxWidth: 500, borderRadius: '16px 16px 0 0', p: 3, maxHeight: '90vh', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Adicionar Nó</Typography>
              <IconButton onClick={() => setShowAddNode(false)}><CloseIcon /></IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Coords: {newNodeCoords?.lat.toFixed(6)}, {newNodeCoords?.lng.toFixed(6)}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <select value={selectedNodeType} onChange={e => setSelectedNodeType(e.target.value as NodeType)} style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}>
                <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option>
              </select>
              <input value={newNodeName} onChange={e => setNewNodeName(e.target.value)} placeholder="Nome *" style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }} />
              <input value={newNodeAddress} onChange={e => setNewNodeAddress(e.target.value)} placeholder="Endereço" style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }} />
              <select value={newNodeStatus} onChange={e => setNewNodeStatus(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc' }}>
                <option value="active">Ativo</option><option value="inactive">Inativo</option><option value="maintenance">Manutenção</option><option value="fault">Falha</option>
              </select>
              {legendItems.filter(l => l.node_type !== 'cable').length > 0 && (
                <Box>
                  <Typography variant="body2" gutterBottom>Ícone</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {legendItems.filter(l => l.node_type !== 'cable').map(item => (
                      <Box key={item.id} onClick={() => setNewNodeIcon(item.icon_id)} sx={{ p: 1, borderRadius: 1, border: '2px solid', borderColor: newNodeIcon === item.icon_id ? 'primary.main' : 'transparent', cursor: 'pointer', bgcolor: newNodeIcon === item.icon_id ? 'primary.light' : 'transparent' }}>
                        <img src={getIconUrl(item.icon_id)} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <button onClick={handleAddNodeFromMap} disabled={saving} style={{ flex: 1, padding: 14, background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
                <button onClick={() => setShowAddNode(false)} style={{ padding: 14, background: '#e5e7eb', border: 'none', borderRadius: 8 }}>Cancelar</button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Cable Modal */}
      {showCableModal && cableStartNode && tempLineEnd && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 2000, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <Box sx={{ bgcolor: 'background.paper', width: '100%', maxWidth: 500, borderRadius: '16px 16px 0 0', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Criar Cabo</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {cableStartNode.name} → ({tempLineEnd.lat.toFixed(5)}, {tempLineEnd.lng.toFixed(5)})
            </Typography>
            {cableTypes.length > 0 && (
              <select value={selectedCableTypeId} onChange={e => setSelectedCableTypeId(e.target.value)} style={{ width: '100%', padding: 12, marginTop: 16, borderRadius: 8, border: '1px solid #ccc' }}>
                {cableTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
              </select>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <button onClick={async () => {
                const nearest = findNearestNode(tempLineEnd.lat, tempLineEnd.lng);
                if (nearest && nearest.id !== cableStartNode.id) { await createCableBetweenNodes(cableStartNode, nearest); }
                setCableStartNode(null); setTempLineEnd(null); setShowCableModal(false);
              }} disabled={saving} style={{ flex: 1, padding: 14, background: '#1976d2', color: 'white', border: 'none', borderRadius: 8, fontSize: 16 }}>
                {saving ? 'Criando...' : 'Criar'}
              </button>
              <button onClick={cancelCableMode} style={{ padding: 14, background: '#e5e7eb', border: 'none', borderRadius: 8 }}>Cancelar</button>
            </Box>
          </Box>
        </Box>
      )}

      {/* KML Import Modal */}
      {showKmlImport && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Box sx={{ bgcolor: 'background.paper', width: '100%', maxWidth: 600, borderRadius: 3, maxHeight: '90vh', overflow: 'auto' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Importar KML/KMZ</Typography>
              <IconButton onClick={() => { setShowKmlImport(false); setKmlPreview(null); setKmlStep('upload'); }}><CloseIcon /></IconButton>
            </Box>
            
            {kmlStep === 'upload' && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
                  <input type="file" accept=".kml,.kmz" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setKmlFile(file); handleKmlPreview(file); } }} style={{ display: 'none' }} id="kml-file" />
                  <label htmlFor="kml-file" style={{ cursor: 'pointer' }}>
                    <Typography variant="h5" gutterBottom>📂</Typography>
                    <Typography>Selecionar arquivo KML/KMZ</Typography>
                    {kmlFile && <Typography color="primary" sx={{ fontWeight: 500, mt: 2 }}>{kmlFile.name}</Typography>}
                  </label>
                </Box>
                {kmlPreview && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Resumo:</Typography>
                    <Chip label={`${kmlPreview.data?.totalPoints || 0} pontos`} sx={{ mr: 1 }} />
                    <Chip label={`${kmlPreview.data?.totalCables || 0} cabos`} sx={{ mr: 1 }} />
                    <Chip label={`${kmlPreview.data?.uniquePaths?.length || 0} pastas`} />
                    <button onClick={() => setKmlStep('mapping')} style={{ width: '100%', padding: 12, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, marginTop: 16, cursor: 'pointer' }}>
                      Continuar →
                    </button>
                  </Box>
                )}
              </Box>
            )}

            {kmlStep === 'mapping' && kmlPreview && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 3 }}>
                  <Typography variant="body2">Após importar, você precisará configurar os nós (adicionar splitters, vinculá-los a OLTs, etc.)</Typography>
                </Box>
                
                {kmlPreview.data?.legendGroups?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Mapear ícones:</Typography>
                    {kmlPreview.data.legendGroups.map((lg: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {lg.iconUrl && <img src={`/assets/kml-icons/${lg.iconUrl}.png`} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
                        <Typography variant="body2" sx={{ flex: 1 }}>{lg.count} ponto(s)</Typography>
                        <select
                          value={kmlIconMappings[lg.styleId] || 'cto'}
                          onChange={(e) => setKmlIconMappings(prev => ({ ...prev, [lg.styleId]: e.target.value }))}
                          style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                        >
                          <option value="pop">POP</option><option value="cto">CTO</option><option value="ce">CE</option><option value="client">Cliente</option><option value="ignore">Ignorar</option>
                        </select>
                      </Box>
                    ))}
                  </Box>
                )}

                {kmlPreview.data?.cableStyles?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Mapear cabos:</Typography>
                    {kmlPreview.data.cableStyles.map((cs: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ width: 40, height: 4, bgcolor: cs.hexColor, borderRadius: 1 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>{cs.count} cabo(s)</Typography>
                        <select
                          value={kmlCableMappings[cs.styleId] || ''}
                          onChange={(e) => setKmlCableMappings(prev => ({ ...prev, [cs.styleId]: e.target.value }))}
                          style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                        >
                          <option value="">Selecione...</option>
                          {cableTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                        </select>
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => setKmlStep('upload')} style={{ padding: 12, background: '#e5e7eb', border: 'none', borderRadius: 8 }}>← Voltar</button>
                  <button onClick={handleKmlImport} disabled={kmlImporting} style={{ flex: 1, padding: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 16 }}>
                    {kmlImporting ? 'Importando...' : '✓ Importar'}
                  </button>
                </Box>
              </Box>
            )}

            {kmlStep === 'importing' && (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>⏳ Importando...</Typography>
                <Typography color="text.secondary">Processando {kmlFile?.name}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
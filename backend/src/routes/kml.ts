import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';
import pool from '../db';
import xml2js from 'xml2js';
import AdmZip from 'adm-zip';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
router.use(authenticateToken);

router.get('/export', async (req: AuthenticatedRequest, res) => {
  try {
    const [pops, ctos, ces, cables, clients] = await Promise.all([
      queryWithRLS(req, 'SELECT id, name, address, ST_X(geom) as lng, ST_Y(geom) as lat, icon_id, icon_color FROM pops WHERE geom IS NOT NULL', []),
      queryWithRLS(req, 'SELECT id, name, address, capacity, status, ST_X(geom) as lng, ST_Y(geom) as lat, icon_id, icon_color FROM ctos WHERE geom IS NOT NULL', []),
      queryWithRLS(req, 'SELECT id, name, address, capacity, ST_X(geom) as lng, ST_Y(geom) as lat, icon_id, icon_color FROM ces WHERE geom IS NOT NULL', []),
      queryWithRLS(req, `SELECT c.id, c.name, c.status, ST_X(ST_StartPoint(c.geom)) as lng_a, ST_Y(ST_StartPoint(c.geom)) as lat_a, ST_X(ST_EndPoint(c.geom)) as lng_b, ST_Y(ST_EndPoint(c.geom)) as lat_b, na.name as node_a_name, nb.name as node_b_name, ct.color, ct.stroke_width FROM cables c LEFT JOIN network_nodes na ON na.id = c.node_a_id LEFT JOIN network_nodes nb ON nb.id = c.node_b_id LEFT JOIN catalog_cable_type ct ON ct.id = c.cable_type_id WHERE c.geom IS NOT NULL`, []),
      queryWithRLS(req, `SELECT cl.id, cl.name, cl.address, cl.phone, cl.plan_mbps, cl.status, cl.ont_serial, cl.vlan, ST_X(cl.geom) as lng, ST_Y(cl.geom) as lat, cl.icon_id, cl.icon_color FROM clients cl WHERE cl.geom IS NOT NULL`, []),
    ]);

    const esc = (s: any) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const getIconUrl = (iconId: string | null, type: string) => {
      if (!iconId) {
        const defaults: Record<string, string> = {
          pop: 'paddle/red-circle.png',
          cto: 'paddle/ylw-circle.png',
          ce: 'paddle/grn-circle.png',
          client: 'paddle/ltblu-circle.png',
        };
        return `http://maps.google.com/mapfiles/kml/${defaults[type] || 'paddle/ylw-circle.png'}`;
      }
      if (iconId.startsWith('pushpin/')) return `http://maps.google.com/mapfiles/kml/${iconId}.png`;
      if (iconId.startsWith('paddle/')) return `http://maps.google.com/mapfiles/kml/${iconId}.png`;
      if (iconId.startsWith('shapes/')) return `http://maps.google.com/mapfiles/kml/shapes/${iconId.replace('shapes/', '')}.png`;
      return `http://maps.google.com/mapfiles/kml/${iconId}.png`;
    };

    const getIconColor = (iconColor: string | null, fallback: string) => {
      return iconColor || fallback;
    };

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document>
  <name>Rede FTTH - Infotec MG</name>
  <Style id="pop"><IconStyle><color>${getIconColor(pops.rows[0]?.icon_color, 'ff0000ff')}</color><scale>1.3</scale><Icon><href>${getIconUrl(pops.rows[0]?.icon_id || 'red-pushpin', 'pop')}</href></Icon></IconStyle></Style>
  <Style id="cto"><IconStyle><color>${getIconColor(ctos.rows[0]?.icon_color, 'ff00ff00')}</color><scale>1.1</scale><Icon><href>${getIconUrl(ctos.rows[0]?.icon_id || 'ylw-pushpin', 'cto')}</href></Icon></IconStyle></Style>
  <Style id="ce"><IconStyle><color>${getIconColor(ces.rows[0]?.icon_color, 'ff0000ff')}</color><scale>1.0</scale><Icon><href>${getIconUrl(ces.rows[0]?.icon_id || 'grn-pushpin', 'ce')}</href></Icon></IconStyle></Style>
  <Style id="client"><IconStyle><color>${getIconColor(clients.rows[0]?.icon_color, 'ff00aaff')}</color><scale>0.8</scale><Icon><href>${getIconUrl(clients.rows[0]?.icon_id || 'ltblu-pushpin', 'client')}</href></Icon></IconStyle></Style>
  <Style id="cable"><LineStyle><color>${getIconColor(cables.rows[0]?.color, 'ff00ffff')}</color><width>${cables.rows[0]?.stroke_width || 4}</width></LineStyle></Style>`;

    pops.rows.forEach(p => { kml += `\n  <Placemark><name>${esc(p.name)}</name><description><![CDATA[<b>Tipo:</b> POP<br/><b>Endereço:</b> ${esc(p.address)}]]></description><styleUrl>#pop</styleUrl><Point><gx:drawOrder>1</gx:drawOrder><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`; });
    ctos.rows.forEach(c => { kml += `\n  <Placemark><name>${esc(c.name)}</name><description><![CDATA[<b>Tipo:</b> CTO<br/><b>Endereço:</b> ${esc(c.address)}]]></description><styleUrl>#cto</styleUrl><Point><gx:drawOrder>1</gx:drawOrder><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`; });
    ces.rows.forEach(c => { kml += `\n  <Placemark><name>${esc(c.name)}</name><description><![CDATA[<b>Tipo:</b> CE<br/><b>Endereço:</b> ${esc(c.address)}]]></description><styleUrl>#ce</styleUrl><Point><gx:drawOrder>1</gx:drawOrder><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`; });
    cables.rows.forEach(c => { if (c.lng_a && c.lat_a && c.lng_b && c.lat_b) { kml += `\n  <Placemark><name>${esc(c.name || (c.node_a_name + ' → ' + c.node_b_name))}</name><description><![CDATA[<b>Cabo de fibra</b>]]></description><styleUrl>#cable</styleUrl><LineString><tessellate>1</tessellate><coordinates>${c.lng_a},${c.lat_a},0 ${c.lng_b},${c.lat_b},0</coordinates></LineString></Placemark>`; } });
    clients.rows.forEach(cl => { if (cl.lng && cl.lat) { kml += `\n  <Placemark><name>${esc(cl.name)}</name><description><![CDATA[<b>Cliente</b><br/><b>Plano:</b> ${cl.plan_mbps} Mbps<br/><b>Status:</b> ${esc(cl.status)}]]></description><styleUrl>#client</styleUrl><Point><gx:drawOrder>1</gx:drawOrder><coordinates>${cl.lng},${cl.lat},0</coordinates></Point></Placemark>`; } });

    kml += `
</Document>
</kml>`;

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', 'attachment; filename=ftth_rede_completa.kml');
    res.send(kml);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao exportar KML: ' + error.message });
  }
});

const hexToKmlColor = (hex: string): string => {
  if (!hex) return 'ff00ffff';
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return 'ff' + clean.substring(4, 6) + clean.substring(2, 4) + clean.substring(0, 2);
  }
  return 'ff00ffff';
};

const kmlColorToHex = (kmlColor: string): string => {
  if (!kmlColor || kmlColor.length !== 8) return '#00ffff';
  const a = kmlColor.substring(0, 2);
  const b = kmlColor.substring(2, 4);
  const c = kmlColor.substring(4, 6);
  const d = kmlColor.substring(6, 8);
  return '#' + c + b + a;
};

const extractCoords = (coords: string | undefined | null) => {
  if (!coords || !String(coords).trim()) return null;
  const parts = String(coords).trim().split(/[\s,]+/);
  if (parts.length >= 2) return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
  return null;
};

const extractMultiCoords = (coords: string | undefined | null) => {
  if (!coords || !String(coords).trim()) return [];
  return String(coords).trim().split(/\s+/).map(c => {
    const parts = c.split(',');
    return parts.length >= 2 ? { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) } : null;
  }).filter(Boolean) as { lng: number; lat: number }[];
};

interface KmlStyle {
  id: string;
  iconUrl?: string;
  color?: string;
  width?: number;
  isLine?: boolean;
}

const parseStyles = (doc: any): Map<string, KmlStyle> => {
  const styles = new Map<string, KmlStyle>();
  
  const extractIconFromStyle = (styleEl: any): string | undefined => {
    if (styleEl.IconStyle?.[0]?.Icon?.[0]?.href?.[0]) {
      const href = styleEl.IconStyle[0].Icon[0].href[0];
      const match = href.match(/kml\/(?:paddleushpin|shapes)\/([^\.]+)/);
      if (match) return match[1];
      if (href.includes('donut')) return 'shapes/donut';
      if (href.includes('target')) return 'shapes/target';
      if (href.includes('star')) return 'paddle/star';
      if (href.includes('square')) return 'paddle/square';
      if (href.includes('circle')) return 'paddle/circle';
      if (href.includes('diamond')) return 'paddle/diamond';
      if (href.includes('paddle/')) {
        const paddleMatch = href.match(/paddle\/([^\/]+\.png)/);
        if (paddleMatch) return 'paddle/' + paddleMatch[1].replace('.png', '');
      }
      if (href.includes('pushpin/')) {
        const pinMatch = href.match(/pushpin\/([^\/]+\.png)/);
        if (pinMatch) return 'pushpin/' + pinMatch[1].replace('.png', '');
      }
      if (href.includes('shapes/')) {
        const shapeMatch = href.match(/shapes\/([^\/]+\.png)/);
        if (shapeMatch) return 'shapes/' + shapeMatch[1].replace('.png', '');
      }
    }
    return undefined;
  };

  const extractColorFromStyle = (styleEl: any): string | undefined => {
    if (styleEl.IconStyle?.[0]?.color?.[0]) return styleEl.IconStyle[0].color[0];
    if (styleEl.LineStyle?.[0]?.color?.[0]) return styleEl.LineStyle[0].color[0];
    return undefined;
  };

  const extractWidthFromStyle = (styleEl: any): number | undefined => {
    if (styleEl.LineStyle?.[0]?.width?.[0]) return parseInt(styleEl.LineStyle[0].width[0]);
    return undefined;
  };

  const processStyle = (styleEl: any, id: string) => {
    if (!styles.has(id)) {
      styles.set(id, { id });
    }
    const s = styles.get(id)!;
    const url = extractIconFromStyle(styleEl);
    if (url) s.iconUrl = url;
    const color = extractColorFromStyle(styleEl);
    if (color) s.color = color;
    const width = extractWidthFromStyle(styleEl);
    if (width) s.width = width;
    if (styleEl.LineStyle) s.isLine = true;
  };

  if (doc.Style) {
    for (const style of doc.Style) {
      const id = (style.$.id || style.id?.[0] || '').replace('#', '');
      if (id) processStyle(style, id);
    }
  }

  if (doc.StyleMap) {
    for (const sm of doc.StyleMap) {
      const id = (sm.$.id || sm.id?.[0] || '').replace('#', '');
      if (!id || !sm.Pair) continue;
      for (const pair of sm.Pair) {
        if (pair.styleUrl?.[0]) {
          let refId = String(pair.styleUrl[0]).replace('#', '');
          const targetStyle = styles.get(refId);
          if (targetStyle && !styles.has(id)) {
            styles.set(id, { id, iconUrl: targetStyle.iconUrl, color: targetStyle.color, width: targetStyle.width, isLine: targetStyle.isLine });
          }
        }
      }
    }
  }

  return styles;
};

const classifyNodeByStyle = (style: KmlStyle | undefined): string => {
  if (!style) return 'cto';
  const url = style.iconUrl || '';
  const name = style.id || '';
  
  if (url.includes('red') || name.includes('red') || url.includes('red-circle') || url.includes('red-pushpin')) return 'pop';
  if (url.includes('grn') || name.includes('grn') || url.includes('grn-circle') || url.includes('grn-pushpin')) return 'ce';
  if (url.includes('blu') || name.includes('blu') || url.includes('ltblu') || url.includes('blu-circle')) return 'client';
  if (url.includes('ylw') || name.includes('ylw') || url.includes('ylw-circle') || url.includes('ylw-pushpin')) return 'cto';
  if (url.includes('donut') || url.includes('target') || url.includes('donut')) return 'cto';
  return 'cto';
};

const traverseElements = (elements: any[], path: string[], results: any[], styleMap: Map<string, KmlStyle>) => {
  for (const el of elements) {
    if (el.Folder) {
      for (const folder of el.Folder) {
        const name = (folder.name?.[0] || folder.name || '').trim();
        const newPath = path.concat(name).filter(Boolean);
        traverseElements([folder], newPath, results, styleMap);
      }
    }
    if (el.Placemark) {
      for (const pm of el.Placemark) {
        let rawStyleUrl = '';
        if (pm.styleUrl) rawStyleUrl = Array.isArray(pm.styleUrl) ? pm.styleUrl[0] : pm.styleUrl;
        else if (pm.$?.styleUrl) rawStyleUrl = pm.$.styleUrl;
        rawStyleUrl = String(rawStyleUrl || '').replace(/^#/, '');

        const name = (pm.name?.[0] || pm.name || '').trim();
        const style = styleMap.get(rawStyleUrl);
        const nodeType = classifyNodeByStyle(style);
        const isLine = style?.isLine || false;

        if (pm.Point && !isLine) {
          const coordsEl = pm.Point[0]?.coordinates?.[0];
          const pt = extractCoords(typeof coordsEl === 'string' ? coordsEl : coordsEl?._);
          if (pt) results.push({ 
            type: 'point', 
            name, 
            styleUrl: rawStyleUrl,
            style: style,
            nodeType,
            path: path.join(' > '), 
            coords: pt 
          });
        }
        if (pm.LineString || isLine) {
          const coordsEl = pm.LineString?.[0]?.coordinates?.[0];
          const pts = extractMultiCoords(typeof coordsEl === 'string' ? coordsEl : coordsEl?._);
          if (pts.length >= 2) results.push({ 
            type: 'line', 
            name, 
            styleUrl: rawStyleUrl,
            style: style,
            path: path.join(' > '), 
            coords: pts 
          });
        }
      }
    }
  }
};

const parseKmlContent = (kmlContent: string) => {
  const parser = new xml2js.Parser();
  return parser.parseStringPromise(kmlContent);
};

router.post('/preview', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Arquivo KML/KMZ é obrigatório' }); return; }
    
    let kmlContent: string;
    let fileName = req.file.originalname;
    
    if (fileName.toLowerCase().endsWith('.kmz')) {
      const zip = new AdmZip(req.file.buffer);
      const kmlEntry = zip.getEntry('doc.kml');
      if (!kmlEntry) {
        const kmlFiles = zip.getEntries().filter(e => e.entryName.endsWith('.kml'));
        if (kmlFiles.length === 0) {
          res.status(400).json({ error: 'KMZ inválido: não contém doc.kml' }); return;
        }
        kmlContent = kmlFiles[0].getData().toString('utf8');
      } else {
        kmlContent = kmlEntry.getData().toString('utf8');
      }
    } else {
      kmlContent = req.file.buffer.toString('utf-8');
    }
    
    const parsed = await parseKmlContent(kmlContent);
    const doc = parsed.kml?.Document?.[0] || {};

    const styleMap = parseStyles(doc);
    const results: any[] = [];
    traverseElements([doc], [], results, styleMap);

    const points = results.filter(r => r.type === 'point');
    const lines = results.filter(r => r.type === 'line');

    const uniquePaths = [...new Set(results.map(r => r.path).filter(Boolean))];

    const legendGroups = new Map<string, { count: number; iconUrl?: string; color?: string; styleId: string; nodeType?: string }>();
    
    points.forEach(p => {
      const key = p.styleUrl || 'default';
      if (!legendGroups.has(key)) {
        legendGroups.set(key, { 
          count: 1, 
          iconUrl: p.style?.iconUrl, 
          color: p.style?.color, 
          styleId: key,
          nodeType: classifyNodeByStyle(p.style)
        });
      } else {
        legendGroups.get(key)!.count++;
      }
    });

    const cableStyles = new Map<string, { count: number; color?: string; width?: number }>();
    lines.forEach(l => {
      const key = l.styleUrl || 'default';
      if (!cableStyles.has(key)) {
        cableStyles.set(key, { count: 1, color: l.style?.color, width: l.style?.width });
      } else {
        cableStyles.get(key)!.count++;
      }
    });

    res.json({
      data: {
        totalPoints: points.length,
        totalCables: lines.length,
        uniquePaths,
        samplePoints: points.slice(0, 5),
        sampleCables: lines.slice(0, 5),
        legendGroups: Array.from(legendGroups.entries()).map(([key, val]) => ({
          styleId: key,
          iconUrl: val.iconUrl,
          color: val.color,
          hexColor: val.color ? kmlColorToHex(val.color) : undefined,
          count: val.count,
          suggestedType: val.nodeType || 'cto',
        })),
        cableStyles: Array.from(cableStyles.entries()).map(([key, val]) => ({
          styleId: key,
          color: val.color,
          hexColor: val.color ? kmlColorToHex(val.color) : '#00ffff',
          width: val.width || 3,
          count: val.count,
        })),
      }
    });
  } catch (error: any) {
    console.error('KML Preview error:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo: ' + error.message });
  }
});

router.post('/import', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Arquivo KML/KMZ é obrigatório' }); return; }
    
    const iconMappings = req.body.iconMappings ? JSON.parse(req.body.iconMappings) : {};
    const cableMappings = req.body.cableMappings ? JSON.parse(req.body.cableMappings) : {};
    
    let kmlContent: string;
    let fileName = req.file.originalname;
    
    if (fileName.toLowerCase().endsWith('.kmz')) {
      const zip = new AdmZip(req.file.buffer);
      const kmlEntry = zip.getEntry('doc.kml');
      if (!kmlEntry) {
        const kmlFiles = zip.getEntries().filter(e => e.entryName.endsWith('.kml'));
        if (kmlFiles.length === 0) {
          res.status(400).json({ error: 'KMZ inválido: não contém doc.kml' }); return;
        }
        kmlContent = kmlFiles[0].getData().toString('utf8');
      } else {
        kmlContent = kmlEntry.getData().toString('utf8');
      }
    } else {
      kmlContent = req.file.buffer.toString('utf-8');
    }
    
    const parsed = await parseKmlContent(kmlContent);
    const doc = parsed.kml?.Document?.[0] || {};

    const styleMap = parseStyles(doc);
    const results: any[] = [];
    traverseElements([doc], [], results, styleMap);

    const result = {
      pointsImported: 0, cablesImported: 0, skipped: 0,
      projectsCreated: 0, areasCreated: 0,
      legendsCreated: 0,
      iconsMapped: Object.keys(iconMappings).length,
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant_id = '${req.user?.tenant_id}'`);

      for (const [styleId, nodeType] of Object.entries(iconMappings)) {
        const style = styleMap.get(styleId as string);
        const iconUrl = style?.iconUrl || styleId;
        const hexColor = style?.color ? kmlColorToHex(style.color) : '#6b7280';
        
        const existing = await client.query(
          `SELECT id FROM map_legend WHERE tenant_id = $1 AND icon_id = $2 LIMIT 1`,
          [req.user?.tenant_id, iconUrl]
        );
        if (existing.rows.length === 0) {
          const name = nodeType === 'pop' ? 'POP' : nodeType === 'cto' ? 'CTO' : nodeType === 'ce' ? 'CE' : nodeType === 'client' ? 'Cliente' : 'Item';
          await client.query(
            `INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user?.tenant_id, name, nodeType, iconUrl, hexColor, 'Importado do KML/KMZ']
          );
          result.legendsCreated++;
        }
      }

      for (const [styleId, cableTypeId] of Object.entries(cableMappings)) {
        const style = styleMap.get(styleId as string);
        if (!style?.color) continue;
        
        const hexColor = kmlColorToHex(style.color);
        const existing = await client.query(
          `SELECT id FROM catalog_cable_type WHERE id = $1 AND tenant_id = $2`,
          [cableTypeId, req.user?.tenant_id]
        );
        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE catalog_cable_type SET color = $1 WHERE id = $2`,
            [hexColor, cableTypeId]
          );
        }
      }

      const nodeCache = new Map<string, string>();

      const getOrCreateNode = async (pt: { lng: number; lat: number }, name: string, areaId: string | null, nodeType: string, iconUrl?: string, iconColor?: string) => {
        const key = `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)}`;
        if (nodeCache.has(key)) return nodeCache.get(key)!;

        const table = nodeType === 'pop' ? 'pops' : nodeType === 'ce' ? 'ces' : nodeType === 'client' ? 'clients' : 'ctos';

        const existing = await client.query(
          `SELECT id FROM ${table} WHERE tenant_id = $1 AND ST_DWithin(geom, ST_SetSRID(ST_Point($2, $3), 4326), 0.0001)`,
          [req.user?.tenant_id, pt.lng, pt.lat]
        );

        let nodeId: string;
        if (existing.rows.length > 0) {
          nodeId = existing.rows[0].id;
        } else {
          const created = await client.query(
            `INSERT INTO ${table} (tenant_id, area_id, name, address, geom, icon_id, icon_color) 
             VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326), $7, $8) RETURNING id`,
            [req.user?.tenant_id, areaId, name || `${nodeType.toUpperCase()} ${Date.now() % 100000}`, '', pt.lng, pt.lat, iconUrl || null, iconColor || null]
          );
          nodeId = created.rows[0].id;
          result.pointsImported++;
        }
        nodeCache.set(key, nodeId);
        return nodeId;
      };

      const getOrCreateProjectArea = async (path: string): Promise<{ projectId: string | null; areaId: string | null }> => {
        const parts = path.split(' > ').filter(Boolean);
        if (parts.length === 0) return { projectId: null, areaId: null };

        const projectName = parts[0] || 'Projeto Importado';
        let projectId: string | null = null;

        const existingProj = await client.query(
          `SELECT id FROM projects WHERE tenant_id = $1 AND name = $2 LIMIT 1`,
          [req.user?.tenant_id, projectName]
        );
        if (existingProj.rows.length > 0) {
          projectId = existingProj.rows[0].id;
        } else {
          const created = await client.query(
            `INSERT INTO projects (tenant_id, name, status, created_by) VALUES ($1, $2, 'active', $3) RETURNING id`,
            [req.user?.tenant_id, projectName, req.user?.user_id]
          );
          projectId = created.rows[0].id;
          result.projectsCreated++;
        }

        let areaId: string | null = null;
        if (parts.length > 1) {
          const areaName = parts[parts.length - 1];
          const existingArea = await client.query(
            `SELECT id FROM areas WHERE tenant_id = $1 AND name = $2 LIMIT 1`,
            [req.user?.tenant_id, areaName]
          );
          if (existingArea.rows.length > 0) {
            areaId = existingArea.rows[0].id;
          } else {
            const created = await client.query(
              `INSERT INTO areas (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
              [req.user?.tenant_id, areaName, `Área de ${projectName}`]
            );
            areaId = created.rows[0].id;
            result.areasCreated++;
          }
          await client.query(`UPDATE projects SET area_id = $1 WHERE id = $2`, [areaId, projectId]);
        }

        return { projectId, areaId };
      };

      const pathAreaCache = new Map<string, { projectId: string | null; areaId: string | null }>();

      for (const item of results) {
        if (item.type === 'point') {
          if (!item.coords) { result.skipped++; continue; }
          let areaId: string | null = null;
          if (item.path) {
            if (!pathAreaCache.has(item.path)) {
              pathAreaCache.set(item.path, await getOrCreateProjectArea(item.path));
            }
            areaId = pathAreaCache.get(item.path)!.areaId;
          }
          
          const mappedType = iconMappings[item.styleUrl] || item.nodeType;
          await getOrCreateNode(item.coords, item.name || `${mappedType.toUpperCase()} ${Date.now() % 100000}`, areaId, mappedType, item.style?.iconUrl, item.style?.color ? kmlColorToHex(item.style.color) : undefined);
        }

        if (item.type === 'line') {
          if (!item.coords || item.coords.length < 2) { result.skipped++; continue; }
          let areaId: string | null = null;
          if (item.path) {
            if (!pathAreaCache.has(item.path)) {
              pathAreaCache.set(item.path, await getOrCreateProjectArea(item.path));
            }
            areaId = pathAreaCache.get(item.path)!.areaId;
          }

          const endA = await getOrCreateNode(item.coords[0], `${item.name || 'Cabo'} (A)`, areaId, 'cto');
          const endB = await getOrCreateNode(item.coords[item.coords.length - 1], `${item.name || 'Cabo'} (B)`, areaId, 'cto');

          const coordText = item.coords.map((p: any) => `${p.lng} ${p.lat}`).join(', ');
          const geomWkt = `LINESTRING(${coordText})`;

          const distResult = await client.query(
            `SELECT ST_Length(ST_GeomFromText($1, 4326)::geography) / 1000 as km`,
            [geomWkt]
          );
          const distanceKm = distResult.rows[0]?.km || 0;

          let cableTypeId: string | null = cableMappings[item.styleUrl] || null;
          
          await client.query(
            `INSERT INTO cables (tenant_id, area_id, node_a_id, node_b_id, name, calculated_distance_km, cable_type_id, geom)
             VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeomFromText($8, 4326))`,
            [req.user?.tenant_id, areaId, endA, endB, item.name || 'Cabo importado', Math.round(distanceKm * 1000) / 1000, cableTypeId, geomWkt]
          );
          result.cablesImported++;
        }
      }

      await client.query('COMMIT');
      res.json({
        data: result,
        message: `Importados ${result.pointsImported} nós e ${result.cablesImported} cabos. ${result.legendsCreated} itens de legenda criados. ${result.projectsCreated} projeto(s) e ${result.areasCreated} área(s). ${result.skipped > 0 ? result.skipped + ' itens ignorados.' : ''}`
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('KML Import error:', error);
    res.status(500).json({ error: 'Erro ao importar arquivo: ' + error.message });
  }
});

router.get('/template', async (req: AuthenticatedRequest, res) => {
  const template = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FTTH Network - Infotec</name>
    <Style id="pop"><IconStyle><color>ff0000ff</color><scale>1.3</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle></Style>
    <Style id="cto"><IconStyle><color>ff00ff00</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon></IconStyle></Style>
    <Style id="cable"><LineStyle><color>ff00ffff</color><width>4</width></LineStyle></Style>
    <Folder>
      <name>Cidade / Bairro</name>
      <Folder>
        <name>POPS</name>
        <Placemark><name>POP Principal</name><styleUrl>#pop</styleUrl><Point><coordinates>-43.9345,-19.9321,0</coordinates></Point></Placemark>
      </Folder>
      <Folder>
        <name>CTOs e Cabos</name>
        <Placemark><name>CTO Centro 1</name><styleUrl>#cto</styleUrl><Point><coordinates>-43.9345,-19.9331,0</coordinates></Point></Placemark>
        <Placemark><name>Cabo Principal</name><styleUrl>#cable</styleUrl><LineString><tessellate>1</tessellate><coordinates>-43.9345,-19.9321,0 -43.9350,-19.9325,0 -43.9355,-19.9330,0</coordinates></LineString></Placemark>
      </Folder>
    </Folder>
  </Document>
</kml>`;
  res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
  res.setHeader('Content-Disposition', 'attachment; filename=ftth_template.kml');
  res.send(template);
});

export default router;
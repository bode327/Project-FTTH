import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { queryWithRLS } from '../db';
import pool from '../db';
import xml2js from 'xml2js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
router.use(authenticateToken);

router.get('/export', async (req: AuthenticatedRequest, res) => {
  try {
    const [pops, ctos, ces, cables, clients] = await Promise.all([
      queryWithRLS(req, 'SELECT id, name, address, ST_X(geom) as lng, ST_Y(geom) as lat FROM pops WHERE geom IS NOT NULL', []),
      queryWithRLS(req, 'SELECT id, name, address, capacity, status, ST_X(geom) as lng, ST_Y(geom) as lat FROM ctos WHERE geom IS NOT NULL', []),
      queryWithRLS(req, 'SELECT id, name, address, capacity, ST_X(geom) as lng, ST_Y(geom) as lat FROM ces WHERE geom IS NOT NULL', []),
      queryWithRLS(req, `SELECT c.id, ST_X(ST_StartPoint(c.geom)) as lng_a, ST_Y(ST_StartPoint(c.geom)) as lat_a, ST_X(ST_EndPoint(c.geom)) as lng_b, ST_Y(ST_EndPoint(c.geom)) as lat_b, na.name as node_a_name, nb.name as node_b_name FROM cables c LEFT JOIN network_nodes na ON na.id = c.node_a_id LEFT JOIN network_nodes nb ON nb.id = c.node_b_id WHERE c.geom IS NOT NULL`, []),
      queryWithRLS(req, `SELECT cl.id, cl.name, cl.address, cl.phone, cl.plan_mbps, cl.status, cl.ont_serial, cl.vlan, ST_X(cl.geom) as lng, ST_Y(cl.geom) as lat FROM clients cl WHERE cl.geom IS NOT NULL`, []),
    ]);

    const esc = (s: any) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const placemarks: string[] = [];

    pops.rows.forEach(p => { placemarks.push(`<Placemark><name>${esc(p.name)}</name><description><![CDATA[<b>Tipo:</b> POP<br/><b>Endereço:</b> ${esc(p.address)}]]></description><styleUrl>#pop</styleUrl><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`); });
    ctos.rows.forEach(c => { placemarks.push(`<Placemark><name>${esc(c.name)}</name><description><![CDATA[<b>Tipo:</b> CTO<br/><b>Endereço:</b> ${esc(c.address)}]]></description><styleUrl>#cto</styleUrl><Point><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`); });
    ces.rows.forEach(c => { placemarks.push(`<Placemark><name>${esc(c.name)}</name><description><![CDATA[<b>Tipo:</b> CE<br/><b>Endereço:</b> ${esc(c.address)}]]></description><styleUrl>#ce</styleUrl><Point><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`); });
    cables.rows.forEach(c => { if (c.lng_a && c.lat_a && c.lng_b && c.lat_b) { placemarks.push(`<Placemark><name>${esc(c.node_a_name || 'Nó')} → ${esc(c.node_b_name || 'Nó')}</name><description><![CDATA[<b>Cabo de fibra</b>]]></description><styleUrl>#cable</styleUrl><LineString><coordinates>${c.lng_a},${c.lat_a},0 ${c.lng_b},${c.lat_b},0</coordinates></LineString></Placemark>`); } });
    clients.rows.forEach(cl => { if (cl.lng && cl.lat) { placemarks.push(`<Placemark><name>${esc(cl.name)}</name><description><![CDATA[<b>Cliente</b><br/><b>Plano:</b> ${cl.plan_mbps} Mbps<br/><b>Status:</b> ${esc(cl.status)}]]></description><styleUrl>#client</styleUrl><Point><coordinates>${cl.lng},${cl.lat},0</coordinates></Point></Placemark>`); } });

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Rede FTTH - Infotec MG</name>
  <Style id="pop"><IconStyle><color>ff0000ff</color><scale>1.3</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle></Style>
  <Style id="cto"><IconStyle><color>ff00ff00</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon></IconStyle></Style>
  <Style id="ce"><IconStyle><color>ff0000ff</color><scale>1.0</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon></IconStyle></Style>
  <Style id="cable"><LineStyle><color>ff00aaff</color><width>4</width></LineStyle></Style>
  <Style id="client"><IconStyle><color>ffffaa00</color><scale>0.8</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon></IconStyle></Style>
  <Folder><name>POPS</name>${pops.rows.map(p => `<Placemark><name>${esc(p.name)}</name><styleUrl>#pop</styleUrl><Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`).join('')}</Folder>
  <Folder><name>CTOs</name>${ctos.rows.map(c => `<Placemark><name>${esc(c.name)}</name><styleUrl>#cto</styleUrl><Point><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`).join('')}</Folder>
  <Folder><name>CEs</name>${ces.rows.map(c => `<Placemark><name>${esc(c.name)}</name><styleUrl>#ce</styleUrl><Point><coordinates>${c.lng},${c.lat},0</coordinates></Point></Placemark>`).join('')}</Folder>
  <Folder><name>Cabos</name>${cables.rows.filter(c => c.lng_a && c.lat_a && c.lng_b && c.lat_b).map(c => `<Placemark><name>${esc(c.name)}</name><styleUrl>#cable</styleUrl><LineString><coordinates>${c.lng_a},${c.lat_a},0 ${c.lng_b},${c.lat_b},0</coordinates></LineString></Placemark>`).join('')}</Folder>
  <Folder><name>Clientes</name>${clients.rows.filter(cl => cl.lng && cl.lat).map(cl => `<Placemark><name>${esc(cl.name)}</name><styleUrl>#client</styleUrl><Point><coordinates>${cl.lng},${cl.lat},0</coordinates></Point></Placemark>`).join('')}</Folder>
  ${placemarks.join('\n')}
</Document>
</kml>`;

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', 'attachment; filename=ftth_rede_completa.kml');
    res.send(kml);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao exportar KML: ' + error.message });
  }
});

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

const traverseElements = (elements: any[], path: string[], results: any[]) => {
  for (const el of elements) {
    if (el.Folder) {
      for (const folder of el.Folder) {
        const name = (folder.name?.[0] || folder.name || '').trim();
        const newPath = [...path, name];
        traverseElements([folder], newPath, results);
      }
    }
    if (el.Placemark) {
      for (const pm of el.Placemark) {
        let rawStyleUrl = '';
        if (pm.styleUrl) rawStyleUrl = Array.isArray(pm.styleUrl) ? pm.styleUrl[0] : pm.styleUrl;
        else if (pm.$?.styleUrl) rawStyleUrl = pm.$.styleUrl;
        rawStyleUrl = String(rawStyleUrl || '').replace(/^#/, '');

        const name = (pm.name?.[0] || pm.name || '').trim();

        if (pm.Point) {
          const coordsEl = pm.Point[0]?.coordinates?.[0];
          const pt = extractCoords(typeof coordsEl === 'string' ? coordsEl : coordsEl?._);
          if (pt) results.push({ type: 'point', name, styleUrl: rawStyleUrl, path: path.join(' > '), coords: pt });
        }
        if (pm.LineString) {
          const coordsEl = pm.LineString[0]?.coordinates?.[0];
          const pts = extractMultiCoords(typeof coordsEl === 'string' ? coordsEl : coordsEl?._);
          if (pts.length >= 2) results.push({ type: 'line', name, styleUrl: rawStyleUrl, path: path.join(' > '), coords: pts });
        }
      }
    }
  }
};

router.post('/preview', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Arquivo KML é obrigatório' }); return; }
    const kml = req.file.buffer.toString('utf-8');
    const parser = new xml2js.Parser();
    const parsed = await parser.parseStringPromise(kml);
    const doc = parsed.kml?.Document?.[0] || {};
    const results: any[] = [];
    traverseElements([doc], [], results);

    const points = results.filter(r => r.type === 'point');
    const lines = results.filter(r => r.type === 'line');

    const uniquePaths = [...new Set(results.map(r => r.path).filter(Boolean))];
    const pathCounts = uniquePaths.map(p => {
      const pts = results.filter(r => r.path === p && r.type === 'point');
      const lns = results.filter(r => r.path === p && r.type === 'line');
      return { path: p, points: pts.length, cables: lns.length };
    }).sort((a, b) => (b.points + b.cables) - (a.points + a.cables));

    const styleSamples = [...new Set(results.map(r => r.styleUrl).filter(Boolean))].slice(0, 20);

    res.json({
      data: {
        totalPoints: points.length,
        totalCables: lines.length,
        uniquePaths,
        pathCounts,
        styleSamples,
        samplePoints: points.slice(0, 5),
        sampleCables: lines.slice(0, 5),
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao processar KML: ' + error.message });
  }
});

router.post('/import', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Arquivo KML é obrigatório' }); return; }
    const kml = req.file.buffer.toString('utf-8');
    const parser = new xml2js.Parser();
    const parsed = await parser.parseStringPromise(kml);
    const doc = parsed.kml?.Document?.[0] || {};
    const results: any[] = [];
    traverseElements([doc], [], results);

    const result = {
      pointsImported: 0, cablesImported: 0, skipped: 0,
      projectsCreated: 0, areasCreated: 0,
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant_id = '${req.user?.tenant_id}'`);

      const nodeCache = new Map<string, string>();

      const getOrCreateNode = async (pt: { lng: number; lat: number }, name: string, areaId: string | null) => {
        const key = `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)}`;
        if (nodeCache.has(key)) return nodeCache.get(key)!;
        const existing = await client.query(
          `SELECT id FROM ctos WHERE tenant_id = $1 AND ST_DWithin(geom, ST_SetSRID(ST_Point($2, $3), 4326), 0.0001)`,
          [req.user?.tenant_id, pt.lng, pt.lat]
        );
        let ctoId: string;
        if (existing.rows.length > 0) {
          ctoId = existing.rows[0].id;
        } else {
          const created = await client.query(
            `INSERT INTO ctos (tenant_id, area_id, name, address, geom) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($5, $6), 4326)) RETURNING id`,
            [req.user?.tenant_id, areaId, name, '', pt.lng, pt.lat]
          );
          ctoId = created.rows[0].id;
          result.pointsImported++;
        }
        nodeCache.set(key, ctoId);
        return ctoId;
      };

      const getOrCreateProjectArea = async (path: string): Promise<{ projectId: string | null; areaId: string | null }> => {
        const parts = path.split(' > ').filter(Boolean);
        if (parts.length === 0) return { projectId: null, areaId: null };

        let projectId: string | null = null;
        let areaId: string | null = null;

        const projectName = parts[0] || 'Projeto Importado';
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
          await getOrCreateNode(item.coords, item.name || `CTO ${Date.now() % 100000}`, areaId);
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
          const endA = await getOrCreateNode(item.coords[0], `${item.name} (A)`, areaId);
          const endB = await getOrCreateNode(item.coords[item.coords.length - 1], `${item.name} (B)`, areaId);

          const coordText = item.coords.map((p: any) => `${p.lng} ${p.lat}`).join(', ');
          const geomWkt = `LINESTRING(${coordText})`;

          const distResult = await client.query(
            `SELECT ST_Length(ST_GeomFromText($1, 4326)::geography) / 1000 as km`,
            [geomWkt]
          );
          const distanceKm = distResult.rows[0]?.km || 0;

          await client.query(
            `INSERT INTO cables (tenant_id, area_id, node_a_id, node_b_id, name, calculated_distance_km, geom)
             VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326))`,
            [req.user?.tenant_id, areaId, endA, endB, item.name || 'Cabo importado', Math.round(distanceKm * 1000) / 1000, geomWkt]
          );
          result.cablesImported++;
        }
      }

      await client.query('COMMIT');
      res.json({
        data: result,
        message: `Importados ${result.pointsImported} CTOs e ${result.cablesImported} cabos em ${result.projectsCreated} projeto(s) e ${result.areasCreated} área(s). ${result.skipped > 0 ? result.skipped + ' itens ignorados.' : ''}`
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao importar KML: ' + error.message });
  }
});

router.get('/template', async (req: AuthenticatedRequest, res) => {
  const template = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FTTH Network - Infotec</name>
    <Folder>
      <name>Cidade / Bairro</name>
      <Folder>
        <name>POPS</name>
        <Placemark><name>POP Principal</name><Point><coordinates>-43.9345,-19.9321,0</coordinates></Point></Placemark>
      </Folder>
      <Folder>
        <name>CTOs e Cabos</name>
        <Placemark><name>CTO Centro 1</name><Point><coordinates>-43.9345,-19.9331,0</coordinates></Point></Placemark>
        <Placemark><name>Cabo Principal</name><LineString><coordinates>-43.9345,-19.9321,0 -43.9350,-19.9325,0 -43.9355,-19.9330,0</coordinates></LineString></Placemark>
      </Folder>
    </Folder>
  </Document>
</kml>`;
  res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
  res.setHeader('Content-Disposition', 'attachment; filename=ftth_template.kml');
  res.send(template);
});

export default router;

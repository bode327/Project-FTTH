'use client';

import { useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm.infotecmg.net';

interface KmlPreview {
  totalPoints: number;
  totalCables: number;
  uniquePaths: string[];
  pathCounts?: { path: string; points: number; cables: number }[];
  styleSamples?: string[];
  samplePoints?: { name: string; styleUrl: string; path: string }[];
  sampleCables?: { name: string; styleUrl: string; path: string }[];
}

interface ImportResult {
  pointsImported: number;
  cablesImported: number;
  projectsCreated: number;
  areasCreated: number;
  skipped: number;
  message?: string;
}

export default function KMLPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<KmlPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = ['.kml', '.kmz'];
    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validExtensions.includes(extension)) {
      setError('Selecione um arquivo KML ou KMZ válido.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setImportResult(null);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!file) { setError('Selecione um arquivo primeiro.'); return; }

    setPreviewing(true);
    setError('');
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/kml/preview`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar arquivo');

      setPreview(data.data);
      setShowPreviewModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar arquivo KML';
      setError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) { setError('Selecione um arquivo primeiro.'); return; }

    setImporting(true);
    setError('');
    setShowPreviewModal(false);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/kml/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar arquivo');

      setImportResult(data.data || data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar arquivo KML';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    window.open(`${API_BASE}/kml/export`, '_blank');
  };

  const handleTemplate = () => {
    window.open(`${API_BASE}/kml/template`, '_blank');
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setError('');
    setShowPreviewModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Importação/Exportação KML</h1>

      <div className="grid gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Importar arquivo KML</h2>
          <p className="text-sm text-gray-500 mb-4">Selecione um arquivo KML com CTOs e cabos para importar na rede.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o arquivo KML
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.kmz"
                onChange={handleFileSelect}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">Arquivos aceitos: .kml, .kmz</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={!file || previewing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {previewing ? 'Analisando...' : 'Analisar arquivo'}
              </button>
              {file && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Limpar
                </button>
              )}
            </div>

            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-green-800 mb-2">Importação concluída!</h3>
                <div className="space-y-1 text-sm text-green-700">
                  {importResult.pointsImported > 0 && <p>CTOs importados: <span className="font-bold">{importResult.pointsImported}</span></p>}
                  {importResult.cablesImported > 0 && <p>Cabos importados: <span className="font-bold">{importResult.cablesImported}</span></p>}
                  {importResult.projectsCreated > 0 && <p>Projetos criados: <span className="font-bold">{importResult.projectsCreated}</span></p>}
                  {importResult.areasCreated > 0 && <p>Áreas criadas: <span className="font-bold">{importResult.areasCreated}</span></p>}
                  {importResult.skipped > 0 && <p className="text-amber-600">Itens ignorados: {importResult.skipped}</p>}
                  {importResult.message && <p className="text-gray-600">{importResult.message}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Exportar dados da rede</h2>
          <p className="text-sm text-gray-600 mb-4">
            Exporte CTOs, cabos e clientes para visualização no Google Earth.
          </p>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar KML
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Modelo KML</h2>
          <p className="text-sm text-gray-600 mb-4">
            Baixe um modelo com a estrutura esperada para importação.
          </p>
          <button
            onClick={handleTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            Baixar Modelo
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-blue-800 mb-2">Como funciona a importação</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Selecione o arquivo KML e clique em "Analisar arquivo"</li>
            <li>2. Veja a prévia: quantidade de CTOs, cabos e estrutura de pastas</li>
            <li>3. Confirme para importar. CTOs serão criados como pontos e LineStrings como cabos</li>
            <li>4. Pastas do KML viram Projetos e Áreas automaticamente</li>
          </ul>
        </div>
      </div>

      {showPreviewModal && preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Prévia do arquivo KML</h2>
              <p className="text-sm text-gray-500 mt-1">{file?.name}</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{preview.totalPoints}</div>
                  <div className="text-sm text-green-600 mt-1">CTOs (pontos)</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{preview.totalCables}</div>
                  <div className="text-sm text-blue-600 mt-1">Cabos (linhas)</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Estrutura de pastas detectada:</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {preview.uniquePaths && preview.uniquePaths.length > 0 ? (
                    <div className="space-y-1">
                      {preview.uniquePaths.slice(0, 10).map((p, i) => (
                        <div key={i} className="py-1 border-b last:border-b-0">
                          <div className="font-medium text-sm">{p || 'Sem pasta'}</div>
                          <div className="text-xs text-gray-500">
                            {preview.totalPoints} pontos, {preview.totalCables} cabos
                          </div>
                        </div>
                      ))}
                      {preview.uniquePaths.length > 10 && (
                        <p className="text-xs text-gray-400 mt-1">... e mais {preview.uniquePaths.length - 10} pastas</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma pasta encontrada</p>
                  )}
                </div>
              </div>

              {preview.samplePoints && preview.samplePoints.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Exemplos de CTOs:</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                    {preview.samplePoints.map((p, i) => (
                      <div key={i} className="text-xs text-gray-600">
                        <span className="font-medium">{p.name || '(sem nome)'}</span>
                        <span className="text-gray-400 ml-2">estilo: {p.styleUrl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  <strong>Nota:</strong> Todos os pontos serão importados como CTOs. Pastas do KML viram Projetos/Áreas automaticamente. Você pode editar os tipos depois no mapa.
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
              >
                {importing ? 'Importando...' : `Importar ${preview.totalPoints} CTOs e ${preview.totalCables} cabos`}
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={importing}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {importing && !showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Importando dados...</p>
            <p className="text-sm text-gray-500 mt-1">Aguarde, isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}
    </div>
  );
}

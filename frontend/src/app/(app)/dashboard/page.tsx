'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiRoutes } from '@/lib/api';
import HelpIcon from '@/components/HelpIcon';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(apiRoutes.reports + '/summary').then(data => {
      if (data) setStats(data.data || {});
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'POPs', value: stats.pops || 0, href: '/pops', color: 'bg-blue-500' },
    { label: 'CTOs', value: stats.ctos || 0, href: '/ctos', color: 'bg-green-500' },
    { label: 'CEs', value: stats.ctos || 0, href: '/ces', color: 'bg-purple-500' },
    { label: 'Cabos', value: stats.cables || 0, href: '/cables', color: 'bg-orange-500' },
    { label: 'Clientes Ativos', value: stats.clients || 0, href: '/clients', color: 'bg-teal-500' },
    { label: 'Splitters', value: stats.splitters || 0, href: '/splitters', color: 'bg-pink-500' },
    { label: 'Fusões', value: stats.splices || 0, href: '/splices', color: 'bg-indigo-500' },
    { label: 'GBICs', value: stats.gbics || 0, href: '/olts', color: 'bg-cyan-500' },
  ];

  const quickActions = [
    { label: 'Verificar Viabilidade', href: '/viability', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Diagrama de Fusão', href: '/fusion-diagram', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m6 0H1m6 0H3m0 0h.01M12 9h10m0 0h.01M5 9h.01M12 5h.01M17 5h.01M17 9h.01M12 13h.01M5 13h.01M12 17h.01M5 17h.01M5 21h.01M12 21h.01M17 21h.01' },
    { label: 'Análise de Rompimento', href: '/rupture', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Calcular Potência', href: '/signal', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Importar KML', href: '/viability', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { label: 'Gerar Relatórios', href: '/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Gerenciar Projetos', href: '/projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { label: 'Cadastrar Fibras', href: '/fibers', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <HelpIcon title="Visão Geral" description="Visão geral da sua rede FTTH. Acompanhe POPs, CTOs, clientes, cabos e muito mais." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map(card => (
              <Link key={card.href} href={card.href}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer">
                  <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <Link key={action.href} href={action.href}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Projetos em Andamento</h2>
              <p className="text-gray-500 text-sm">{stats.projects_draft || 0} projetos em modo rascunho</p>
              <Link href="/projects" className="text-blue-600 text-sm font-medium mt-2 inline-block hover:underline">Ver todos →</Link>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Cálculo de Potência</h2>
              <button onClick={() => window.location.href='/signal'} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Calcular sinal da rede
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
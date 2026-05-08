"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HelpIcon from '@/components/HelpIcon';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Verificando sessão...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Simples */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">FTTH SaaS</h2>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <a href="#" className="block px-4 py-2 bg-blue-50 text-blue-700 rounded font-medium">Dashboard</a>
          <a href="#" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded">Mapa</a>
          <a href="#" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded">Catálogos</a>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            Dashboard Geral
            <HelpIcon
              title="Visão Geral do Provedor"
              description="Acompanhe a saúde da sua rede PON, quantidade de caixas ativas e rotas traçadas."
            />
          </h1>
          <button
            className="md:hidden text-gray-600"
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
          >
            Sair
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total CTOs</h3>
            <p className="text-3xl font-bold text-gray-800">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-1">Assinantes Ativos</h3>
            <p className="text-3xl font-bold text-gray-800">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start justify-center">
             <button onClick={() => alert('Chama /api/network/calculate e usa o Polling /api/jobs/:id')} className="text-sm bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
               Recalcular Topologia Completa
             </button>
             <div className="mt-2 text-xs text-gray-400">Via BullMQ (Redis Job)</div>
          </div>
        </div>
      </main>
    </div>
  );
}

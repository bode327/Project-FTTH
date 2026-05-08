import HelpIcon from '@/components/HelpIcon';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl w-full bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Sistema de Documentação FTTH</h1>

        <div className="space-y-6">
          <section className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold text-blue-900 mb-2 flex items-center">
              Acesso Técnico de Rua
              <HelpIcon
                title="Acesso Mobile PWA"
                description="Técnicos podem acessar o sistema diretamente pelo celular. Ative o GPS para encontrar caixas e rotas próximas automaticamente."
              />
            </h2>
            <p className="text-gray-700">Acesse facilmente os dados da localização atual e caixas próximas.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
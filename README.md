# Sistema de Documentação FTTH (SaaS)

Este é um projeto completo para a documentação, provisionamento e cálculo de redes ópticas (FTTH).
A arquitetura do projeto utiliza as melhores e mais modernas práticas do mercado para aplicações geoespaciais e de grande escalabilidade (SaaS).

## 🚀 Arquitetura e Tecnologias

- **Banco de Dados Principal**: PostgreSQL com a extensão PostGIS (cálculos geoespaciais).
- **Backend (API)**: Node.js com TypeScript, preparado para escalabilidade e processamento de topologias de rede via Grafos.
- **Frontend (PWA)**: Next.js (React), preparado para Mobile PWA, facilitando o acesso para Técnicos de Rua via celular.
- **Cache / Fila**: Redis (ideal para reprocessamentos assíncronos e cache de cálculos).
- **Infraestrutura**: Docker e Docker Compose, com `.env` já pré-configurados.

## 📦 Estrutura do Projeto

- `/backend`: Contém a API em Node.js.
- `/frontend`: Contém a aplicação web e PWA em Next.js.
- `docker-compose.yml`: Orquestração de todos os serviços (Banco, Redis, Backend, Frontend).
- `.env.example`: Exemplo de configuração de variáveis de ambiente.

## 🔧 Como Iniciar o Projeto (Ambiente de Desenvolvimento)

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e Docker Compose instalados.
- Node.js versão 20+.

### Passos para Instalação e Uso

1. **Clone o repositório e acesse a pasta raiz.**
2. **Crie seu arquivo de ambiente**:
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` se necessário, porém as configurações padrão do `.env.example` já estão prontas para subir os contêineres.

3. **Suba os serviços utilizando o Docker Compose**:
   ```bash
   docker-compose up --build -d
   ```
   Isso irá construir as imagens e iniciar:
   - Banco de Dados (PostGIS) na porta `5432`
   - Redis na porta `6379`
   - Backend Node.js na porta `3333`
   - Frontend Next.js PWA na porta `3000`

4. **Acesse as aplicações**:
   - Frontend PWA: [http://localhost:3000](http://localhost:3000)
   - Healthcheck Backend: [http://localhost:3333/api/health](http://localhost:3333/api/health)

## 📱 PWA e Acesso Mobile para Técnicos de Rua

O Frontend foi desenvolvido como um **Progressive Web App (PWA)**.
Para técnicos na rua, basta acessar o sistema através do navegador do celular. O sistema vai exibir opções de instalar o aplicativo diretamente na tela inicial do dispositivo.
A interface inclui ícones intuitivos de **Ajuda** (Help) que podem ser lidos a qualquer momento para dar instruções sobre determinadas ações.

## 📈 Escalabilidade (SaaS e Multi-Tenant)

Este sistema está estruturado para crescer de maneira escalável. Para escalar a aplicação:

1. **Isolamento de Dados (Schema-per-Tenant)**:
   - No PostGIS, é recomendado usar a abordagem `Schema-per-Tenant`. Cada provedor (empresa) terá um schema no banco de dados. Isso previne que dados de um provedor vazem para o outro e otimiza a performance.
2. **Escalando o Backend**:
   - O Node.js está em contêineres Docker independentes (`stateless`), ou seja, você pode usar orquestradores (como Kubernetes ou AWS ECS) para subir várias réplicas do contêiner `backend`.
   - O tráfego pode ser distribuído via Load Balancer (Nginx, AWS ALB).
3. **Gerenciamento de Fila com Redis**:
   - Quando a atenuação de um cabo principal é alterada, o cálculo de todos os clientes pendentes abaixo daquela árvore pode demorar. Use filas através do Redis (ex: pacote `bullmq`) para delegar essa carga de recálculo aos "Workers" em background, garantindo que a API não fique bloqueada.
4. **Cache Geospacial**:
   - Consultas frequentes do PostGIS sobre uma mesma cidade ou bairro podem ser cacheadas no Redis.

## 📚 Documentação Adicional

Leia os arquivos abaixo para mais detalhes:
- [Details.md](./Details.md): Contém detalhes técnicos dos catálogos, modelagem de dados e regras de negócio.
- [Changelog.md](./Changelog.md): Histórico de versões e alterações do projeto.
- [Warning.md](./Warning.md): Pontos de atenção de arquitetura e segurança que precisam ser monitorados.

## 💡 Suporte e Dúvidas

Em qualquer parte do sistema que exija atenção (por exemplo, na configuração de divisores ópticos ou mapas de caixas), o usuário encontrará o **Ícone de Ajuda** (?). Clique para abrir o tooltip com instruções detalhadas da ação.

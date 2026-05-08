# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [1.1.0] - Implementação de Arquitetura e Resoluções Críticas
### Adicionado
- Script SQL (`backend/db/init.sql`) para inicialização completa do modelo de banco com as devidas configurações do **PostGIS**.
- Políticas RLS (Row-Level Security) ativas sobre as tabelas primárias para garantir blindagem isolada dos Tenants (inquilinos) de forma nativa e inviolável a nível de Banco de Dados.
- Índices B-Tree (para `tenant_id`) e GIST (para buscas geoespaciais em `geom`) garantindo alta performance de Queries PostGIS.
- Middleware de Autorização `auth.ts` no Node.js que assina/verifica JWTs e proíbe a adulteração do `tenant_id` por clientes, extraindo a informação segura do próprio token criptografado.
- Adicionado framework `bullmq` interconectado ao Redis para criação de Background Jobs (Workers).
- Endpoints Express para submeter cálculos densos e topológicos de forma assíncrona, não travando a thread primária (`/api/network/calculate` e `/api/jobs/:id`).

## [1.0.0] - Lançamento Inicial
### Adicionado
- Estrutura completa de `docker-compose.yml` abrangendo PostgreSQL, Redis, Node.js API e Next.js Frontend.
- Componente `<HelpIcon />` interativo para dar suporte contínuo ao usuário no sistema, melhorando a experiência UX.
- Arquivo de manifesto PWA (`manifest.json`) que possibilita técnicos de campo acessarem o sistema através de celular como um app nativo.
- Setup inicial da API (Node.js + TypeScript + Express) preparada para o gerenciamento topológico em SaaS.
- Setup inicial do Frontend (Next.js App Router) com tela demonstrativa para o técnico de campo.
- Arquivos de documentação obrigatórios: `README.md`, `Details.md`, `Warning.md`, e `Changelog.md`.

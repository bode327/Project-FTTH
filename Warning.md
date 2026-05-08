# Avisos e Pontos de Atenção (Warning)

Durante a fase de arquitetura e desenvolvimento deste SaaS FTTH, alguns pontos levantados requerem extrema atenção das equipes de desenvolvimento e engenharia:

## 1. Precisão vs Velocidade no PostGIS (Desempenho)
**Situação**: Ao calcular a distância de milhares de cabos (`LINESTRING`) no mapa para renderizar em uma cidade inteira, as queries podem ficar incrivelmente lentas.
**Resolução Atual**:
Foram implementados índices espaciais (GIST) no banco (arquivo `backend/db/init.sql`) para as colunas de geometria. A aplicação no backend deve sempre carregar linhas com base no *bounding box* atual do frontend para garantir performance.

## 2. Bloqueio Assíncrono no Motor de Cálculo
**Situação**: Nunca execute o recálculo de sinal (dBm) de uma rede gigante (ex: 2000 clientes) de forma síncrona dentro da requisição HTTP (REST/GraphQL). Isso vai dar *Timeout* no backend.
**Resolução Atual**:
Isso foi solucionado através da implementação do `BullMQ` + `Redis` no Node.js (`networkWorker.ts`). As rotas agora permitem que o cálculo topológico assíncrono seja feito em background, com endpoints (`/api/jobs/:id`) para realizar o polling seguro do progresso no frontend.

## 3. Segurança Multi-Tenant (Broken Access Control)
**Situação**: Uma falha de segurança na injeção do `tenant_id` pode expor clientes de Provedor de Internet "A" para o Provedor "B".
**Resolução Atual**:
A arquitetura adota a estratégia de Row-Level Security (RLS) imposta no banco de dados (`init.sql`). O `tenant_id` não é fornecido pelo Frontend, e sim retirado pela própria API de forma intrínseca no JWT (via `auth.ts` middleware), injetando o valor na sessão do banco usando `SET LOCAL app.current_tenant_id`. Isso impossibilita acessos cruzados.

## 4. O "Mundo Ideal" x "Mundo Real" nas Caixas de Rua
**Situação**: A topologia lógica assume que se um cabo de 2km foi desenhado, a distância entre as caixas é 2km. Na vida real há "reserva técnica" (sobram metros no poste para o caso de rompimento).
**Resolução Atual**:
No banco de dados (`cables` em `init.sql`) existem agora duas métricas distintas: `calculated_distance_km` (baseado nas formas e geometria) e `measured_distance_km` (para inserções manuais derivadas de um teste de OTDR do campo).

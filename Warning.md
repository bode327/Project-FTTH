# Avisos e Pontos de Atenção (Warning)

Durante a fase de arquitetura e desenvolvimento deste SaaS FTTH, alguns pontos levantados requerem extrema atenção das equipes de desenvolvimento e engenharia:

## 1. Precisão vs Velocidade no PostGIS (Desempenho)
**Atenção**: Ao calcular a distância de milhares de cabos (`LINESTRING`) no mapa para renderizar em uma cidade inteira, as queries podem ficar incrivelmente lentas.
**Solução Recomendada**:
- Fazer a indexação espacial (`CREATE INDEX ... USING GIST (geom)`).
- Não carregar a geometria (o formato das linhas) para telas de listagem, apenas quando o mapa de fato precisar exibi-las e **limitando por bounding box (coordenadas visíveis na tela no momento)**.

## 2. Bloqueio Assíncrono no Motor de Cálculo
**Atenção**: Nunca execute o recálculo de sinal (dBm) de uma rede gigante (ex: 2000 clientes) de forma síncrona dentro da requisição HTTP (REST/GraphQL). Isso vai dar *Timeout* no backend.
**Solução Recomendada**:
- Lance o recálculo como um "Job" no **Redis**.
- Crie rotas para o frontend checar o progresso via polling ou utilize WebSockets (ex: Socket.io) para notificar quando a rede inteira foi re-calculada.

## 3. Segurança Multi-Tenant (Broken Access Control)
**Atenção**: Uma falha de segurança na injeção do `tenant_id` pode expor clientes de Provedor de Internet "A" para o Provedor "B".
**Solução Recomendada**:
- O ideal para PostgreSQL nesse caso não é só filtrar por "tenant_id" no `where`. É usar esquemas lógicos separados (Schema-per-Tenant) ou implementar **Row-Level Security (RLS)** nativo do PostgreSQL.
- Jamais confie no `tenant_id` vindo do frontend. Extraia essa informação diretamente do JWT (autenticação).

## 4. O "Mundo Ideal" x "Mundo Real" nas Caixas de Rua
**Atenção**: A topologia lógica assume que se um cabo de 2km foi desenhado, a distância entre as caixas é 2km. Na vida real há "reserva técnica" (sobram metros no poste para o caso de rompimento).
**Solução Recomendada**:
- Incluir sempre no modelo de dados do Cabo a separação entre `calculated_distance_km` (do mapa) e `measured_distance_km` (distância real da bobina física ou OTDR). Para o cálculo de atenuação de sinal final, priorize a medida inserida manualmente (real).

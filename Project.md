Especificação Técnica e Arquitetura - Sistema de Documentação FTTH (SaaS)

Este documento define a arquitetura, tecnologias e modelagem de dados para o desenvolvimento de uma plataforma SaaS de provisionamento, documentação e cálculo de redes ópticas (FTTH/FTTx).

1. Stack Tecnológica Recomendada

Para um sistema com alto nível de relacionamentos (grafos de rede), geolocalização e arquitetura SaaS, a seguinte stack é a mais recomendada na atualidade:

Banco de Dados Principal: PostgreSQL com extensão PostGIS.

Por que: O PostGIS é o padrão ouro no mercado para cálculos geoespaciais (calcular distância real em KM entre duas caixas no mapa). O PostgreSQL lida perfeitamente com a complexidade de dados JSONB (úteis para armazenar propriedades dinâmicas) e integridade referencial severa (necessária para não deixar uma fibra "flutuando" se um cabo for deletado).

Backend (API Rest / GraphQL): PHP (Laravel) ou Node.js (NestJS).

Laravel: Altamente produtivo. Possui pacotes como stancl/tenancy que resolvem o modo SaaS (isolamento de banco de dados por empresa) de forma nativa. O Eloquent ORM lida bem com as relações complexas de rede.

NestJS (Node): Excelente se você preferir tipagem estrita (TypeScript) e alta concorrência.

Frontend (Interface do Usuário): React.js (com Next.js) ou Vue.js.

Mapas GIS: Mapbox GL JS ou Leaflet para plotar a rede no mapa da cidade.

Topologia (Diagramas lógicos): React Flow ou jsPlumb para desenhar as caixas e ligações lógicas internamente (como o visual do diagrama).

Cache e Filas: Redis (essencial para recalcular o sinal de todos os clientes quando uma atenuação de cabo principal é alterada).

2. Estrutura SaaS (Multi-Tenant) e Segurança (OWASP)

2.1. Arquitetura SaaS

Recomenda-se a abordagem de Schema per Tenant (Um schema isolado no PostgreSQL para cada empresa) ou Database per Tenant.

Isso garante que um provedor nunca terá acesso ou enxergará as caixas, OLTs ou clientes de outro provedor.

A aplicação gerencia um banco "Central" (onde ficam os logins, planos de assinatura e o catálogo global de equipamentos base) e bancos "Inquilinos" (onde ficam os dados da rede de cada provedor).

2.2. Segurança (Padrão OWASP Top 10)

Broken Access Control: Implementar RBAC (Role-Based Access Control). Técnicos de rua só podem ver e adicionar clientes em CTOs, enquanto Engenheiros podem editar rotas de cabos e OLTs.

Injection: Uso estrito de ORM/Query Builders (Eloquent/Prisma) para prevenir SQL Injection. Validação estrita de entradas geográficas (Lat/Lng).

Cryptographic Failures: Senhas em Argon2 ou Bcrypt. Todo o tráfego em HTTPS (TLS 1.3).

Vulnerable and Outdated Components: Rotina de CI/CD com ferramentas como Snyk ou Dependabot para monitorar pacotes PHP/NPM desatualizados.

Security Logging and Monitoring: Log de auditoria (Audit Trail). Saber qual usuário moveu qual fibra de qual bandeja na data X.

3. Modelagem de Dados (O "Coração" do FTTH)

A complexidade do projeto reside na modelagem física correta. Abaixo está a estrutura relacional central.

3.1. Equipamentos e Catálogo (Base de Dados Global ou por Tenant)

Antes de colocar na rua, o sistema precisa saber o que existe no almoxarifado.

Tabela catalog_olts: Modelos (Ex: AN6000-15), qtde_slots, slots_gerencia.

Tabela catalog_cables: Define a estrutura física.

Capacidade Total: Ex: 36FO.

Estrutura Loose: JSON estruturado definindo a formação.

Exemplo Cabo 1: [{ loose: 1, cores_fibras: 12 }, { loose: 2, cores_fibras: 12 }, { loose: 3, cores_fibras: 12 }]

Exemplo Cabo 2 (Misto): [{ loose: 'Verde (Piloto)', fibras: 6 }, { loose: 'Amarelo (Direcional)', fibras: 6 }, { loose: 'Branco', fibras: 6 }, { loose: 'Branco', fibras: 6 }]

Tabela catalog_splitters: Razão (1:2, 1:4, 1:8...), Perda Inserção (dB).

Tabela catalog_gbics: Tecnologia (GPON, XGS-PON, EPON, Combo), Potência de Tx (dBm), Sensibilidade Rx (dBm).

3.2. Estrutura Geográfica (A Rede Física)

Todas essas tabelas usam colunas GEOMETRY(Point, 4326) do PostGIS para localização real.

Tabela network_nodes (Nós):

id, type (ENUM: 'OLT', 'CE', 'CTO', 'POP'), name, geom (Lat/Lng), address.

Tabela cables (Lançamentos de Cabo):

Representa o cabo físico na rua.

id, catalog_cable_id (Referência à estrutura), node_a_id, node_b_id, geom (LineString com o trajeto no mapa), calculated_distance_km, measured_distance_km (para correção de bobina).

3.3. O Interior das Caixas (CE e CTO)

Tabela trays (Bandejas de Emenda):

id, node_id (CE ou CTO), tray_number (Bandeja 1, Bandeja 2), capacity (ex: 24 fusões).

Tabela splitters (Instâncias de Splitter):

Todo splitter deve residir em um nó (ou OLT em casos raros).

id, catalog_splitter_id, node_id, parent_splitter_id (Para cascata CTO -> CTO).

3.4. A Menor Unidade: A Fibra e as Fusões

Tabela cable_fibers (As instâncias das fibras de um cabo lançado):

Quando um cabo de 36FO é "lançado" na rota, o sistema gera 36 registros nesta tabela.

id, cable_id, loose_tube_index (Qual tubete), loose_tube_color, fiber_index (1 a 36), fiber_color (Verde, Amarelo...), status (Livre, Em Uso, Morta/Rompida, Reservada).

Tabela splices (Fusões e Conexões - A Documentação Lógica):

id, node_id (Onde ocorreu a fusão), tray_id (Em qual bandeja está acomodada).

Aqui conectamos os pontos:

in_element_type (Fibra, Splitter Out, OLT Port)

in_element_id

out_element_type (Fibra, Splitter In, Cliente)

out_element_id

A Lógica do Sistema: É esta tabela que permite ao algoritmo rastrear a rede da casa do cliente até a porta da OLT, atravessando as cores corretas dos loose tubes e calculando a perda.

3.5. O Cliente e o Cálculo

Tabela clients (Assinantes):

id, code, name, node_id (A CTO onde ele está), port_number (Em qual porta do splitter da CTO).

onu_technology (GPON, XGSPON).

geom (Opcional, localização exata da casa).

calculated_rx_signal (Atualizado via fila sempre que a rede muda).

4. O Motor de Cálculo (Backend Lógico)

Para calcular o sinal de um cliente ou mapear a rede, o backend utilizará algoritmos de Grafos (Graph Traversal).

Trajeto Inverso (Bottom-Up): Partindo do client_id, o sistema busca em qual porta de splitter ele está ligado.

Lê o splices para descobrir qual cable_fiber (ex: Cabo 3, Tube 1, Fibra Verde) alimenta a entrada deste splitter.

Segue a fibra pelo cabo até o node_a_id (que pode ser uma CE).

Na CE, busca na tabela splices com o que essa fibra verde está fundida (ex: fundida com Cabo 2, Tube Azul, Fibra Marrom).

Repete o processo até atingir uma porta de OLT.

Cálculo (Top-Down): Uma vez rastreado o caminho, o sistema desce da OLT somando as distâncias dos cabos (km * 0.25dB), perdas de fusão (qtde * 0.1dB) e perdas de splitters pelo caminho, entregando o valor exato no painel do cliente.

5. Padrões de Cores (Referência ABNT/Telebrás)

O sistema deve ter uma classe utilitária (Enum/Constante) para padronizar as cores, facilitando a geração dos cabos:

Verde

Amarelo

Branco

Azul

Vermelho

Violeta

Marrom

Rosa

Preto

Cinza

Laranja

Aqua (Azul Claro)

Regra de Loose Tubes (Tubetes): O sistema deve permitir ao usuário definir no cadastro do modelo do cabo a regra:

Padrão Nacional Comum: Tubo 1 Verde (Piloto), Tubo 2 Amarelo (Direcional), Demais Tubos Brancos (ou Natural).

Padrão Totalmente Colorido: Segue a ordem de 1 a 12 acima para os tubetes.

6. Resumo dos Próximos Passos

Para construir isso na prática, a ordem de desenvolvimento recomendada é:

Setup do Banco de Dados (PostgreSQL + PostGIS) e Autenticação (SaaS).

CRUD dos Catálogos (Cabos detalhados por loose, caixas, OLTs, Splitters).

Tela de Mapa (Leaflet/Mapbox) para desenhar nós e traçar rotas (lançar cabos).

Interface de "Interior de Caixa" (onde o usuário faz o drag-and-drop de uma fibra para um splitter ou para outra fibra dentro da bandeja).

Motor de Grafo (Backend) para varrer a rede, setar status de fibras ocupadas e calcular o sinal.

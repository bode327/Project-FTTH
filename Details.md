# Detalhes do Sistema (FTTH)

Este documento aprofunda os itens do projeto, como estruturados inicialmente, explicando o motivo de cada escolha.

## 1. Banco de Dados e Modelagem de Topologia

Optamos pelo **PostgreSQL + PostGIS**, pois trabalhar com redes ópticas não se trata de apenas salvar um JSON de atributos, trata-se de **grafos em mapas reais**.

### Principais Tabelas:
- **`catalog_*`**: Tabelas de catálogo servem de "molde". Ao invés de o técnico digitar manualmente o tamanho do cabo na rua, ele seleciona do catálogo "Cabo 36FO AS80" e o sistema gera automaticamente 36 registros (as 36 fibras dentro do cabo), organizadas pelos seus loose tubes e cores (verde, amarelo, etc.).
- **`network_nodes`**: Pode ser uma CTO (Caixa Terminal Óptica), uma CE (Caixa de Emenda) ou o POP (Ponto de Presença/OLT). Todos salvos no PostGIS como tipo `POINT`.
- **`cables`**: O traçado real (tipo `LINESTRING`) de onde o cabo passa nos postes.
- **`splices`**: A tabela crucial para a Lógica de Grafo. Onde conectamos as pontas: ex: A Fibra Verde do Cabo 1 foi unida com a entrada de um Splitter na bandeja 1.

## 2. Frontend Intuitivo com Ícones de Ajuda

Para garantir a usabilidade e diminuir o atrito, criamos o componente `<HelpIcon />`.
Como a documentação óptica pode ser confusa para os técnicos, eles encontram ícones `?` próximos a elementos críticos (ex: "Razão de Splitter", "Padrão de Cores"). Ao clicar, um pequeno popover é aberto explicando a regra da ABNT ou Telebrás para as cores daquele cenário.

## 3. PWA (Progressive Web App)

Através do arquivo `manifest.json`, o Next.js se comporta como um aplicativo nativo quando adicionado à tela inicial do smartphone. Isso é essencial porque:
- O Técnico de Rua precisa de agilidade.
- Ele pode usar a API de Geolocalização do navegador (via JS) para centralizar o mapa exatamente no poste onde está trabalhando, e visualizar a CTO mais próxima para fazer uma ativação.

## 4. O Sistema de Cálculo Top-Down / Bottom-Up

O backend atua não apenas como um CRUD, mas como um **Motor Lógico**.
- **Bottom-Up**: Saber a rota que o sinal faz desde a casa do cliente até a Central.
- **Top-Down (Assíncrono e Otimizado)**: Atualizar os cálculos de dBm (potência do sinal) de todos os clientes se ocorrer um rompimento ou atenuação em uma fusão alta da árvore PON. O projeto implementou o `bullmq` integrado ao Redis. O usuário requisita o recálculo via `POST /api/network/calculate` e monitora com WebSockets ou Polling em `/api/jobs/:id`.

## 5. Garantia de Segurança: RLS + JWT (Multi-Tenant)

Garantir que um provedor de internet só veja os seus dados é a chave do projeto.
Resolvemos a questão criando políticas robustas (RLS - *Row Level Security*) dentro do próprio PostGIS. O Node.js não envia a verificação do `tenant_id` no WHERE da SQL. Ele simplesmente decodifica o `tenant_id` do **JWT** com o middleware, passa o ID via transação (`SET LOCAL app.current_tenant_id = '...'`) e faz as consultas limpas. Assim, vazamentos de SQL Injection se tornam inviáveis contra o particionamento lógico do sistema.

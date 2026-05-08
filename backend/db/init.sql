-- Habilitar a extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabela de Inquilinos (SaaS)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'technician', -- 'admin', 'technician'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Nós da Rede (CTO, CE, POP)
CREATE TABLE IF NOT EXISTS network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type VARCHAR(50) NOT NULL, -- 'OLT', 'CE', 'CTO', 'POP'
    name VARCHAR(255) NOT NULL,
    address TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Cabos
CREATE TABLE IF NOT EXISTS cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    node_a_id UUID NOT NULL REFERENCES network_nodes(id),
    node_b_id UUID NOT NULL REFERENCES network_nodes(id),
    calculated_distance_km DECIMAL(10, 4), -- Distância teórica via mapa
    measured_distance_km DECIMAL(10, 4), -- Distância real (ex: OTDR ou medição em campo)
    geom GEOMETRY(LineString, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row-Level Security (RLS) para Multi-Tenant Seguro
ALTER TABLE network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cables ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- O parâmetro 'app.current_tenant_id' será setado via API a cada requisição
CREATE POLICY tenant_isolation_nodes ON network_nodes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_cables ON cables
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Criação de Índices Espaciais (GIST) para resolver problemas de desempenho com dados massivos
CREATE INDEX IF NOT EXISTS network_nodes_geom_idx ON network_nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS cables_geom_idx ON cables USING GIST (geom);

-- Criação de Índices B-Tree para buscas de Tenant rápidas
CREATE INDEX IF NOT EXISTS network_nodes_tenant_idx ON network_nodes (tenant_id);
CREATE INDEX IF NOT EXISTS cables_tenant_idx ON cables (tenant_id);

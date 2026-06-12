-- Habilitar a extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ========================
-- ENUMS
-- ========================
CREATE TYPE node_type AS ENUM ('POP', 'CTO', 'CE', 'SP');
CREATE TYPE fiber_status AS ENUM ('free', 'reserved', 'in_use', 'spliced', 'broken', 'maintenance');
CREATE TYPE equipment_status AS ENUM ('active', 'inactive', 'maintenance', 'fault');
CREATE TYPE gbics_type AS ENUM ('SFP', 'SFP+', 'SFP28', 'XFP', 'QSFP+', 'QSFP28');
CREATE TYPE wavelength AS ENUM ('1310nm', '1490nm', '1550nm', 'CWDM', 'DWDM');
CREATE TYPE pon_type AS ENUM ('GPON', 'GPON_B+', 'XGS_PON', 'NGPON2', 'GPON_Class_C+', 'GPON_Class_D');
CREATE TYPE pon_category AS ENUM ('olt_card', 'ont_model');

-- ========================
-- CATALOGS (MOLDS)
-- ========================
CREATE TYPE tenant_plan AS ENUM ('trial', 'free', 'basic', 'pro', 'enterprise');
CREATE TYPE tenant_status AS ENUM ('active', 'trial', 'suspended', 'blocked', 'cancelled');

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    plan tenant_plan NOT NULL DEFAULT 'trial',
    status tenant_status NOT NULL DEFAULT 'trial',
    blocked_reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    next_billing_date DATE,
    max_pops INTEGER DEFAULT 2,
    max_olts INTEGER DEFAULT 2,
    max_ctos INTEGER DEFAULT 50,
    max_ces INTEGER DEFAULT 100,
    max_clients INTEGER DEFAULT 500,
    max_cables INTEGER DEFAULT 100,
    max_fibers INTEGER DEFAULT 5000,
    features JSONB DEFAULT '{"map_view":true,"kml_import":true,"reports":true,"viability":true,"signal_calc":true,"fusion_diagram":true,"splice_plan":true,"rupture_analysis":true,"projects":true}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'technician',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- CATALOG: EQUIPMENT MODELS
-- ========================

-- OLT Chassis Models
CREATE TABLE IF NOT EXISTS catalog_olt_model (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    total_slots INTEGER DEFAULT 16,
    max_power_watts INTEGER,
    form_factor VARCHAR(50) DEFAULT 'rack',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- PON Card/Module Models (installed in OLT slots)
CREATE TABLE IF NOT EXISTS catalog_pon_card (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    pon_type pon_type NOT NULL,
    ports INTEGER DEFAULT 16,
    tx_power_dbm DECIMAL(5,2),
    rx_sensitivity_dbm DECIMAL(5,2),
    budget_power_dbm DECIMAL(5,2),
    max_split_ratio INTEGER DEFAULT 128,
    compatible_chassis TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- GBIC/SFP module types
CREATE TABLE IF NOT EXISTS catalog_gbic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    model VARCHAR(100) NOT NULL,
    type gbics_type NOT NULL DEFAULT 'SFP+',
    wavelength_range wavelength[] NOT NULL DEFAULT '{"1310nm","1490nm"}',
    min_output_dbm DECIMAL(5,2),
    max_output_dbm DECIMAL(5,2),
    budget_power_dbm DECIMAL(5,2),
    max_distance_km INTEGER,
    brand VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, model)
);

-- ONT/ONU Models (client premises equipment)
CREATE TABLE IF NOT EXISTS catalog_ont (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    pon_compatibility pon_type[] NOT NULL DEFAULT '{"GPON"}',
    ports_gigabit INTEGER DEFAULT 4,
    ports_voip INTEGER DEFAULT 0,
    ports_catv INTEGER DEFAULT 0,
    wifi_standard VARCHAR(20),
    wifi_max_mbps INTEGER,
    rx_power_min_dbm DECIMAL(5,2),
    tx_power_dbm DECIMAL(5,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- DIO: Distribuidor Interior Óptico (fiber patch panel)
CREATE TABLE IF NOT EXISTS catalog_dio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    total_ports INTEGER NOT NULL,
    type VARCHAR(30) DEFAULT 'rack',
    height_units INTEGER DEFAULT 1,
    splice_capacity INTEGER DEFAULT 24,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- Switch Models (managed/unmanaged, layer 2/3)
CREATE TABLE IF NOT EXISTS catalog_switch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'managed',
    layer VARCHAR(10) DEFAULT 'L2',
    ports INTEGER DEFAULT 48,
    sfp_slots INTEGER DEFAULT 4,
    poe_ports INTEGER DEFAULT 0,
    poe_budget_watts INTEGER,
    max_power_watts INTEGER,
    form_factor VARCHAR(30) DEFAULT 'rack',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- Router/Firewall Models
CREATE TYPE router_type AS ENUM ('fixed', 'modular');
CREATE TYPE card_category AS ENUM ('pon', 'service', 'uplink', 'stacking', 'management', 'power', 'other');

CREATE TABLE IF NOT EXISTS catalog_router (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type router_type DEFAULT 'fixed',
    slots INTEGER DEFAULT 0,
    ethernet_ports INTEGER DEFAULT 0,
    sfp_ports INTEGER DEFAULT 0,
    sfp28_ports INTEGER DEFAULT 0,
    qsfp_ports INTEGER DEFAULT 0,
    qsfp28_ports INTEGER DEFAULT 0,
    throughput_mbps INTEGER,
    vpn_support BOOLEAN DEFAULT false,
    firewall BOOLEAN DEFAULT true,
    max_power_watts INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- Placas de Serviço ( PON cards, service cards, etc)
CREATE TABLE IF NOT EXISTS catalog_service_card (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    category card_category NOT NULL,
    slots_type VARCHAR(50) DEFAULT 'service',
    ports INTEGER DEFAULT 0,
    pon_type VARCHAR(30),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, brand, model)
);

-- Splitter ratios with insertion loss
CREATE TABLE IF NOT EXISTS catalog_splitter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ratio VARCHAR(20) NOT NULL,
    type VARCHAR(20) DEFAULT 'fused',
    insertion_loss_db DECIMAL(5,2) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, ratio)
);

-- DGO: Caixa de Derivação Óptica
CREATE TABLE IF NOT EXISTS catalog_dgo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    model VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    capacity_fibers INTEGER NOT NULL,
    splice_trays INTEGER DEFAULT 1,
    max_splitters INTEGER DEFAULT 4,
    mounting VARCHAR(20) DEFAULT 'aereo',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, model)
);

-- RJR/RJO: Caixa de Terminação (Residential Junction)
CREATE TABLE IF NOT EXISTS catalog_rj (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    model VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    type VARCHAR(20) DEFAULT 'rj45',
    capacity_fibers INTEGER NOT NULL,
    built_in_splitter VARCHAR(20),
    mounting VARCHAR(20) DEFAULT 'parede',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, model)
);

-- Cable types (number of fibers)
CREATE TABLE IF NOT EXISTS catalog_cable_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    fiber_count INTEGER NOT NULL,
    tube_count INTEGER,
    jacket_type VARCHAR(50),
    duct_compatible BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Duct/Microduct types
CREATE TABLE IF NOT EXISTS catalog_duct (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    diameter_mm INTEGER NOT NULL,
    type VARCHAR(30) DEFAULT 'subterraneo',
    color VARCHAR(30),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Accessories: splice sleeves, pigtails, adapters, etc.
CREATE TABLE IF NOT EXISTS catalog_accessory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    unit VARCHAR(30) DEFAULT 'un',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ativos de rede para projeto (planning/design)
CREATE TYPE asset_category AS ENUM ('patchcord', 'pigtail', 'odf', 'adaptador', 'conector', 'tubete', 'embreagem', 'caixa_passagem', 'lancamento', 'cordao', 'splitter_outdoor', 'equipamento_cliente', 'outro');

CREATE TABLE IF NOT EXISTS catalog_network_asset (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category asset_category NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    specifications JSONB DEFAULT '{}',
    unit VARCHAR(30) DEFAULT 'un',
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    cost DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, category, name)
);

-- Fiber color codes (ITU-T G.652)
CREATE TABLE IF NOT EXISTS catalog_fiber_color (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    sequence INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL,
    color_code VARCHAR(10),
    UNIQUE(tenant_id, sequence)
);

-- ========================
-- NETWORK INFRASTRUCTURE
-- ========================

-- POP / Headend (physical location where equipment lives)
CREATE TABLE IF NOT EXISTS pops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OLT Chassis (Huawei NE8000, Fiberhome, etc.)
CREATE TABLE IF NOT EXISTS olt_chassis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pop_id UUID NOT NULL REFERENCES pops(id),
    name VARCHAR(255) NOT NULL,
    catalog_olt_model_id UUID REFERENCES catalog_olt_model(id),
    brand VARCHAR(100),
    slots_total INTEGER DEFAULT 16,
    management_ip VARCHAR(45),
    status VARCHAR(50) DEFAULT 'active',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OLT Slots (inside chassis)
CREATE TABLE IF NOT EXISTS olt_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    chassis_id UUID NOT NULL REFERENCES olt_chassis(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    slots_type VARCHAR(50) DEFAULT 'PON',
    max_ports INTEGER DEFAULT 16,
    UNIQUE(chassis_id, slot_number)
);

-- OLT PON Ports
CREATE TABLE IF NOT EXISTS olt_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    slot_id UUID NOT NULL REFERENCES olt_slots(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    port_type VARCHAR(20) DEFAULT 'PON',
    max_splits INTEGER DEFAULT 64,
    gbics_type gbics_type,
    UNIQUE(slot_id, port_number)
);

-- GBIC Inventory (physical modules installed in ports)
CREATE TABLE IF NOT EXISTS gbics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    port_id UUID REFERENCES olt_ports(id),
    serial_number VARCHAR(100) UNIQUE,
    catalog_gbic_id UUID REFERENCES catalog_gbic(id),
    status equipment_status DEFAULT 'active',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CTO Box (terminal box at customer endpoint)
CREATE TABLE IF NOT EXISTS ctos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    geom GEOMETRY(Point, 4326),
    capacity INTEGER DEFAULT 8,
    installed_splitters INTEGER DEFAULT 0,
    status equipment_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CE Box (splice/junction box)
CREATE TABLE IF NOT EXISTS ces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    geom GEOMETRY(Point, 4326),
    capacity INTEGER DEFAULT 12,
    status equipment_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Network nodes (unified view: CTO, CE, POP as points for spatial queries)
CREATE TABLE IF NOT EXISTS network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    area_id UUID REFERENCES areas(id),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- CABLES / FIBERS
-- ========================

-- Physical cables between nodes
CREATE TABLE IF NOT EXISTS cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(255) NOT NULL,
    node_a_id UUID REFERENCES network_nodes(id),
    node_b_id UUID REFERENCES network_nodes(id),
    catalog_cable_type_id UUID REFERENCES catalog_cable_type(id),
    calculated_distance_km DECIMAL(10,4),
    measured_distance_km DECIMAL(10,4),
    geom GEOMETRY(LineString, 4326),
    installation_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual fibers inside a cable
CREATE TABLE IF NOT EXISTS fibers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    cable_id UUID NOT NULL REFERENCES cables(id) ON DELETE CASCADE,
    tube_number INTEGER NOT NULL,
    fiber_number INTEGER NOT NULL,
    color VARCHAR(30),
    status fiber_status DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cable_id, tube_number, fiber_number)
);

-- ========================
-- SPLICES & SPLITTERS
-- ========================

-- Splice trays (physical tray in a box)
CREATE TABLE IF NOT EXISTS splice_trays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    cto_id UUID REFERENCES ctos(id),
    ce_id UUID REFERENCES ces(id),
    tray_number INTEGER NOT NULL,
    total_splices INTEGER DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Splices: fiber connections (fusions, mechanical, etc.)
CREATE TABLE IF NOT EXISTS splices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    tray_id UUID REFERENCES splice_trays(id),
    splice_type VARCHAR(30) DEFAULT 'fusion',
    fiber_a_id UUID REFERENCES fibers(id),
    fiber_b_id UUID REFERENCES fibers(id),
    tray_position INTEGER,
    loss_db DECIMAL(5,3),
    performed_by VARCHAR(255),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Splitters installed in CTOs or intermediate points
CREATE TABLE IF NOT EXISTS splitters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    cto_id UUID REFERENCES ctos(id),
    catalog_splitter_id UUID NOT NULL REFERENCES catalog_splitter(id),
    tray_number INTEGER DEFAULT 1,
    tray_position INTEGER,
    input_fiber_id UUID REFERENCES fibers(id),
    parent_splitter_id UUID REFERENCES splitters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- CLIENTS
-- ========================

-- End customers connected to CTO splitters
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    cto_id UUID REFERENCES ctos(id),
    address TEXT,
    geom GEOMETRY(Point, 4326),
    phone VARCHAR(30),
    plan_mbps INTEGER,
    fiber_id UUID REFERENCES fibers(id),
    splitter_id UUID REFERENCES splitters(id),
    ont_serial VARCHAR(100),
    catalog_ont_id UUID REFERENCES catalog_ont(id),
    vlan INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- EQUIPMENT SWAP HISTORY
-- ========================
CREATE TABLE IF NOT EXISTS equipment_swap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    equipment_type VARCHAR(50) NOT NULL,
    old_id UUID NOT NULL,
    new_id UUID NOT NULL,
    reason VARCHAR(255),
    notes TEXT,
    migrated_by UUID REFERENCES users(id),
    port_mapping JSONB DEFAULT '[]',
    reconnect_fibers JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- NETWORK DESIGNS (save map drawings)
-- ========================
CREATE TABLE IF NOT EXISTS network_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    canvas_data JSONB DEFAULT '{}',
    viewport JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Installed Switches
CREATE TABLE IF NOT EXISTS switches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pop_id UUID REFERENCES pops(id),
    name VARCHAR(255) NOT NULL,
    catalog_switch_id UUID REFERENCES catalog_switch(id),
    serial_number VARCHAR(100),
    management_ip VARCHAR(45),
    vlan_default INTEGER DEFAULT 1,
    status equipment_status DEFAULT 'active',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Individual switch ports with config
CREATE TABLE IF NOT EXISTS switch_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    port_type VARCHAR(20) DEFAULT 'copper',
    speed_mbps INTEGER DEFAULT 1000,
    duplex VARCHAR(10) DEFAULT 'auto',
    vlan INTEGER,
    lacp_group INTEGER,
    lacp_mode VARCHAR(20),
    poe_enabled BOOLEAN DEFAULT false,
    description VARCHAR(255),
    connected_to VARCHAR(255),
    status VARCHAR(20) DEFAULT 'up',
    UNIQUE(switch_id, port_number)
);

-- Installed Routers (Mikrotik, etc.)
CREATE TABLE IF NOT EXISTS routers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pop_id UUID REFERENCES pops(id),
    name VARCHAR(255) NOT NULL,
    catalog_router_id UUID REFERENCES catalog_router(id),
    serial_number VARCHAR(100),
    management_ip VARCHAR(45),
    status equipment_status DEFAULT 'active',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Router interfaces
CREATE TABLE IF NOT EXISTS router_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    router_id UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
    interface_name VARCHAR(30) NOT NULL,
    interface_type VARCHAR(20) DEFAULT 'ethernet',
    ip_address VARCHAR(45),
    subnet_mask VARCHAR(20),
    vlan_id INTEGER,
    speed_mbps INTEGER,
    status VARCHAR(20) DEFAULT 'up',
    description VARCHAR(255),
    UNIQUE(router_id, interface_name)
);

-- Installed DIOs (patch panels)
CREATE TABLE IF NOT EXISTS dios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pop_id UUID REFERENCES pops(id),
    name VARCHAR(255) NOT NULL,
    catalog_dio_id UUID REFERENCES catalog_dio(id),
    rack_location VARCHAR(50),
    total_ports INTEGER,
    used_ports INTEGER DEFAULT 0,
    status equipment_status DEFAULT 'active',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- PROJECTS & AREAS
-- ========================
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    area_id UUID REFERENCES areas(id),
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- RLS POLICIES
-- ========================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_olt_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_pon_card ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_gbic ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_ont ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_switch ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_router ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_splitter ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_dgo ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_rj ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_dio ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_cable_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_duct ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_accessory ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_network_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_fiber_color ENABLE ROW LEVEL SECURITY;
ALTER TABLE switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE switch_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE dios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_swap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE olt_chassis ENABLE ROW LEVEL SECURITY;
ALTER TABLE olt_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE olt_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ces ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE fibers ENABLE ROW LEVEL SECURITY;
ALTER TABLE splice_trays ENABLE ROW LEVEL SECURITY;
ALTER TABLE splices ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create a function for RLS enforcement
CREATE OR REPLACE FUNCTION set_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
  EXECUTE format('SET LOCAL app.current_tenant_id = %L', current_setting('app.current_tenant_id', true));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for all tables
ALTER TABLE catalog_service_card ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_catalog_service_card ON catalog_service_card FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_tenants ON tenants FOR ALL USING (true);
CREATE POLICY tenant_isolation_users ON users FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_olt_model ON catalog_olt_model FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_pon_card ON catalog_pon_card FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_gbic ON catalog_gbic FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_ont ON catalog_ont FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_switch ON catalog_switch FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_router ON catalog_router FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_splitter ON catalog_splitter FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_dgo ON catalog_dgo FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_rj ON catalog_rj FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_dio ON catalog_dio FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_cable_type ON catalog_cable_type FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_duct ON catalog_duct FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_accessory ON catalog_accessory FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_network_asset ON catalog_network_asset FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_catalog_fiber_color ON catalog_fiber_color FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_switches ON switches FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_areas ON areas FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_projects ON projects FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_switch_ports ON switch_ports FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_routers ON routers FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_router_interfaces ON router_interfaces FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_dios ON dios FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_network_designs ON network_designs FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_equipment_swap_history ON equipment_swap_history FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_pops ON pops FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_olt_chassis ON olt_chassis FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_olt_slots ON olt_slots FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_olt_ports ON olt_ports FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_gbics ON gbics FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_ctos ON ctos FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_ces ON ces FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_network_nodes ON network_nodes FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_cables ON cables FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_fibers ON fibers FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_splice_trays ON splice_trays FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_splices ON splices FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_splitters ON splitters FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY tenant_isolation_clients ON clients FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ========================
-- SPATIAL INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS network_nodes_geom_idx ON network_nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS cables_geom_idx ON cables USING GIST (geom);
CREATE INDEX IF NOT EXISTS pops_geom_idx ON pops USING GIST (geom);
CREATE INDEX IF NOT EXISTS ctos_geom_idx ON ctos USING GIST (geom);
CREATE INDEX IF NOT EXISTS ces_geom_idx ON ces USING GIST (geom);
CREATE INDEX IF NOT EXISTS clients_geom_idx ON clients USING GIST (geom);

-- ========================
-- PERFORMANCE INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS network_nodes_tenant_idx ON network_nodes (tenant_id);
CREATE INDEX IF NOT EXISTS cables_tenant_idx ON cables (tenant_id);
CREATE INDEX IF NOT EXISTS fibers_cable_idx ON fibers (cable_id);
CREATE INDEX IF NOT EXISTS fibers_status_idx ON fibers (status);
CREATE INDEX IF NOT EXISTS clients_cto_idx ON clients (cto_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);
CREATE INDEX IF NOT EXISTS splices_tray_idx ON splices (tray_id);
CREATE INDEX IF NOT EXISTS olt_chassis_pop_idx ON olt_chassis (pop_id);
CREATE INDEX IF NOT EXISTS olt_ports_slot_idx ON olt_ports (slot_id);
CREATE INDEX IF NOT EXISTS switches_tenant_idx ON switches (tenant_id);
CREATE INDEX IF NOT EXISTS switch_ports_switch_idx ON switch_ports (switch_id);
CREATE INDEX IF NOT EXISTS routers_tenant_idx ON routers (tenant_id);
CREATE INDEX IF NOT EXISTS router_interfaces_router_idx ON router_interfaces (router_id);
CREATE INDEX IF NOT EXISTS dios_tenant_idx ON dios (tenant_id);
CREATE INDEX IF NOT EXISTS network_designs_tenant_idx ON network_designs (tenant_id);
CREATE INDEX IF NOT EXISTS network_designs_project_idx ON network_designs (project_id);
CREATE INDEX IF NOT EXISTS cables_calc_dist_idx ON cables (calculated_distance_km);
CREATE INDEX IF NOT EXISTS clients_plan_mbps_idx ON clients (plan_mbps);
CREATE INDEX IF NOT EXISTS areas_tenant_idx ON areas (tenant_id);
CREATE INDEX IF NOT EXISTS projects_tenant_idx ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS projects_area_idx ON projects (area_id);
CREATE INDEX IF NOT EXISTS pops_area_idx ON pops (area_id);
CREATE INDEX IF NOT EXISTS ctos_area_idx ON ctos (area_id);
CREATE INDEX IF NOT EXISTS ces_area_idx ON ces (area_id);
CREATE INDEX IF NOT EXISTS network_nodes_area_idx ON network_nodes (area_id);
CREATE INDEX IF NOT EXISTS cables_area_idx ON cables (area_id);
CREATE INDEX IF NOT EXISTS catalog_service_card_tenant_idx ON catalog_service_card (tenant_id);
CREATE INDEX IF NOT EXISTS catalog_service_card_category_idx ON catalog_service_card (category);

-- ========================
-- SCHEMA MIGRATIONS (for existing DBs)
-- ========================
DO $$
BEGIN
  -- tenants: add new SaaS columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plan') THEN
    ALTER TABLE tenants ADD COLUMN plan VARCHAR(30) DEFAULT 'trial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'status') THEN
    ALTER TABLE tenants ADD COLUMN status VARCHAR(30) DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'blocked_reason') THEN
    ALTER TABLE tenants ADD COLUMN blocked_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'blocked_at') THEN
    ALTER TABLE tenants ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'domain') THEN
    ALTER TABLE tenants ADD COLUMN domain VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_cycle') THEN
    ALTER TABLE tenants ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'next_billing_date') THEN
    ALTER TABLE tenants ADD COLUMN next_billing_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_pops') THEN
    ALTER TABLE tenants ADD COLUMN max_pops INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_olts') THEN
    ALTER TABLE tenants ADD COLUMN max_olts INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_ctos') THEN
    ALTER TABLE tenants ADD COLUMN max_ctos INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_ces') THEN
    ALTER TABLE tenants ADD COLUMN max_ces INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_clients') THEN
    ALTER TABLE tenants ADD COLUMN max_clients INTEGER DEFAULT 500;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_cables') THEN
    ALTER TABLE tenants ADD COLUMN max_cables INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_fibers') THEN
    ALTER TABLE tenants ADD COLUMN max_fibers INTEGER DEFAULT 5000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'features') THEN
    ALTER TABLE tenants ADD COLUMN features JSONB DEFAULT '{"map_view":true,"kml_import":true,"reports":true,"viability":true,"signal_calc":true,"fusion_diagram":true,"splice_plan":true,"rupture_analysis":true,"projects":true}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'settings') THEN
    ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'updated_at') THEN
    ALTER TABLE tenants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- olt_chassis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olt_chassis' AND column_name = 'updated_at') THEN
    ALTER TABLE olt_chassis ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olt_chassis' AND column_name = 'catalog_olt_model_id') THEN
    ALTER TABLE olt_chassis ADD COLUMN catalog_olt_model_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olt_chassis' AND column_name = 'management_ip') THEN
    ALTER TABLE olt_chassis ADD COLUMN management_ip VARCHAR(45);
  END IF;

  -- clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'catalog_ont_id') THEN
    ALTER TABLE clients ADD COLUMN catalog_ont_id UUID;
  END IF;

  -- areas table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'areas') THEN
    CREATE TABLE areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      geom GEOMETRY(Polygon, 4326),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_areas ON areas FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
    CREATE INDEX IF NOT EXISTS areas_tenant_idx ON areas (tenant_id);
  END IF;

  -- projects table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    CREATE TABLE projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      area_id UUID REFERENCES areas(id),
      status VARCHAR(50) DEFAULT 'draft',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_projects ON projects FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
    CREATE INDEX IF NOT EXISTS projects_tenant_idx ON projects (tenant_id);
    CREATE INDEX IF NOT EXISTS projects_area_idx ON projects (area_id);
  END IF;

  -- area_id on infrastructure tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pops' AND column_name = 'area_id') THEN
    ALTER TABLE pops ADD COLUMN area_id UUID REFERENCES areas(id);
    CREATE INDEX IF NOT EXISTS pops_area_idx ON pops (area_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ctos' AND column_name = 'area_id') THEN
    ALTER TABLE ctos ADD COLUMN area_id UUID REFERENCES areas(id);
    CREATE INDEX IF NOT EXISTS ctos_area_idx ON ctos (area_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ces' AND column_name = 'area_id') THEN
    ALTER TABLE ces ADD COLUMN area_id UUID REFERENCES areas(id);
    CREATE INDEX IF NOT EXISTS ces_area_idx ON ces (area_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'network_nodes' AND column_name = 'area_id') THEN
    ALTER TABLE network_nodes ADD COLUMN area_id UUID REFERENCES areas(id);
    CREATE INDEX IF NOT EXISTS network_nodes_area_idx ON network_nodes (area_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cables' AND column_name = 'area_id') THEN
    ALTER TABLE cables ADD COLUMN area_id UUID REFERENCES areas(id);
    CREATE INDEX IF NOT EXISTS cables_area_idx ON cables (area_id);
  END IF;
  -- cables: missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cables' AND column_name = 'status') THEN
    ALTER TABLE cables ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cables' AND column_name = 'installation_date') THEN
    ALTER TABLE cables ADD COLUMN installation_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cables' AND column_name = 'cable_type_id') THEN
    ALTER TABLE cables ADD COLUMN cable_type_id UUID REFERENCES catalog_cable_type(id);
    CREATE INDEX IF NOT EXISTS cables_type_idx ON cables (cable_type_id);
  END IF;

  -- splice_trays: missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'splice_trays' AND column_name = 'name') THEN
    ALTER TABLE splice_trays ADD COLUMN name VARCHAR(255);
  END IF;

  -- catalog_cable_type: style columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_cable_type' AND column_name = 'color') THEN
    ALTER TABLE catalog_cable_type ADD COLUMN color VARCHAR(7) DEFAULT '#3b82f6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_cable_type' AND column_name = 'stroke_width') THEN
    ALTER TABLE catalog_cable_type ADD COLUMN stroke_width INTEGER DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_cable_type' AND column_name = 'dashed') THEN
    ALTER TABLE catalog_cable_type ADD COLUMN dashed BOOLEAN DEFAULT false;
  END IF;

  -- default cable types
  INSERT INTO catalog_cable_type (tenant_id, name, fiber_count, color, stroke_width, dashed)
  SELECT t.id, 'Troncal', 48, '#dc2626', 5, false FROM tenants t
  WHERE NOT EXISTS (SELECT 1 FROM catalog_cable_type WHERE tenant_id = t.id AND name = 'Troncal');
  INSERT INTO catalog_cable_type (tenant_id, name, fiber_count, color, stroke_width, dashed)
  SELECT t.id, 'Distribuição', 12, '#2563eb', 3, false FROM tenants t
  WHERE NOT EXISTS (SELECT 1 FROM catalog_cable_type WHERE tenant_id = t.id AND name = 'Distribuição');
  INSERT INTO catalog_cable_type (tenant_id, name, fiber_count, color, stroke_width, dashed)
  SELECT t.id, 'Drop', 2, '#f59e0b', 2, true FROM tenants t
  WHERE NOT EXISTS (SELECT 1 FROM catalog_cable_type WHERE tenant_id = t.id AND name = 'Drop');

  -- Router catalog migrations
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'router_type') THEN
    CREATE TYPE router_type AS ENUM ('fixed', 'modular');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_category') THEN
    CREATE TYPE card_category AS ENUM ('pon', 'service', 'uplink', 'stacking', 'management', 'power', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'type') THEN
    ALTER TABLE catalog_router ADD COLUMN type router_type DEFAULT 'fixed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'slots') THEN
    ALTER TABLE catalog_router ADD COLUMN slots INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'ethernet_ports') THEN
    ALTER TABLE catalog_router ADD COLUMN ethernet_ports INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'sfp_ports') THEN
    ALTER TABLE catalog_router ADD COLUMN sfp_ports INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'sfp28_ports') THEN
    ALTER TABLE catalog_router ADD COLUMN sfp28_ports INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'qsfp_ports') THEN
    ALTER TABLE catalog_router ADD COLUMN qsfp_ports INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_router' AND column_name = 'qsfp28_ports') THEN
    ALTER TABLE catalog_router ADD COLUMN qsfp28_ports INTEGER DEFAULT 0;
  END IF;

  -- Create catalog_service_card table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_service_card') THEN
    CREATE TABLE catalog_service_card (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      category card_category NOT NULL,
      slots_type VARCHAR(50) DEFAULT 'service',
      ports INTEGER DEFAULT 0,
      pon_type VARCHAR(30),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, brand, model)
    );
    ALTER TABLE catalog_service_card ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_catalog_service_card ON catalog_service_card FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
    CREATE INDEX catalog_service_card_tenant_idx ON catalog_service_card (tenant_id);
    CREATE INDEX catalog_service_card_category_idx ON catalog_service_card (category);
  END IF;

  -- Map Legend table for KML icons
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_legend') THEN
    CREATE TABLE map_legend (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      node_type VARCHAR(50) NOT NULL DEFAULT 'cto',
      icon_id VARCHAR(255) NOT NULL,
      color VARCHAR(7),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE map_legend ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_map_legend ON map_legend FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
    CREATE INDEX map_legend_tenant_idx ON map_legend (tenant_id);
    CREATE INDEX map_legend_node_type_idx ON map_legend (node_type);

    -- Insert default legend items
    INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description)
    SELECT t.id, 'POP', 'pop', 'paddle/red-circle', '#ff0000', 'Ponto de Presença' FROM tenants t
    WHERE NOT EXISTS (SELECT 1 FROM map_legend WHERE tenant_id = t.id AND node_type = 'pop');
    INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description)
    SELECT t.id, 'CTO', 'cto', 'paddle/ylw-circle', '#ffff00', 'Caixa de Terminação Óptica' FROM tenants t
    WHERE NOT EXISTS (SELECT 1 FROM map_legend WHERE tenant_id = t.id AND node_type = 'cto');
    INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description)
    SELECT t.id, 'CE', 'ce', 'paddle/grn-circle', '#00ff00', 'Caixa de Emenda' FROM tenants t
    WHERE NOT EXISTS (SELECT 1 FROM map_legend WHERE tenant_id = t.id AND node_type = 'ce');
    INSERT INTO map_legend (tenant_id, name, node_type, icon_id, color, description)
    SELECT t.id, 'Cliente', 'client', 'paddle/ltblu-circle', '#00ffff', 'Cliente Final' FROM tenants t
    WHERE NOT EXISTS (SELECT 1 FROM map_legend WHERE tenant_id = t.id AND node_type = 'client');
  END IF;

  -- Add icon_id and icon_color columns to pops, ctos, ces, clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pops' AND column_name = 'icon_id') THEN
    ALTER TABLE pops ADD COLUMN icon_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pops' AND column_name = 'icon_color') THEN
    ALTER TABLE pops ADD COLUMN icon_color VARCHAR(7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ctos' AND column_name = 'icon_id') THEN
    ALTER TABLE ctos ADD COLUMN icon_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ctos' AND column_name = 'icon_color') THEN
    ALTER TABLE ctos ADD COLUMN icon_color VARCHAR(7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ces' AND column_name = 'icon_id') THEN
    ALTER TABLE ces ADD COLUMN icon_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ces' AND column_name = 'icon_color') THEN
    ALTER TABLE ces ADD COLUMN icon_color VARCHAR(7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'icon_id') THEN
    ALTER TABLE clients ADD COLUMN icon_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'icon_color') THEN
    ALTER TABLE clients ADD COLUMN icon_color VARCHAR(7);
  END IF;

  -- Fix existing icon_id values that include .png extension
  UPDATE map_legend SET icon_id = regexp_replace(icon_id, '\.png$', '') WHERE icon_id LIKE '%.png';
  UPDATE pops SET icon_id = regexp_replace(icon_id, '\.png$', '') WHERE icon_id LIKE '%.png';
  UPDATE ctos SET icon_id = regexp_replace(icon_id, '\.png$', '') WHERE icon_id LIKE '%.png';
  UPDATE ces SET icon_id = regexp_replace(icon_id, '\.png$', '') WHERE icon_id LIKE '%.png';
  UPDATE clients SET icon_id = regexp_replace(icon_id, '\.png$', '') WHERE icon_id LIKE '%.png';
END;
$$;
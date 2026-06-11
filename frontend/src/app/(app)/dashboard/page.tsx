'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Grid, Card, CardContent, Typography, Button, Stack, Chip } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { api, apiRoutes } from '@/lib/api';

interface Stats {
  pops?: number;
  ctos?: number;
  clients?: number;
  cables?: number;
  splices?: number;
  splitters?: number;
  gbics?: number;
  projects_draft?: number;
}

const statsCards = [
  { label: 'POPs', key: 'pops', href: '/pops', color: '#1976d2' },
  { label: 'CTOs', key: 'ctos', href: '/ctos', color: '#2e7d32' },
  { label: 'CEs', key: 'ctos', href: '/ces', color: '#7b1fa2' },
  { label: 'Cabos', key: 'cables', href: '/cables', color: '#ed6c02' },
  { label: 'Clientes Ativos', key: 'clients', href: '/clients', color: '#00838f' },
  { label: 'Splitters', key: 'splitters', href: '/splitters', color: '#c2185b' },
  { label: 'Fusões', key: 'splices', href: '/splices', color: '#512da8' },
  { label: 'GBICs', key: 'gbics', href: '/olts', color: '#0097a7' },
];

const quickActions = [
  { label: 'Verificar Viabilidade', href: '/viability', icon: '✓' },
  { label: 'Diagrama de Fusão', href: '/fusion-diagram', icon: '⚡' },
  { label: 'Análise de Rompimento', href: '/rupture', icon: '⚠' },
  { label: 'Calcular Potência', href: '/signal', icon: '📊' },
  { label: 'Importar KML', href: '/kml', icon: '📥' },
  { label: 'Gerar Relatórios', href: '/reports', icon: '📋' },
  { label: 'Gerenciar Projetos', href: '/projects', icon: '📁' },
  { label: 'Cadastrar Fibras', href: '/fibers', icon: '🔗' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(apiRoutes.reports + '/summary').then(data => {
      if (data) setStats(data.data || {});
      setLoading(false);
    });
  }, []);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction="row" spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Dashboard
        </Typography>
        <Chip 
          icon={<HelpIcon sx={{ fontSize: 18 }} />} 
          label="Visão geral da sua rede FTTH"
          size="small"
          variant="outlined"
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Typography color="text.secondary">Carregando...</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
            Estatísticas da Rede
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {statsCards.map(card => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={card.key + card.label}>
                <Card 
                  component={Link}
                  href={card.href}
                  sx={{ 
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 2,
                      bgcolor: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                        {stats[card.key as keyof Stats] || 0}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {card.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
            Ações Rápidas
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {quickActions.map(action => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={action.label}>
                <Card 
                  component={Link}
                  href={action.href}
                  sx={{ 
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Typography>{action.icon}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {action.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Projetos em Andamento
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {stats.projects_draft || 0} projetos em modo rascunho
                  </Typography>
                  <Button 
                    component={Link}
                    href="/projects"
                    variant="text"
                    sx={{ p: 0, minHeight: 44 }}
                  >
                    Ver todos →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Cálculo de Potência
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Calcule a potência do sinal óptico da sua rede
                  </Typography>
                  <Button 
                    component={Link}
                    href="/signal"
                    variant="contained"
                    color="primary"
                    sx={{ minHeight: 44 }}
                  >
                    Calcular sinal
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
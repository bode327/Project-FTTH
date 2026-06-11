'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Toolbar, IconButton, Typography, AppBar, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MapIcon from '@mui/icons-material/Map';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import RouterIcon from '@mui/icons-material/Router';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CableIcon from '@mui/icons-material/Cable';
import PeopleIcon from '@mui/icons-material/People';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FolderIcon from '@mui/icons-material/Folder';
import LayersIcon from '@mui/icons-material/Layers';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import StorageIcon from '@mui/icons-material/Storage';
import BugReportIcon from '@mui/icons-material/BugReport';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CategoryIcon from '@mui/icons-material/Category';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';

const iconMap: Record<string, React.ReactNode> = {
  '/dashboard': <DashboardIcon />,
  '/map': <MapIcon />,
  '/pops': <DeviceHubIcon />,
  '/olts': <RouterIcon />,
  '/ctos': <ViewInArIcon />,
  '/ces': <LayersIcon />,
  '/cables': <CableIcon />,
  '/clients': <PeopleIcon />,
  '/fibers': <FiberManualRecordIcon />,
  '/splices': <MergeTypeIcon />,
  '/splitters': <AccountTreeIcon />,
  '/catalogs': <CategoryIcon />,
  '/kml': <AddLocationAltIcon />,
  '/fusion-diagram': <StorageIcon />,
  '/rupture': <BugReportIcon />,
  '/swap': <SwapHorizIcon />,
  '/viability': <CheckCircleIcon />,
  '/signal': <SignalCellularAltIcon />,
  '/reports': <AssessmentIcon />,
  '/projects': <FolderIcon />,
  '/areas': <MapIcon />,
  '/legend': <MenuBookIcon />,
  '/users': <GroupIcon />,
  '/superadmin': <SecurityIcon />,
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mapa da Rede', href: '/map' },
  { label: 'POPs', href: '/pops' },
  { label: 'OLTs', href: '/olts' },
  { label: 'CTOs', href: '/ctos' },
  { label: 'CEs', href: '/ces' },
  { label: 'Cabos', href: '/cables' },
  { label: 'Clientes', href: '/clients' },
  { label: 'Fibras', href: '/fibers' },
  { label: 'Fusões', href: '/splices' },
  { label: 'Splitters', href: '/splitters' },
  { label: 'Catálogos', href: '/catalogs' },
  { label: 'Importar KML', href: '/kml' },
  { label: 'Diagrama de Fusão', href: '/fusion-diagram' },
  { label: 'Análise de Rompimento', href: '/rupture' },
  { label: 'Substituir Equipamento', href: '/swap' },
  { label: 'Viabilidade', href: '/viability' },
  { label: 'Cálculo de Potência', href: '/signal' },
  { label: 'Relatórios', href: '/reports' },
  { label: 'Projetos', href: '/projects' },
  { label: 'Áreas', href: '/areas' },
  { label: 'Legenda do Mapa', href: '/legend' },
  { label: 'Usuários', href: '/users' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('userRole');
    setToken(storedToken);
    setUserRole(storedRole);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading || !mounted) return;
    if (!token) router.push('/login');
  }, [loading, mounted, token, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading || !mounted) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        bgcolor: 'background.default',
      }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 4,
            borderColor: 'primary.main',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  const drawerWidth = 260;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile ? (
        <>
          <AppBar 
            position="sticky" 
            sx={{ 
              bgcolor: '#0f172a', 
              color: '#fff',
              boxShadow: 1,
            }}
          >
            <Toolbar sx={{ minHeight: 56 }}>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap sx={{ color: '#60a5fa', fontWeight: 700 }}>
                FTTH SaaS
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Drawer
            anchor="left"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            slotProps={{
              paper: {
                sx: {
                  width: 280,
                  bgcolor: '#0f172a',
                  color: '#fff',
                },
              },
            }}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ color: '#60a5fa', fontWeight: 700 }}>
                FTTH SaaS
              </Typography>
              <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: '#fff' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
              {navItems.map((item) => {
                const path = typeof window !== 'undefined' ? window.location.pathname : '';
                return (
                  <ListItem key={item.href} disablePadding>
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      selected={path === item.href}
                      sx={{
                        px: 2,
                        py: 1.5,
                        minHeight: 48,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(96, 165, 250, 0.15)',
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      <ListItemIcon sx={{ color: path === item.href ? '#60a5fa' : '#94a3b8', minWidth: 40 }}>
                        {iconMap[item.href] || <FolderIcon />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label}
                        sx={{ 
                          '& .MuiTypography-root': { 
                            color: path === item.href ? '#fff' : '#cbd5e1',
                            fontSize: '0.875rem'
                          } 
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              {userRole === 'superadmin' && (
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href="/superadmin"
                    onClick={() => setMobileDrawerOpen(false)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      minHeight: 48,
                      bgcolor: 'rgba(250, 204, 21, 0.1)',
                    }}
                  >
                    <ListItemIcon sx={{ color: '#facc15', minWidth: 40 }}>
                      <SecurityIcon />
                    </ListItemIcon>
<ListItemText 
                        primary="Painel SaaS" 
                        sx={{ '& .MuiTypography-root': { color: '#facc15' } }} 
                      />
                  </ListItemButton>
                </ListItem>
              )}
            </List>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    px: 2,
                    py: 1.5,
                    minHeight: 48,
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                  }}
                >
                  <ListItemIcon sx={{ color: '#f87171', minWidth: 40 }}>
                    <LogoutIcon />
                  </ListItemIcon>
<ListItemText 
                        primary="Sair" 
                        sx={{ '& .MuiTypography-root': { color: '#f87171' } }} 
                      />
                </ListItemButton>
              </ListItem>
            </List>
          </Drawer>
        </>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: '#0f172a',
              color: '#fff',
              borderRight: 'none',
            },
          }}
        >
          <Toolbar sx={{ px: 2, minHeight: 64 }}>
            <Typography variant="h6" noWrap sx={{ color: '#60a5fa', fontWeight: 700 }}>
              FTTH SaaS
            </Typography>
            <Typography variant="caption" sx={{ ml: 1, color: '#94a3b8' }}>
              Rede Óptica
            </Typography>
          </Toolbar>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          
          <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            {navItems.map((item) => {
              const path = typeof window !== 'undefined' ? window.location.pathname : '';
              return (
                <ListItem key={item.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    selected={path === item.href}
                    sx={{
                      px: 2,
                      py: 1.5,
                      minHeight: 48,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(96, 165, 250, 0.15)',
                        '&:hover': { bgcolor: 'rgba(96, 165, 250, 0.2)' },
                      },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <ListItemIcon sx={{ color: path === item.href ? '#60a5fa' : '#94a3b8', minWidth: 40 }}>
                      {iconMap[item.href] || <FolderIcon />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      sx={{ 
                        '& .MuiTypography-root': { 
                          color: path === item.href ? '#fff' : '#cbd5e1',
                          fontSize: '0.875rem'
                        } 
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {userRole === 'superadmin' && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/superadmin"
                  sx={{
                    px: 2,
                    py: 1.5,
                    minHeight: 48,
                    bgcolor: 'rgba(250, 204, 21, 0.1)',
                  }}
                >
                  <ListItemIcon sx={{ color: '#facc15', minWidth: 40 }}>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText 
                      primary="Painel SaaS" 
                      sx={{ '& .MuiTypography-root': { color: '#facc15' } }} 
                    />
                </ListItemButton>
              </ListItem>
            )}
          </List>
          
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  px: 2,
                  py: 1.5,
                  minHeight: 48,
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: '#f87171', minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText sx={{ '& .MuiTypography-root': { color: '#f87171' } }}>Sair</ListItemText>
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          pb: isMobile ? 8 : 0,
        }}
      >
        <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }} />
        {children}
      </Box>
    </Box>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, useTheme, BottomNavigation, BottomNavigationAction, Divider, Avatar, Menu, MenuItem, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import HubIcon from '@mui/icons-material/Hub';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Mapa', icon: <MapIcon />, path: '/map' },
  { label: 'POPs', icon: <HubIcon />, path: '/pops' },
  { label: 'CTOs', icon: <HubIcon />, path: '/ctos' },
  { label: 'Clientes', icon: <PeopleIcon />, path: '/clients' },
  { label: 'Cabos', icon: <AccountTreeIcon />, path: '/cables' },
  { label: 'Projetos', icon: <ListAltIcon />, path: '/projects' },
  { label: 'Catálogos', icon: <MenuBookIcon />, path: '/catalogs' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNav, setMobileNav] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentIndex = navItems.findIndex(item => pathname.startsWith(item.path));

  useEffect(() => {
    if (currentIndex >= 0) setMobileNav(currentIndex);
  }, [currentIndex]);

  const handleNavChange = (_event: React.SyntheticEvent, newValue: number) => {
    setMobileNav(newValue);
    router.push(navItems[newValue].path);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const drawer = (
    <Box sx={{ width: 280, height: '100%', bgcolor: 'primary.main' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>F</Avatar>
        <Box>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>FTTH</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Infraestrutura</Typography>
        </Box>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ flex: 1, pt: 2 }}>
        {navItems.map((item, index) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => { router.push(item.path); setDrawerOpen(false); }}
                sx={{
                  py: 1.5,
                  px: 3,
                  bgcolor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText>
                  <Typography sx={{ color: 'white', fontWeight: isActive ? 600 : 400, fontSize: '0.9375rem' }}>{item.label}</Typography>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => { router.push('/settings'); setDrawerOpen(false); }} sx={{ py: 1.5, px: 3 }}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><SettingsIcon /></ListItemIcon>
            <ListItemText><Typography sx={{ color: 'white', fontSize: '0.9375rem' }}>Configurações</Typography></ListItemText>
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: 'primary.main', zIndex: 1400 }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              FTTH - {navItems.find(i => pathname.startsWith(i.path))?.label || 'Rede'}
            </Typography>
            <IconButton color="inherit" onClick={handleMenu}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>A</Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
              <MenuItem onClick={handleCloseMenu}>Meu Perfil</MenuItem>
              <MenuItem onClick={handleCloseMenu}>Configurações</MenuItem>
              <Divider />
              <MenuItem onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}>Sair</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      )}

      {!isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: 'primary.main', zIndex: 1400 }}>
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 600, mr: 4 }}>FTTH Rede</Typography>
            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
              {navItems.map((item) => (
                <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: pathname.startsWith(item.path) ? 600 : 400,
                      bgcolor: pathname.startsWith(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {item.label}
                  </Box>
                </Link>
              ))}
            </Box>
            <IconButton color="inherit" onClick={handleMenu}>
              <Badge badgeContent={3} color="error">
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>A</Avatar>
              </Badge>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
              <MenuItem onClick={handleCloseMenu}>Meu Perfil</MenuItem>
              <MenuItem onClick={handleCloseMenu}>Configurações</MenuItem>
              <Divider />
              <MenuItem onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}>Sair</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: 280 } }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: isMobile ? 8 : 8,
          pb: isMobile ? 10 : 4,
          px: isMobile ? 2 : 4,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>

      {isMobile && (
        <BottomNavigation
          value={mobileNav}
          onChange={handleNavChange}
          showLabels
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1400,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {navItems.slice(0, 5).map((item, index) => (
            <BottomNavigationAction
              key={index}
              label={item.label}
              icon={item.icon}
              sx={{ minWidth: 64 }}
            />
          ))}
        </BottomNavigation>
      )}
    </Box>
  );
}
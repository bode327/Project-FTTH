'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }
}

const getDesignTokens = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0', contrastText: '#ffffff' },
          secondary: { main: '#00838f', light: '#4fb3bf', dark: '#005662', contrastText: '#ffffff' },
          error: { main: '#d32f2f' },
          warning: { main: '#ed6c02' },
          success: { main: '#2e7d32' },
          info: { main: '#0288d1' },
          neutral: { main: '#9e9e9e', light: '#e0e0e0', dark: '#616161' },
          background: { default: '#f5f5f5', paper: '#ffffff' },
          text: { primary: '#212121', secondary: '#757575' },
        }
      : {
          primary: { main: '#90caf9', light: '#bbdefb', dark: '#64b5f6', contrastText: '#000000' },
          secondary: { main: '#80deea', light: '#b2ebf2', dark: '#4dd0e1', contrastText: '#000000' },
          error: { main: '#ef9a9a' },
          warning: { main: '#ffcc80' },
          success: { main: '#a5d6a7' },
          info: { main: '#81d4fa' },
          neutral: { main: '#9e9e9e', light: '#e0e0e0', dark: '#616161' },
          background: { default: '#121212', paper: '#1e1e1e' },
          text: { primary: '#ffffff', secondary: '#b0b0b0' },
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 500 },
    h2: { fontWeight: 500 },
    h3: { fontWeight: 500 },
    h4: { fontWeight: 500 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44, padding: '10px 20px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8, minHeight: 48 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiFab: {
      styleOverrides: { root: { minWidth: 56, minHeight: 56 } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { height: 64 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: { root: { minWidth: 80, padding: '8px 12px' } },
    },
  },
});

export function getTheme(mode: 'light' | 'dark') {
  let theme = createTheme(getDesignTokens(mode));
  theme = responsiveFontSizes(theme);
  return theme;
}

export default getTheme;
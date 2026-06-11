'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ mode: 'light', toggleTheme: () => {} });

export const useThemeMode = () => useContext(ThemeContext);

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const getDesignTokens = (m: 'light' | 'dark') => ({
    palette: {
      mode: m,
      ...(m === 'light'
        ? {
            primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0', contrastText: '#ffffff' },
            secondary: { main: '#00838f', light: '#4fb3bf', dark: '#005662', contrastText: '#ffffff' },
            error: { main: '#d32f2f' },
            warning: { main: '#ed6c02' },
            success: { main: '#2e7d32' },
            info: { main: '#0288d1' },
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
            background: { default: '#121212', paper: '#1e1e1e' },
            text: { primary: '#ffffff', secondary: '#b0b0b0' },
          }),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
    },
  });

  let theme = createTheme(getDesignTokens(mode));
  theme = responsiveFontSizes(theme);

  if (!mounted) {
    return <CssBaseline />;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, apiRoutes } from '@/lib/api';

export default function CablesPage() {
  const [cables, setCables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', node_a_id: '', node_b_id: '', calculated_distance_km: '', measured_distance_km: '' });

  const load = () => api.get(apiRoutes.cables).then(data => { if (data) setCables(data.data || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { 
      await api.post(apiRoutes.cables, { 
        name: form.name, 
        node_a_id: form.node_a_id || null, 
        node_b_id: form.node_b_id || null, 
        calculated_distance_km: form.calculated_distance_km ? parseFloat(form.calculated_distance_km) : null, 
        measured_distance_km: form.measured_distance_km ? parseFloat(form.measured_distance_km) : null 
      }); 
      setShowForm(false); 
      setForm({ name: '', node_a_id: '', node_b_id: '', calculated_distance_km: '', measured_distance_km: '' }); 
      load(); 
    }
    catch (err: any) { alert(err.message); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Cabos
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setShowForm(!showForm)}
          sx={{ minHeight: 44 }}
        >
          Novo Cabo
        </Button>
      </Box>

      {showForm && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Cadastrar Cabo
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Nome *"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    required
                    placeholder="Cabo FO 36FO AS80"
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Distância Calculada (km)"
                    type="number"
                    value={form.calculated_distance_km}
                    onChange={e => setForm({...form, calculated_distance_km: e.target.value})}
                    slotProps={{ htmlInput: { step: 'any' } }}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Distância Medida OTDR (km)"
                    type="number"
                    value={form.measured_distance_km}
                    onChange={e => setForm({...form, measured_distance_km: e.target.value})}
                    slotProps={{ htmlInput: { step: 'any' } }}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button type="submit" variant="contained" color="primary" sx={{ minHeight: 44 }}>
                      Salvar
                    </Button>
                    <Button variant="outlined" onClick={() => setShowForm(false)} sx={{ minHeight: 44 }}>
                      Cancelar
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Carregando...</Typography>
          </Box>
        ) : cables.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Nenhum cabo cadastrado.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>De</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Para</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Distância Calculada</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Distância OTDR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cables.map(cable => (
                  <TableRow key={cable.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{cable.name}</TableCell>
                    <TableCell>{cable.node_a_name || '-'}</TableCell>
                    <TableCell>{cable.node_b_name || '-'}</TableCell>
                    <TableCell>{cable.calculated_distance_km ? `${cable.calculated_distance_km} km` : '-'}</TableCell>
                    <TableCell>{cable.measured_distance_km ? `${cable.measured_distance_km} km` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
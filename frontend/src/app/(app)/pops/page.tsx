'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Typography, Button, TextField, Card, CardContent, Grid, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { api, apiRoutes } from '@/lib/api';
import HelpIcon from '@/components/HelpIcon';

export default function PopsPage() {
  const [pops, setPops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '' });

  const load = () => {
    api.get(apiRoutes.pops).then(data => { if (data) setPops(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(apiRoutes.pops, { name: form.name, address: form.address, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined });
      setShowForm(false);
      setForm({ name: '', address: '', lat: '', lng: '' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir POP?')) return;
    try {
      await api.delete(`${apiRoutes.pops}/${id}`);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      alert(msg.includes('vinculados') ? msg : 'Erro ao excluir POP.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            POPs / Headends
          </Typography>
          <HelpIcon title="POPs (Headends)" description="POP (Point of Presence) é o ponto central da sua rede óptica. Cada POP pode abrigar múltiplos OLTs e equipamentos." />
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setShowForm(!showForm)}
          sx={{ minHeight: 44 }}
        >
          Novo POP
        </Button>
      </Box>

      {showForm && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Cadastrar POP
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
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Endereço"
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    type="number"
                    value={form.lat}
                    onChange={e => setForm({...form, lat: e.target.value})}
                    slotProps={{ htmlInput: { step: 'any' } }}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    type="number"
                    value={form.lng}
                    onChange={e => setForm({...form, lng: e.target.value})}
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
        ) : pops.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Nenhum POP cadastrado.</Typography>
            <Typography variant="body2" color="text.secondary">Clique em "Novo POP" para começar.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Endereço</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Coordenadas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pops.map(pop => (
                  <TableRow key={pop.id} hover sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>{pop.name}</TableCell>
                    <TableCell>{pop.address || '-'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {pop.lat && pop.lng ? `${parseFloat(pop.lat).toFixed(6)}, ${parseFloat(pop.lng).toFixed(6)}` : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        component={Link} 
                        href={`/olts?pop=${pop.id}`}
                        size="small"
                        sx={{ mr: 1, minHeight: 36 }}
                      >
                        OLTs
                      </Button>
                      <IconButton 
                        onClick={() => handleDelete(pop.id)} 
                        color="error"
                        size="small"
                        sx={{ minWidth: 36, minHeight: 36 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
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
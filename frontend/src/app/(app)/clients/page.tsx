'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, apiRoutes } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [ctos, setCtos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', plan_mbps: '', cto_id: '', ont_serial: '', vlan: '' });

  const load = () => {
    api.get(apiRoutes.clients).then(data => { if (data) setClients(data.data || []); });
    api.get(apiRoutes.ctos).then(data => { if (data) setCtos(data.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { 
      await api.post(apiRoutes.clients, { 
        name: form.name, 
        address: form.address, 
        phone: form.phone, 
        plan_mbps: form.plan_mbps ? parseInt(form.plan_mbps) : null, 
        cto_id: form.cto_id || null, 
        ont_serial: form.ont_serial || null, 
        vlan: form.vlan ? parseInt(form.vlan) : null 
      }); 
      setShowForm(false); 
      setForm({ name: '', address: '', phone: '', plan_mbps: '', cto_id: '', ont_serial: '', vlan: '' }); 
      load(); 
    }
    catch (err: any) { alert(err.message); }
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: 'success' | 'default' | 'error', label: string }> = {
      active: { color: 'success', label: 'Ativo' },
      inactive: { color: 'default', label: 'Inativo' },
      suspended: { color: 'error', label: 'Suspenso' },
    };
    const config = statusConfig[status] || { color: 'default', label: status || 'Ativo' };
    return <Chip label={config.label} color={config.color} size="small" sx={{ minHeight: 28 }} />;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Clientes
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setShowForm(!showForm)}
          sx={{ minHeight: 44 }}
        >
          Novo Cliente
        </Button>
      </Box>

      {showForm && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Cadastrar Cliente
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Nome *"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    required
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}>
                    <InputLabel>CTO</InputLabel>
                    <Select
                      value={form.cto_id}
                      label="CTO"
                      onChange={e => setForm({...form, cto_id: e.target.value})}
                    >
                      <MenuItem value="">Selecione CTO</MenuItem>
                      {ctos.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Endereço"
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Plano (Mbps)"
                    type="number"
                    value={form.plan_mbps}
                    onChange={e => setForm({...form, plan_mbps: e.target.value})}
                    slotProps={{ htmlInput: { step: '1' } }}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Serial ONT"
                    value={form.ont_serial}
                    onChange={e => setForm({...form, ont_serial: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="VLAN"
                    type="number"
                    value={form.vlan}
                    onChange={e => setForm({...form, vlan: e.target.value})}
                    slotProps={{ htmlInput: { step: '1' } }}
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
        ) : clients.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Nenhum cliente cadastrado.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CTO</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Telefone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Plano</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                    <TableCell>{c.cto_name || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.plan_mbps ? `${c.plan_mbps} Mbps` : '-'}</TableCell>
                    <TableCell>{getStatusChip(c.status || 'active')}</TableCell>
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
// features/vente/pages/EquipesCommerciales/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiTrendingUp
} from 'react-icons/fi';

import { venteApi } from "../../services/venteApi";
import VenteTableContainer from "../../components/VenteTableContainer";

export default function EquipesCommercialesList() {
  const navigate = useNavigate();
  
  const [equipes, setEquipes] = useState([]);
  const [filteredEquipes, setFilteredEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const [utilisateurs, setUtilisateurs] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [equipesRes, utilisateursRes] = await Promise.all([
        venteApi.getEquipesCommerciales(),
        venteApi.getUtilisateurs()
      ]);

      const enrichedEquipes = (equipesRes.data || equipesRes.results || []).map(equipe => {
        const leadUser = (utilisateursRes.data || []).find(u => u.id === equipe.team_lead_id) || 
                        { id: equipe.team_lead_id, name: 'N/A', email: '' };
        
        return {
          ...equipe,
          teamLead: leadUser
        };
      });

      setEquipes(enrichedEquipes);
      setFilteredEquipes(enrichedEquipes);
      setUtilisateurs(utilisateursRes.data || []);
      setActiveRowId(null);
    } catch (err) {
      console.error('❌ Erreur chargement équipes:', err);
      setError('Impossible de charger les équipes commerciales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (equipe) => {
    if (!window.confirm(`Supprimer "${equipe.name}" ?`)) return;
    try {
      await venteApi.deleteEquipeCommerciale(equipe.id);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDuplicate = async (equipe) => {
    try {
      await venteApi.createEquipeCommerciale({
        ...equipe,
        id: undefined,
        name: `${equipe.name} (Copie)`
      });
      loadData();
    } catch (err) {
      alert('Erreur duplication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAction = async (actionFn) => {
    if (selectedIds.length === 0) {
      alert('Aucune équipe sélectionnée');
      return;
    }
    if (!window.confirm(`Appliquer l'action sur ${selectedIds.length} équipe(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        await actionFn(id);
      }
      setSelectedIds([]);
      loadData();
    } catch (err) {
      alert('Erreur action groupée: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredEquipes(equipes);
    } else {
      const filtered = equipes.filter(e =>
        (e.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (e.teamLead?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (e.region || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredEquipes(filtered);
    }
  }, [equipes]);

  const columns = [
    { id: 'nom', label: 'Nom de l\'équipe', width: '150px', render: e => <div className="font-semibold text-sm">{e.name || '—'}</div> },
    { id: 'chef', label: 'Chef d\'équipe', width: '140px', render: e => (
      <div>
        <div className="font-medium text-sm">{e.teamLead?.name || '—'}</div>
        <div className="text-xs text-gray-500">{e.teamLead?.email || ''}</div>
      </div>
    )},
    { id: 'region', label: 'Région', width: '120px', render: e => <span className="text-sm">{e.region || '—'}</span> },
    { id: 'objectif', label: 'Objectif Ventes', width: '140px', render: e => (
      <div className="text-right font-medium text-sm">
        {(e.sales_target || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} XOF
      </div>
    )},
    { id: 'commission', label: 'Commission', width: '120px', render: e => (
      <div className="text-right font-medium text-sm text-blue-600">
        {e.commission_rate ? `${e.commission_rate}%` : '—'}
      </div>
    )},
    { id: 'notes', label: 'Notes', width: '180px', render: e => (
      <span className="text-sm text-gray-600 truncate">{e.notes || '—'}</span>
    )},
    { id: 'actions', label: 'Actions', width: '150px', render: e => (
      <div className="flex gap-1">
        <button onClick={evt => { evt.stopPropagation(); navigate(`/ventes/equipes-commerciales/${e.id}`); }} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200" title="Voir"><FiEye size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); navigate(`/ventes/equipes-commerciales/${e.id}/edit`); }} className="p-1.5 bg-violet-100 rounded hover:bg-violet-200" title="Modifier"><FiEdit2 size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); handleDuplicate(e); }} className="p-1.5 bg-blue-100 rounded hover:bg-blue-200" title="Dupliquer"><FiCopy size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); handleDelete(e); }} className="p-1.5 bg-red-100 rounded hover:bg-red-200" title="Supprimer"><FiTrash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <VenteTableContainer
      data={filteredEquipes}
      loading={loading}
      error={error}
      title="Équipes Commerciales"
      moduleType="equipes"
      columns={columns}
      defaultVisibleColumns={[
        'nom',
        'chef',
        'region',
        'objectif',
        'commission',
        'notes',
        'actions'
      ]}
      onSelectionChange={setSelectedIds}
      onRefresh={loadData}
      onExport={(format) => alert(`Export en ${format} non implémenté`)}
      onCreate={() => navigate('/ventes/equipes-commerciales/create')}
      onSearch={handleSearch}
      onDuplicate={() => handleBulkAction(id => {
        const equipe = equipes.find(e => e.id === id);
        if (equipe) handleDuplicate(equipe);
      })}
      onDelete={() => handleBulkAction(venteApi.deleteEquipeCommerciale)}
      activeRowId={activeRowId}
      onRowClick={(e) => {
        setActiveRowId(e.id);
        navigate(`/ventes/equipes-commerciales/${e.id}/edit`);
      }}
      onView={(e) => navigate(`/ventes/equipes-commerciales/${e.id}`)}
      itemsPerPage={10}
      emptyState={equipes.length === 0 ? {
        title: 'Aucune équipe commerciale',
        description: 'Créez votre première équipe commerciale.',
        action: { 
          label: 'Créer une équipe', 
          onClick: () => navigate('/ventes/equipes-commerciales/create') 
        }
      } : null}
    />
  );
}

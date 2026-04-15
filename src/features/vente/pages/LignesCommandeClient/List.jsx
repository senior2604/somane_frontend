// features/vente/pages/LignesCommandeClient/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCopy
} from 'react-icons/fi';

import { venteApi } from "../../services/venteApi";
import VenteTableContainer from "../../components/VenteTableContainer";

export default function LignesCommandeClientList() {
  const navigate = useNavigate();
  
  const [lignes, setLignes] = useState([]);
  const [filteredLignes, setFilteredLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const [commandesClient, setCommandesClient] = useState([]);
  const [produits, setProduits] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [lignesRes, commandesRes, produitsRes] = await Promise.all([
        venteApi.getLignesCommandeClient(),
        venteApi.getCommandesClient(),
        venteApi.getProduits()
      ]);

      const enrichedLignes = (lignesRes.data || lignesRes.results || []).map(ligne => {
        const commande = (commandesRes.data || []).find(c => c.id === ligne.commande_client_id) || 
                        { id: ligne.commande_client_id, name: 'N/A' };
        const produit = (produitsRes.data || []).find(p => p.id === ligne.product_id) || 
                       { id: ligne.product_id, name: 'N/A', code: '—' };
        
        return {
          ...ligne,
          commande,
          produit
        };
      });

      setLignes(enrichedLignes);
      setFilteredLignes(enrichedLignes);
      setCommandesClient(commandesRes.data || []);
      setProduits(produitsRes.data || []);
      setActiveRowId(null);
    } catch (err) {
      console.error('❌ Erreur chargement lignes:', err);
      setError('Impossible de charger les lignes de commande client.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (ligne) => {
    if (!window.confirm(`Supprimer la ligne ?`)) return;
    try {
      await venteApi.deleteLigneCommandeClient(ligne.id);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDuplicate = async (ligne) => {
    try {
      await venteApi.createLigneCommandeClient({
        ...ligne,
        id: undefined
      });
      loadData();
    } catch (err) {
      alert('Erreur duplication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAction = async (actionFn) => {
    if (selectedIds.length === 0) {
      alert('Aucune ligne sélectionnée');
      return;
    }
    if (!window.confirm(`Appliquer l'action sur ${selectedIds.length} ligne(s) ?`)) return;
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
      setFilteredLignes(lignes);
    } else {
      const filtered = lignes.filter(l =>
        (l.commande?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (l.produit?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (l.produit?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (l.notes || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredLignes(filtered);
    }
  }, [lignes]);

  const columns = [
    { id: 'commande', label: 'Commande', width: '130px', render: l => <div className="font-semibold text-sm">{l.commande?.name || '—'}</div> },
    { id: 'produit', label: 'Produit', width: '160px', render: l => (
      <div>
        <div className="font-medium text-sm">{l.produit?.name || '—'}</div>
        <div className="text-xs text-gray-500">{l.produit?.code || ''}</div>
      </div>
    )},
    { id: 'quantite', label: 'Quantité', width: '110px', render: l => (
      <div className="text-right font-medium text-sm">
        {(l.quantity || 0).toLocaleString('fr-FR')}
      </div>
    )},
    { id: 'prix_unitaire', label: 'Prix Unitaire', width: '130px', render: l => (
      <div className="text-right font-medium text-sm">
        {(l.unit_price || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
      </div>
    )},
    { id: 'prix_total', label: 'Prix Total', width: '130px', render: l => (
      <div className="text-right font-bold text-sm text-blue-600">
        {(l.total_price || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
      </div>
    )},
    { id: 'notes', label: 'Notes', width: '150px', render: l => (
      <span className="text-sm text-gray-600 truncate">{l.notes || '—'}</span>
    )},
    { id: 'actions', label: 'Actions', width: '140px', render: l => (
      <div className="flex gap-1">
        <button onClick={evt => { evt.stopPropagation(); navigate(`/ventes/lignes-commande-client/${l.id}`); }} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200" title="Voir"><FiEye size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); navigate(`/ventes/lignes-commande-client/${l.id}/edit`); }} className="p-1.5 bg-violet-100 rounded hover:bg-violet-200" title="Modifier"><FiEdit2 size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); handleDuplicate(l); }} className="p-1.5 bg-blue-100 rounded hover:bg-blue-200" title="Dupliquer"><FiCopy size={14} /></button>
        <button onClick={evt => { evt.stopPropagation(); handleDelete(l); }} className="p-1.5 bg-red-100 rounded hover:bg-red-200" title="Supprimer"><FiTrash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <VenteTableContainer
      data={filteredLignes}
      loading={loading}
      error={error}
      title="Lignes de Commande Client"
      moduleType="lignes"
      columns={columns}
      defaultVisibleColumns={[
        'commande',
        'produit',
        'quantite',
        'prix_unitaire',
        'prix_total',
        'notes',
        'actions'
      ]}
      onSelectionChange={setSelectedIds}
      onRefresh={loadData}
      onExport={(format) => alert(`Export en ${format} non implémenté`)}
      onCreate={() => navigate('/ventes/lignes-commande-client/create')}
      onSearch={handleSearch}
      onDuplicate={() => handleBulkAction(id => {
        const ligne = lignes.find(l => l.id === id);
        if (ligne) handleDuplicate(ligne);
      })}
      onDelete={() => handleBulkAction(venteApi.deleteLigneCommandeClient)}
      activeRowId={activeRowId}
      onRowClick={(l) => {
        setActiveRowId(l.id);
        navigate(`/ventes/lignes-commande-client/${l.id}/edit`);
      }}
      onView={(l) => navigate(`/ventes/lignes-commande-client/${l.id}`)}
      itemsPerPage={10}
      emptyState={lignes.length === 0 ? {
        title: 'Aucune ligne de commande',
        description: 'Créez votre première ligne de commande client.',
        action: { 
          label: 'Créer une ligne', 
          onClick: () => navigate('/ventes/lignes-commande-client/create') 
        }
      } : null}
    />
  );
}

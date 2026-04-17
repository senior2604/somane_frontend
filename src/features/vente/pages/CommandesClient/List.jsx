// features/vente/pages/CommandesClient/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiCopy
} from 'react-icons/fi';

import { venteApi } from "../../services/venteApi";
import VenteTableContainer from "../../components/VenteTableContainer";

export default function CommandesClientList() {
  const navigate = useNavigate();
  
  const [commandes, setCommandes] = useState([]);
  const [filteredCommandes, setFilteredCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [commandesRes, clientsRes, devisesRes, utilisateursRes] = await Promise.all([
        venteApi.getCommandesClient(),
        venteApi.getClients(),
        venteApi.getDevises(),
        venteApi.getUtilisateurs()
      ]);

      const enrichedCommandes = (commandesRes.data || commandesRes.results || []).map(commande => {
        const client = (clientsRes.data || []).find(c => c.id === commande.partner_id) || 
                       { id: commande.partner_id, name: 'Inconnu', email: '' };
        const devise = (devisesRes.data || []).find(d => d.id === commande.currency_id) || 
                       { id: commande.currency_id, name: 'XOF', symbol: '' };
        const utilisateur = (utilisateursRes.data || []).find(u => u.id === commande.user_id) || 
                           { id: commande.user_id, name: 'N/A' };
        
        return {
          ...commande,
          client,
          devise,
          utilisateur
        };
      });

      setCommandes(enrichedCommandes);
      setFilteredCommandes(enrichedCommandes);
      setActiveRowId(null);
    } catch (err) {
      console.error('❌ Erreur chargement commandes:', err);
      setError('Impossible de charger les commandes clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (commande) => {
    if (!window.confirm(`Supprimer "${commande.name}" ?`)) return;
    try {
      await venteApi.deleteCommandeClient(commande.id);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleConfirm = async (commande) => {
    try {
      await venteApi.updateCommandeClient(commande.id, { state: 'confirmer' });
      loadData();
    } catch (err) {
      alert('Erreur confirmation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancel = async (commande) => {
    try {
      await venteApi.updateCommandeClient(commande.id, { state: 'annule' });
      loadData();
    } catch (err) {
      alert('Erreur annulation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDuplicate = async (commande) => {
    try {
      const newCommande = await venteApi.createCommandeClient({
        ...commande,
        id: undefined,
        name: `${commande.name} (Copy)`
      });
      loadData();
    } catch (err) {
      alert('Erreur duplication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAction = async (actionFn) => {
    if (selectedIds.length === 0) {
      alert('Aucune commande sélectionnée');
      return;
    }
    if (!window.confirm(`Appliquer l'action sur ${selectedIds.length} commande(s) ?`)) return;
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
      setFilteredCommandes(commandes);
    } else {
      const filtered = commandes.filter(c =>
        (c.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (c.client?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (c.client?.email || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredCommandes(filtered);
    }
  }, [commandes]);

  const columns = [
    { id: 'date_order', label: 'Date commande', width: '120px', render: c => c.date_order ? new Date(c.date_order).toLocaleDateString('fr-FR') : '—' },
    { id: 'numero', label: 'Numéro', width: '130px', render: c => <div className="font-semibold text-sm">{c.name || '—'}</div> },
    { id: 'client', label: 'Client', width: '160px', render: c => (
      <div>
        <div className="font-medium text-sm">{c.client?.name || '—'}</div>
        <div className="text-xs text-gray-500">{c.client?.email || ''}</div>
      </div>
    )},
    { id: 'utilisateur', label: 'Vendeur', width: '130px', render: c => <span className="text-sm">{c.utilisateur?.name || '—'}</span> },
    { id: 'montant', label: 'Montant Total', width: '130px', render: c => (
      <div className="text-right font-medium text-sm">
        {(c.amount_total || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {c.devise?.symbol || 'XOF'}
      </div>
    )},
    { id: 'facturation', label: 'Facturation', width: '140px', render: c => {
      const config = {
        non_facturee: { text: 'Non facturée', cls: 'bg-gray-100 text-gray-800' },
        partiellement_facturee: { text: 'Partiellement', cls: 'bg-blue-100 text-blue-800' },
        facturee: { text: 'Facturée', cls: 'bg-green-100 text-green-800' }
      }[c.invoice_status] || { text: 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
          {config.text}
        </span>
      );
    }},
    { id: 'livraison', label: 'Livraison', width: '140px', render: c => {
      const config = {
        en_attente: { text: 'En attente', cls: 'bg-gray-100 text-gray-800' },
        en_cours: { text: 'En cours', cls: 'bg-yellow-100 text-yellow-800' },
        partiellement_livree: { text: 'Partiellement', cls: 'bg-blue-100 text-blue-800' },
        livree: { text: 'Livrée', cls: 'bg-green-100 text-green-800' }
      }[c.delivery_status] || { text: 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
          {config.text}
        </span>
      );
    }},
    { id: 'etat_commande', label: 'État', width: '130px', render: c => {
      const config = {
        brouillon: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-800' },
        demande_prix: { text: 'Demande prix', cls: 'bg-blue-100 text-blue-800' },
        envoyer: { text: 'Envoyée', cls: 'bg-purple-100 text-purple-800' },
        confirmer: { text: 'Confirmée', cls: 'bg-green-100 text-green-800' },
        annule: { text: 'Annulée', cls: 'bg-red-100 text-red-800' }
      }[c.state] || { text: 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
          {config.text}
        </span>
      );
    }},
    { id: 'actions', label: 'Actions', width: '180px', render: c => (
      <div className="flex gap-1">
        <button onClick={e => { e.stopPropagation(); navigate(`/ventes/commandes-client/${c.id}`); }} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200" title="Voir"><FiEye size={14} /></button>
        {c.state === 'brouillon' && (
          <>
            <button onClick={e => { e.stopPropagation(); navigate(`/ventes/commandes-client/${c.id}/edit`); }} className="p-1.5 bg-violet-100 rounded hover:bg-violet-200" title="Modifier"><FiEdit2 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleConfirm(c); }} className="p-1.5 bg-green-100 rounded hover:bg-green-200" title="Confirmer"><FiCheckCircle size={14} /></button>
          </>
        )}
        {(c.state === 'confirmer' || c.state === 'envoyer') && (
          <>
            <button onClick={e => { e.stopPropagation(); handleCancel(c); }} className="p-1.5 bg-amber-100 rounded hover:bg-amber-200" title="Annuler"><FiXCircle size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleDuplicate(c); }} className="p-1.5 bg-blue-100 rounded hover:bg-blue-200" title="Dupliquer"><FiCopy size={14} /></button>
          </>
        )}
        <button onClick={e => { e.stopPropagation(); handleDelete(c); }} className="p-1.5 bg-red-100 rounded hover:bg-red-200" title="Supprimer"><FiTrash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <VenteTableContainer
      data={filteredCommandes}
      loading={loading}
      error={error}
      title="Commandes Clients"
      moduleType="commandes"
      columns={columns}
      defaultVisibleColumns={[
        'date_order',
        'numero',
        'client',
        'utilisateur',
        'montant',
        'facturation',
        'livraison',
        'etat_commande',
        'actions'
      ]}
      onSelectionChange={setSelectedIds}
      onRefresh={loadData}
      onExport={(format) => alert(`Export en ${format} non implémenté`)}
      onCreate={() => navigate('/ventes/commandes-client/create')}
      onSearch={handleSearch}
      onConfirm={() => handleBulkAction(id => venteApi.updateCommandeClient(id, { state: 'confirmer' }))}
      onCancel={() => handleBulkAction(id => venteApi.updateCommandeClient(id, { state: 'annule' }))}
      onDelete={() => handleBulkAction(venteApi.deleteCommandeClient)}
      activeRowId={activeRowId}
      onRowClick={(c) => {
        setActiveRowId(c.id);
        navigate(`/ventes/commandes-client/${c.id}/edit`);
      }}
      onView={(c) => navigate(`/ventes/commandes-client/${c.id}`)}
      itemsPerPage={10}
      emptyState={commandes.length === 0 ? {
        title: 'Aucune commande client',
        description: 'Créez votre première commande client.',
        action: { 
          label: 'Créer une commande', 
          onClick: () => navigate('/ventes/commandes-client/create') 
        }
      } : null}
    />
  );
}

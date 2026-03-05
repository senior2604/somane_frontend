import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
  FiFilter
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function JournauxPage() {
  const navigate = useNavigate();
  const { activeEntity, entities = [] } = useEntity();
  
  const [journaux, setJournaux] = useState([]);
  const [filteredJournaux, setFilteredJournaux] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJournalIds, setSelectedJournalIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [entityFilter, setEntityFilter] = useState(activeEntity?.id || '');
  const [showEntityFilter, setShowEntityFilter] = useState(false);

  // Synchroniser entityFilter avec activeEntity
  useEffect(() => {
    if (activeEntity) {
      setEntityFilter(activeEntity.id);
      setShowEntityFilter(false);
    }
  }, [activeEntity]);

  // Charger les données
  const loadData = useCallback(async (entityId = null) => {
    const targetEntityId = entityId || activeEntity?.id;
    
    if (!targetEntityId) {
      setLoading(false);
      setError('Veuillez sélectionner une entité pour voir les journaux');
      setJournaux([]);
      setFilteredJournaux([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [journauxRes, typesRes] = await Promise.all([
        apiClient.get(`/compta/journals/?entity_id=${targetEntityId}`),
        apiClient.get(`/compta/journal-types/`)
      ]);

      const journauxData = journauxRes || [];
      const typesData = typesRes || [];

      // 🔥 CORRECTION : Gestion robuste du champ type (objet ou ID)
      const enrichedJournaux = journauxData.map(journal => {
        // Extraire l'ID du type intelligemment
        let typeId = null;
        
        if (journal.type && typeof journal.type === 'object') {
          // Cas où type est un objet complet
          typeId = journal.type.id;
        } else {
          // Cas où type est directement l'ID
          typeId = journal.type;
        }
        
        // Trouver le type correspondant
        const foundType = typesData.find(t => t.id === typeId);
        
        return {
          ...journal,
          type: foundType || { id: typeId, name: 'Inconnu', code: '??' }
        };
      });

      console.log('✅ Journaux enrichis:', enrichedJournaux.length, 'items');
      setJournaux(enrichedJournaux);
      setFilteredJournaux(enrichedJournaux);
      setJournalTypes(typesData);
      setActiveRowId(null);
      setSelectedJournalIds([]);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
      setError(err.message || 'Impossible de charger les journaux.');
      setJournaux([]);
      setFilteredJournaux([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gestion du changement d'entité
  const handleEntityChange = (entityId) => {
    setEntityFilter(entityId);
    loadData(entityId);
  };

  // Gestion de la suppression individuelle
  const handleDelete = async (journal) => {
    if (!window.confirm(`Supprimer le journal "${journal.name}" ?`)) return;
    
    try {
      await apiClient.delete(`/compta/journals/${journal.id}/`);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
  };

  // Gestion des actions groupées
  const handleBulkDelete = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    if (!window.confirm(`Supprimer ${selectedJournalIds.length} journal/aux ?`)) return;
    
    try {
      for (const id of selectedJournalIds) {
        await apiClient.delete(`/compta/journals/${id}/`);
      }
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur suppression groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    try {
      for (const id of selectedJournalIds) {
        await apiClient.patch(`/compta/journals/${id}/`, { active: true });
      }
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur activation groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedJournalIds.length === 0) {
      alert('Aucun journal sélectionné');
      return;
    }
    
    try {
      for (const id of selectedJournalIds) {
        await apiClient.patch(`/compta/journals/${id}/`, { active: false });
      }
      setSelectedJournalIds([]);
      loadData(entityFilter);
    } catch (err) {
      alert('Erreur désactivation groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  // Gestion de la recherche
  const handleSearch = useCallback((term) => {
    if (!term.trim()) {
      setFilteredJournaux(journaux);
    } else {
      const filtered = journaux.filter(j =>
        (j.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (j.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (j.type?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (j.type?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (j.default_account?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (j.default_account?.name || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredJournaux(filtered);
    }
  }, [journaux]);

  // Configuration des colonnes
  const columns = useMemo(() => [
    { 
      id: 'code', 
      label: 'Code',
      width: '90px',
      render: (journal) => (
        <div className="font-semibold text-sm">{journal.code || '—'}</div>
      )
    },
    { 
      id: 'nom', 
      label: 'Nom',
      width: '180px',
      render: (journal) => (
        <div>
          <div className="font-medium text-sm">{journal.name || '—'}</div>
          <div className="text-xs text-gray-500 truncate">
            {journal.note || ''}
          </div>
        </div>
      )
    },
    { 
      id: 'type', 
      label: 'Type',
      width: '140px',
      render: (journal) => (
        <div>
          <div className="font-medium text-sm">{journal.type?.code || '—'}</div>
          <div className="text-xs text-gray-500">{journal.type?.name || ''}</div>
        </div>
      )
    },
    { 
      id: 'compte', 
      label: 'Compte par défaut',
      width: '150px',
      render: (journal) => journal.default_account ? (
        <div>
          <div className="font-medium text-violet-600 font-mono text-sm">
            {journal.default_account.code || '—'}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {journal.default_account.name || ''}
          </div>
        </div>
      ) : (
        <span className="text-gray-400 italic text-sm">Non défini</span>
      )
    },
    { 
      id: 'banque', 
      label: 'Compte bancaire',
      width: '160px',
      render: (journal) => journal.bank_account ? (
        <div>
          <div className="font-medium text-sm">
            {journal.bank_account.numero_compte || '—'}
          </div>
          <div className="text-xs text-gray-500">
            {journal.bank_account.banque?.nom || journal.bank_account.nom || ''}
          </div>
        </div>
      ) : (
        <span className="text-gray-400 italic text-sm">Non défini</span>
      )
    },
    { 
      id: 'statut', 
      label: 'Statut',
      width: '100px',
      render: (journal) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          journal.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {journal.active ? 'Actif' : 'Inactif'}
        </span>
      )
    }
    // Colonne ACTIONS SUPPRIMÉE
  ], []);

  // Export
  const handleExport = (format) => {
    const dataToExport = filteredJournaux.length > 0 ? filteredJournaux : journaux;
    
    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    console.log(`Export des journaux en ${format}: ${dataToExport.length} éléments`);
    
    if (format === 'pdf') {
      alert('Export PDF non encore implémenté');
    } else if (format === 'excel') {
      alert('Export Excel non encore implémenté');
    }
  };

  // Création
  const handleCreate = () => {
    navigate('/comptabilite/journaux/create');
  };

  // Composant de filtre d'entité à intégrer dans le header du tableau
  const EntityFilterButton = () => {
    if (!Array.isArray(entities) || entities.length <= 1) return null;

    return (
      <div className="relative inline-block">
        <button
          onClick={() => setShowEntityFilter(!showEntityFilter)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border ${
            showEntityFilter 
              ? 'bg-blue-50 text-blue-700 border-blue-300' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FiFilter size={14} />
          <span>Changer d'entité</span>
        </button>
        
        {showEntityFilter && (
          <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-10">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-500 font-medium mb-1">
                Sélectionnez une entité
              </div>
              {entities.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => {
                    handleEntityChange(entity.id);
                    setShowEntityFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    entityFilter === entity.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{entity.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pas d'entité disponible
  if (!activeEntity && (!Array.isArray(entities) || entities.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-gray-300 rounded-sm">
            <div className="border-b border-gray-300 px-4 py-3">
              <div className="text-lg font-bold text-gray-900">Journaux Comptables</div>
            </div>
            <div className="p-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
                <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
                <p className="text-yellow-800 font-medium text-lg mb-3">
                  Aucune entité disponible
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Vous devez avoir accès à au moins une entité pour gérer les journaux comptables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <ComptabiliteTableContainer
          data={filteredJournaux}
          loading={loading}
          error={error}
          title="Journaux Comptables"
          moduleType="journaux"
          columns={columns}
          defaultVisibleColumns={['code', 'nom', 'type', 'compte', 'banque', 'statut']}
          onSelectionChange={setSelectedJournalIds}
          onRefresh={() => loadData(entityFilter)}
          onExport={handleExport}
          onCreate={handleCreate}
          onSearch={handleSearch}
          // Actions groupées
          onDelete={handleBulkDelete}
          onModify={() => {
            if (selectedJournalIds.length === 1) {
              navigate(`/comptabilite/journaux/${selectedJournalIds[0]}/edit`);
            } else {
              alert('Veuillez sélectionner un seul journal à modifier');
            }
          }}
          // Actions personnalisées via le menu
          onConfirm={handleBulkActivate}
          onCancel={handleBulkDeactivate}
          activeRowId={activeRowId}
          onRowClick={(journal, event) => {
            // Clic simple : met à jour la ligne active
            setActiveRowId(journal.id);
            // La sélection multiple est gérée dans le conteneur avec Ctrl/Shift
          }}
          onRowDoubleClick={(journal) => {
            // Double-clic : navigation vers la vue détail
            navigate(`/comptabilite/journaux/${journal.id}`);
          }}
          // onView supprimé (remplacé par double-clic)
          itemsPerPage={10}
          emptyState={journaux.length === 0 ? {
            title: 'Aucun journal comptable',
            description: 'Créez votre premier journal pour cette entité.',
            action: { 
              label: 'Créer un journal', 
              onClick: handleCreate
            }
          } : null}
          // Ajout du bouton de filtre d'entité dans le header
          headerExtra={<EntityFilterButton />}
        />
      </div>
    </div>
  );
}
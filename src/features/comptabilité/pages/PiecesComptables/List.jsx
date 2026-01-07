// features/comptabilité/pages/PiecesComptables/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

import { piecesService, apiClient } from "../../services";
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function PiecesPage() {
  const navigate = useNavigate();
  
  const [pieces, setPieces] = useState([]);
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [devises, setDevises] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Fonction pour enrichir les données avec les relations
  const enrichirPieces = (piecesData, journauxData, devisesData, partnersData) => {
    console.log('🔄 Enrichissement des données...');
    
    return piecesData.map(piece => {
      // 1. Trouver le journal (ID → Objet)
      const journal = journauxData.find(j => j.id === piece.journal);
      
      // 2. Trouver la devise (ID → Objet)
      const devise = devisesData.find(d => d.id === piece.currency);
      
      // 3. Trouver le partenaire (ID → Objet)
      const partenaire = partnersData.find(p => p.id === piece.partner);
      
      // 4. Calculer les totaux depuis les lignes
      let totalDebit = 0;
      let totalCredit = 0;
      
      if (piece.lines && Array.isArray(piece.lines)) {
        piece.lines.forEach(line => {
          totalDebit += parseFloat(line.debit) || 0;
          totalCredit += parseFloat(line.credit) || 0;
        });
      }
      
      return {
        ...piece,
        // Ajouter les champs compatibles frontend
        label: piece.name,  // Alias pour compatibilité
        libelle: piece.name, // Alias français
        number: piece.name,  // Alias pour le numéro
        status: piece.state, // Alias pour le statut
        
        // Ajouter les objets enrichis
        journal: journal || { id: piece.journal, code: `ID:${piece.journal}`, name: 'Inconnu' },
        currency: devise || { id: piece.currency, code: `ID:${piece.currency}`, symbol: '' },
        partner: partenaire || { id: piece.partner, name: 'Inconnu' },
        
        // Ajouter les totaux calculés
        total_debit: totalDebit,
        total_credit: totalCredit,
        debit: totalDebit, // Alias
        credit: totalCredit, // Alias
      };
    });
  };

  // Gestion de la recherche
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    // Appliquer les filtres
    if (term.trim() === '') {
      setFilteredPieces(pieces);
    } else {
      const filtered = pieces.filter(piece =>
        (piece.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (piece.ref || '').toLowerCase().includes(term.toLowerCase()) ||
        (piece.journal?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (piece.journal?.name || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredPieces(filtered);
    }
  }, [pieces]);

  // Gestion de la suppression
  const handleDelete = useCallback(async (piece) => {
    const pieceName = piece.name || piece.number || 'cette pièce';
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${pieceName}" ?`)) {
      try {
        await piecesService.delete(piece.id);
        loadData(); // Recharger les données
      } catch (err) {
        console.error('❌ Erreur suppression:', err);
        setError('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
      }
    }
  }, []);

  // Gestion des filtres
  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    // Pour l'instant, on ne fait rien avec les filtres
    console.log('Filtres appliqués:', filters);
  }, []);

  // Gestion de l'export
  const handleExport = useCallback(() => {
    const dataToExport = filteredPieces.length > 0 ? filteredPieces : pieces;
    
    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    console.log('Export des données:', dataToExport.length, 'pièces');
    alert(`${dataToExport.length} pièces prêtes à être exportées`);
  }, [filteredPieces, pieces]);

  // Charger toutes les données nécessaires
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement des données...');
      
      // Charger toutes les données en parallèle
      const [piecesRes, journauxRes, devisesRes, partnersRes] = await Promise.all([
        piecesService.getAll(),
        piecesService.getJournals(),
        piecesService.getDevises ? piecesService.getDevises() : Promise.resolve([]),
        piecesService.getPartners ? piecesService.getPartners() : Promise.resolve([])
      ]);
      
      console.log('📦 Données brutes récupérées:');
      console.log('   - Pièces:', piecesRes?.length || 0);
      console.log('   - Journaux:', journauxRes?.length || 0);
      console.log('   - Devises:', devisesRes?.length || 0);
      console.log('   - Partenaires:', partnersRes?.length || 0);
      
      if (piecesRes && piecesRes.length > 0) {
        console.log('📋 Exemple de pièce brute:');
        const pieceExemple = piecesRes[0];
        console.log('   ID:', pieceExemple.id);
        console.log('   Name (backend):', pieceExemple.name);
        console.log('   Journal (backend):', pieceExemple.journal); // C'est un ID!
        console.log('   Currency (backend):', pieceExemple.currency); // C'est un ID!
        console.log('   State (backend):', pieceExemple.state);
        console.log('   Lines:', pieceExemple.lines);
      }
      
      // Enrichir les pièces avec les relations
      const piecesEnrichies = enrichirPieces(
        piecesRes || [],
        journauxRes || [],
        devisesRes || [],
        partnersRes || []
      );
      
      setPieces(piecesEnrichies);
      setFilteredPieces(piecesEnrichies);
      setJournaux(journauxRes || []);
      setDevises(devisesRes || []);
      setPartners(partnersRes || []);
      
      // Charger les entreprises
      try {
        const companiesRes = await apiClient.get('entites/');
        setCompanies(companiesRes || []);
      } catch (err) {
        console.log('⚠️ Erreur chargement entreprises:', err);
        setCompanies([]);
      }

      console.log('✅ Chargement terminé - Pièces enrichies:', piecesEnrichies.length);
      
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message || 'Erreur de chargement des données');
      setPieces([]);
      setFilteredPieces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Configuration des colonnes - CORRIGÉE POUR LE BACKEND
  const columns = [
    { 
      id: 'numero', 
      label: 'Numéro',
      width: '120px',
      render: (piece) => {
        // Le backend utilise 'name', pas 'number'
        return (
          <div className="text-sm font-semibold text-gray-900">
            {piece.name || '—'}
          </div>
        );
      }
    },
    { 
      id: 'date', 
      label: 'Date',
      width: '100px',
      render: (piece) => (
        <div className="text-sm text-gray-700">
          {piece.date ? new Date(piece.date).toLocaleDateString('fr-FR') : '—'}
        </div>
      )
    },
    { 
      id: 'journal', 
      label: 'Journal',
      width: '150px',
      render: (piece) => {
        // piece.journal est maintenant un objet enrichi
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {piece.journal?.code || '—'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {piece.journal?.name || ''}
              </div>
            </div>
          </div>
        );
      }
    },
    { 
      id: 'libelle', 
      label: 'Libellé',
      width: '200px',
      render: (piece) => (
        <div className="text-sm text-gray-700 truncate" title={piece.name}>
          {piece.name || '—'}
        </div>
      )
    },
    { 
      id: 'devise', 
      label: 'Devise',
      width: '100px',
      render: (piece) => {
        // piece.currency est maintenant un objet enrichi
        if (piece.currency?.code) {
          return (
            <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
              <span className="font-semibold mr-1">{piece.currency?.symbol || ''}</span>
              <span className="text-gray-600">({piece.currency?.code})</span>
            </div>
          );
        }
        return <span className="text-gray-400 text-xs italic">—</span>;
      }
    },
    { 
      id: 'debit', 
      label: 'Débit',
      width: '120px',
      render: (piece) => (
        <div className="text-sm font-medium text-green-600 text-right">
          {piece.total_debit?.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) || '0,00'}
        </div>
      )
    },
    { 
      id: 'credit', 
      label: 'Crédit',
      width: '120px',
      render: (piece) => (
        <div className="text-sm font-medium text-red-600 text-right">
          {piece.total_credit?.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) || '0,00'}
        </div>
      )
    },
    { 
      id: 'statut', 
      label: 'Statut',
      width: '120px',
      render: (piece) => {
        // Le backend utilise 'state', pas 'status'
        const status = piece.state;
        
        let statusText = 'Inconnu';
        let statusClass = 'bg-gray-100 text-gray-800';
        
        if (status === 'posted') {
          statusText = 'Comptabilisé';
          statusClass = 'bg-green-100 text-green-800';
        } else if (status === 'draft') {
          statusText = 'Brouillon';
          statusClass = 'bg-amber-100 text-amber-800';
        } else if (status === 'cancel') { // Note: c'est 'cancel' dans votre modèle
          statusText = 'Annulé';
          statusClass = 'bg-red-100 text-red-800';
        }
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
            {statusText}
          </span>
        );
      }
    },
    { 
      id: 'actions', 
      label: 'Actions',
      width: '140px',
      render: (piece) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/comptabilite/pieces/${piece.id}`);
            }}
            className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 rounded transition-all duration-200 shadow-sm hover:shadow"
            title="Voir détails"
          >
            <FiEye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/comptabilite/pieces/${piece.id}/edit`);
            }}
            className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200 rounded transition-all duration-200 shadow-sm hover:shadow"
            title="Modifier"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(piece);
            }}
            className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 rounded transition-all duration-200 shadow-sm hover:shadow"
            title="Supprimer"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <ComptabiliteTableContainer
      // Données
      data={filteredPieces}
      loading={loading}
      error={error}
      
      // Configuration
      title="Pièces Comptables"
      moduleType="pieces"
      
      // Colonnes
      columns={columns}
      defaultVisibleColumns={['numero', 'date', 'journal', 'libelle', 'debit', 'credit', 'statut', 'actions']}
      
      // Filtres (simplifiés pour l'instant)
      filterConfigs={[]}
      onFilterChange={handleFilterChange}
      
      // Actions
      onRefresh={loadData}
      onExport={handleExport}
      onCreate={() => navigate('/comptabilite/pieces/create')}
      onSearch={handleSearch}
      
      // Pagination
      itemsPerPage={10}
      
      // Actions sur les lignes
      onView={(piece) => navigate(`/comptabilite/pieces/${piece.id}`)}
      onEdit={(piece) => navigate(`/comptabilite/pieces/${piece.id}/edit`)}
      onDelete={handleDelete}
      onRowClick={(piece) => navigate(`/comptabilite/pieces/${piece.id}`)}
      
      // Personnalisation
      emptyState={pieces.length === 0 ? {
        title: 'Aucune pièce comptable',
        description: 'Commencez par créer votre première pièce comptable',
        action: {
          label: 'Créer une pièce',
          onClick: () => navigate('/comptabilite/pieces/create')
        }
      } : null}
      
      // Informations
      totalItems={pieces.length}
      subtitle={`${pieces.length} pièce${pieces.length !== 1 ? 's' : ''} comptable${pieces.length !== 1 ? 's' : ''}`}
    />
  );
}
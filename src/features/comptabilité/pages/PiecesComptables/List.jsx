// features/comptabilité/pages/PiecesComptables/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

import { piecesService, apiClient } from "../../services";
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function PiecesPage() {
  const navigate = useNavigate();
  
  const [pieces, setPieces] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Utilisez piecesService au lieu de apiClient directement
      const [piecesRes, journauxRes] = await Promise.all([
        piecesService.getAll(),
        piecesService.getJournals()
      ]);

      // Correction : Les services retournent directement les données
      setPieces(Array.isArray(piecesRes) ? piecesRes : []);
      setJournaux(Array.isArray(journauxRes) ? journauxRes : []);
      
      // Charger les entreprises
      try {
        const companiesRes = await apiClient.get('entites/');
        setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      } catch (err) {
        console.log('Erreur chargement entreprises:', err);
        setCompanies([]);
      }

    } catch (err) {
      console.error('Erreur chargement pièces:', err);
      setError(err.message || 'Erreur de chargement des données');
      setPieces([]);
      setJournaux([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Configuration des colonnes (simplifiée comme pour les journaux)
  const columnConfig = [
    { id: 'numero', label: 'Numéro' },
    { id: 'date', label: 'Date' },
    { id: 'journal', label: 'Journal' },
    { id: 'libelle', label: 'Libellé' },
    { id: 'devise', label: 'Devise' },
    { id: 'debit', label: 'Débit' },
    { id: 'credit', label: 'Crédit' },
    { id: 'statut', label: 'Statut' },
    { id: 'actions', label: 'Actions' }
  ];

  // Configuration des filtres (simplifiée)
  const filterConfigs = companies.length > 0 || journaux.length > 0 ? [
    ...(companies.length > 0 ? [{
      id: 'company',
      label: 'Entreprise',
      type: 'select',
      options: companies.map(c => ({
        value: c.id,
        label: c.raison_sociale || c.nom || `Entreprise ${c.id}`
      })),
      placeholder: 'Toutes entreprises'
    }] : []),
    ...(journaux.length > 0 ? [{
      id: 'journal',
      label: 'Journal',
      type: 'select',
      options: journaux.map(j => ({
        value: j.id,
        label: `${j.code} - ${j.name}`
      })),
      placeholder: 'Tous les journaux'
    }] : []),
    {
      id: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'draft', label: 'Brouillon' },
        { value: 'posted', label: 'Comptabilisé' },
        { value: 'canceled', label: 'Annulé' }
      ],
      placeholder: 'Tous'
    }
  ] : [];

  // Export des données
  const handleExport = () => {
    const dataToExport = pieces.map(piece => ({
      Numéro: piece.number || '',
      Date: piece.date ? new Date(piece.date).toLocaleDateString('fr-FR') : '',
      Journal: piece.journal?.code || '',
      'Nom Journal': piece.journal?.name || '',
      Libellé: piece.label || '',
      Devise: piece.currency?.code || '',
      Débit: piece.total_debit || 0,
      Crédit: piece.total_credit || 0,
      Statut: piece.status === 'draft' ? 'Brouillon' : 
              piece.status === 'posted' ? 'Comptabilisé' : 
              piece.status === 'canceled' ? 'Annulé' : 'Inconnu',
    }));

    console.log('Export des pièces:', dataToExport);
    // Votre logique d'export ici
    alert(`Prêt à exporter ${dataToExport.length} pièces`);
  };

  // Gestion des filtres
  const handleFilterChange = (filters) => {
    console.log('Filtres appliqués:', filters);
    // Implémentez la logique de filtrage ici
  };

  // Rendu personnalisé du tableau - SIMPLIFIÉ comme pour les journaux
  const renderTableBody = () => {
    // Vérifiez que pieces est un tableau
    const safeData = Array.isArray(pieces) ? pieces : [];
    
    if (safeData.length === 0 && !loading) {
      return (
        <tbody>
          <tr>
            <td colSpan={columnConfig.length} className="px-4 py-8 text-center text-gray-500">
              Aucune pièce comptable disponible
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody className="divide-y divide-gray-200">
        {safeData.map((piece) => (
          <tr 
            key={piece.id || `piece-${Math.random()}`}
            className="hover:bg-gray-50 transition-colors"
          >
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border">
                {piece.number || '---'}
              </span>
            </td>
            
            <td className="px-4 py-3">
              <div className="text-sm text-gray-700">
                {piece.date ? new Date(piece.date).toLocaleDateString('fr-FR') : '—'}
              </div>
            </td>
            
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="text-xs font-medium text-gray-900">
                    {piece.journal?.code || '—'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {piece.journal?.name || ''}
                  </div>
                </div>
              </div>
            </td>
            
            <td className="px-4 py-3">
              <div className="text-sm text-gray-700 truncate max-w-[200px]" title={piece.label}>
                {piece.label || '—'}
              </div>
            </td>
            
            <td className="px-4 py-3">
              {piece.currency ? (
                <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                  <span className="font-semibold mr-1">{piece.currency.symbol || piece.currency.code || '—'}</span>
                  <span className="text-gray-600">({piece.currency.code || '—'})</span>
                </div>
              ) : (
                <span className="text-gray-400 text-xs italic">—</span>
              )}
            </td>
            
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="text-sm font-medium text-green-600">
                {(piece.total_debit || 0).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </td>
            
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="text-sm font-medium text-red-600">
                {(piece.total_credit || 0).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </td>
            
            <td className="px-4 py-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                piece.status === 'posted' ? 'bg-green-100 text-green-800' :
                piece.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                piece.status === 'canceled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {piece.status === 'posted' ? 'Comptabilisé' :
                 piece.status === 'draft' ? 'Brouillon' :
                 piece.status === 'canceled' ? 'Annulé' : 'Inconnu'}
              </span>
            </td>
            
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/comptabilite/pieces/${piece.id}`)}
                  className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 rounded transition-all duration-200 shadow-sm hover:shadow"
                  title="Voir détails"
                >
                  <FiEye size={14} />
                </button>
                <button
                  onClick={() => navigate(`/comptabilite/pieces/${piece.id}/edit`)}
                  className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200 rounded transition-all duration-200 shadow-sm hover:shadow"
                  title="Modifier"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${piece.number || 'cette pièce'}" ?`)) {
                      try {
                        await piecesService.delete(piece.id);
                        loadData(); // Recharger les données
                      } catch (err) {
                        alert('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
                      }
                    }
                  }}
                  className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 rounded transition-all duration-200 shadow-sm hover:shadow"
                  title="Supprimer"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <ComptabiliteTableContainer
      // Données
      data={pieces}
      loading={loading}
      error={error}
      
      // Configuration
      moduleType="pieces"
      columnConfig={columnConfig}
      filterConfigs={filterConfigs}
      
      // Callbacks
      onRefresh={loadData}
      onExport={handleExport}
      onFilterChange={handleFilterChange}
      onCreate={() => navigate('/comptabilite/pieces/create')}
      
      // Rendu personnalisé
      renderTableBody={renderTableBody}
    />
  );
}
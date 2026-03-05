import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiBriefcase
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function PiecesComptablesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [pieces, setPieces] = useState([]);
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPieceIds, setSelectedPieceIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  
  // États pour les référentiels
  const [partnersMap, setPartnersMap] = useState({});
  const [journalsMap, setJournalsMap] = useState({});
  const [currenciesMap, setCurrenciesMap] = useState({});
  const [accountsMap, setAccountsMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);

  // Effet pour la sélection d'entité
  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir les pièces comptables');
      setLoading(false);
    }
  }, [activeEntity]);

  // Charger tous les référentiels
  useEffect(() => {
    if (!activeEntity) return;
    
    const loadReferentials = async () => {
      try {
        setLoading(true);
        
        // Charger les partenaires
        console.log('📥 Chargement des partenaires...');
        const partners = await piecesService.getPartners(activeEntity.id);
        const partnersObj = {};
        partners.forEach(p => { 
          partnersObj[p.id] = {
            ...p,
            // Créer un champ name combiné pour faciliter l'affichage
            displayName: p.raison_sociale || 
                        (p.nom && p.prenom ? `${p.prenom} ${p.nom}` : p.nom) ||
                        p.name ||
                        'Partenaire sans nom'
          }; 
        });
        setPartnersMap(partnersObj);
        console.log('✅ Partenaires chargés:', Object.keys(partnersObj).length);
        
        // Charger les journaux
        console.log('📥 Chargement des journaux...');
        const journals = await piecesService.getJournals(activeEntity.id);
        const journalsObj = {};
        journals.forEach(j => { journalsObj[j.id] = j; });
        setJournalsMap(journalsObj);
        console.log('✅ Journaux chargés:', Object.keys(journalsObj).length);
        
        // Charger les devises
        console.log('📥 Chargement des devises...');
        const currencies = await piecesService.getDevises(activeEntity.id);
        const currenciesObj = {};
        currencies.forEach(c => { currenciesObj[c.id] = c; });
        setCurrenciesMap(currenciesObj);
        console.log('✅ Devises chargées:', Object.keys(currenciesObj).length);
        
        // Charger les comptes (optionnel, pour les lignes)
        console.log('📥 Chargement des comptes...');
        const accounts = await piecesService.getAccounts(activeEntity.id);
        const accountsObj = {};
        accounts.forEach(a => { accountsObj[a.id] = a; });
        setAccountsMap(accountsObj);
        console.log('✅ Comptes chargés:', Object.keys(accountsObj).length);
        
        setReferentialsLoaded(true);
        
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
        setError('Erreur lors du chargement des référentiels');
      } finally {
        setLoading(false);
      }
    };
    
    loadReferentials();
  }, [activeEntity]);

  // Charger les pièces
  const loadData = useCallback(async () => {
    if (!activeEntity || !referentialsLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des pièces comptables...');
      const piecesData = await piecesService.getAll(activeEntity.id);
      console.log('✅ Pièces chargées:', piecesData.length);
      
      // Pour chaque pièce, charger ses détails complets
      const piecesWithDetails = await Promise.all(
        piecesData.map(async (piece) => {
          try {
            // Charger les détails complets de la pièce (avec lignes)
            const pieceDetail = await piecesService.getById(piece.id, activeEntity.id);
            return pieceDetail;
          } catch (err) {
            console.warn(`⚠️ Impossible de charger les détails de la pièce ${piece.id}`, err);
            return piece;
          }
        })
      );
      
      // Enrichir les pièces avec les détails des référentiels
      const enrichedPieces = piecesWithDetails.map(piece => {
        // Enrichir la pièce principale
        const enrichedPiece = {
          ...piece,
          // Détails du partenaire principal
          partner_detail: piece.partner ? partnersMap[piece.partner] : null,
          // Détails du journal
          journal_detail: piece.journal ? journalsMap[piece.journal] : null,
          // Détails de la devise
          currency_detail: piece.currency ? currenciesMap[piece.currency] : null,
        };
        
        // Enrichir les lignes si elles existent
        if (piece.lines && Array.isArray(piece.lines)) {
          enrichedPiece.lines = piece.lines.map(line => ({
            ...line,
            // Détails du partenaire de la ligne
            partner_detail: line.partner ? partnersMap[line.partner] : null,
            // Détails du compte
            account_detail: line.account ? accountsMap[line.account] : null,
          }));
        } else {
          enrichedPiece.lines = [];
        }
        
        return enrichedPiece;
      });

      setPieces(enrichedPieces);
      setFilteredPieces(enrichedPieces);
      setActiveRowId(null);
      
    } catch (err) {
      console.error('❌ Erreur chargement pièces:', err);
      setError('Impossible de charger les pièces comptables.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, partnersMap, journalsMap, currenciesMap, accountsMap]);

  // Effet pour charger les pièces quand les référentiels sont prêts
  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // Handlers CRUD
  const handleDelete = async (piece) => {
    if (!window.confirm(`Supprimer "${piece.name}" ?`)) return;
    try {
      await piecesService.delete(piece.id, activeEntity.id);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleValidate = async (piece) => {
    try {
      await piecesService.validate(piece.id, activeEntity.id);
      loadData();
    } catch (err) {
      alert('Erreur validation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancel = async (piece) => {
    try {
      await piecesService.cancel(piece.id, activeEntity.id);
      loadData();
    } catch (err) {
      alert('Erreur annulation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReverse = async (piece) => {
    try {
      await piecesService.reverse(piece.id, activeEntity.id);
      loadData();
    } catch (err) {
      alert('Erreur extournement: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAction = async (actionFn) => {
    if (selectedPieceIds.length === 0) {
      alert('Aucune pièce sélectionnée');
      return;
    }
    if (!window.confirm(`Appliquer l'action sur ${selectedPieceIds.length} pièce(s) ?`)) return;
    try {
      for (const id of selectedPieceIds) {
        await actionFn(id, activeEntity.id);
      }
      setSelectedPieceIds([]);
      loadData();
    } catch (err) {
      alert('Erreur action groupée: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredPieces(pieces);
    } else {
      const filtered = pieces.filter(p =>
        (p.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.ref || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.journal_detail?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.journal_detail?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.partner_detail?.displayName || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.partner_detail?.email || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.lines || []).some(line => 
          (line.account_detail?.code || '').toLowerCase().includes(term.toLowerCase()) ||
          (line.account_detail?.name || '').toLowerCase().includes(term.toLowerCase()) ||
          (line.name || '').toLowerCase().includes(term.toLowerCase()) ||
          (line.partner_detail?.displayName || '').toLowerCase().includes(term.toLowerCase())
        )
      );
      setFilteredPieces(filtered);
    }
  }, [pieces]);

  // Composants d'affichage
  const MoveTypeDisplay = ({ type }) => {
    const config = {
      'entry': { text: 'Écriture', cls: 'bg-gray-100 text-gray-800' },
      'in_invoice': { text: 'Facture fournisseur', cls: 'bg-blue-100 text-blue-800' },
      'out_invoice': { text: 'Facture client', cls: 'bg-green-100 text-green-800' },
      'in_refund': { text: 'Avoir fournisseur', cls: 'bg-orange-100 text-orange-800' },
      'out_refund': { text: 'Avoir client', cls: 'bg-purple-100 text-purple-800' },
      'in_receipt': { text: 'Règlement fournisseur', cls: 'bg-cyan-100 text-cyan-800' },
      'out_receipt': { text: 'Règlement client', cls: 'bg-pink-100 text-pink-800' }
    }[type] || { text: type || 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  const PartnerDisplay = ({ partner }) => {
    if (!partner) return <span className="text-gray-400">—</span>;
    
    return (
      <div className="text-sm">
        <div className="font-medium">{partner.displayName || partner.name || 'Partenaire'}</div>
        {partner.email && <div className="text-xs text-gray-500">{partner.email}</div>}
        {partner.telephone && <div className="text-xs text-gray-500">{partner.telephone}</div>}
      </div>
    );
  };

  const columns = useMemo(() => [
    { 
      id: 'date', 
      label: 'Date', 
      width: '100px', 
      render: p => p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—' 
    },
    { 
      id: 'numero', 
      label: 'N° Pièce', 
      width: '130px', 
      render: p => (
        <div>
          <div className="font-semibold text-sm">{p.name || '—'}</div>
          {p.ref && <div className="text-xs text-gray-500">Réf: {p.ref}</div>}
          <div className="text-xs text-gray-400">{p.journal_detail?.code || p.journal}</div>
        </div>
      ) 
    },
    { 
      id: 'type', 
      label: 'Type', 
      width: '120px', 
      render: p => <MoveTypeDisplay type={p.move_type} />
    },
    { 
      id: 'partenaire', 
      label: 'Partenaire', 
      width: '200px', 
      render: p => <PartnerDisplay partner={p.partner_detail} />
    },
    { 
      id: 'montant_ht', 
      label: 'Montant HT', 
      width: '120px', 
      align: 'right',
      render: p => (
        <div className="text-right">
          <div className="font-medium">
            {(p.amount_untaxed || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{p.currency_detail?.code || p.currency}</div>
        </div>
      )
    },
    { 
      id: 'montant_taxes', 
      label: 'Montant Taxes', 
      width: '120px', 
      align: 'right',
      render: p => (
        <div className="text-right">
          <div className="font-medium text-blue-600">
            {(p.amount_tax || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{p.currency_detail?.code || p.currency}</div>
        </div>
      )
    },
    { 
      id: 'montant_ttc', 
      label: 'Montant TTC', 
      width: '120px', 
      align: 'right',
      render: p => (
        <div className="text-right">
          <div className="font-medium text-red-600">
            {(p.amount_total || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{p.currency_detail?.code || p.currency}</div>
        </div>
      )
    },
    { 
      id: 'etat', 
      label: 'État', 
      width: '100px', 
      render: p => {
        const config = {
          posted: { text: 'Comptabilisé', cls: 'bg-green-100 text-green-800' },
          draft: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-800' },
          cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-800' }
        }[p.state] || { text: p.state || 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
            {config.text}
          </span>
        );
      }
    },
    { 
      id: 'paiement', 
      label: 'Paiement', 
      width: '100px', 
      render: p => {
        const config = {
          'not_paid': { text: 'Non payé', cls: 'bg-gray-100 text-gray-800' },
          'paid': { text: 'Payé', cls: 'bg-green-100 text-green-800' },
          'partial': { text: 'Partiel', cls: 'bg-yellow-100 text-yellow-800' }
        }[p.payment_state] || { text: p.payment_state || '—', cls: 'bg-gray-100 text-gray-800' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
            {config.text}
          </span>
        );
      }
    }
    // Colonne EXPAND et ACTIONS supprimées
  ], []);

  // Rendu conditionnel si pas d'entité
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Pièces Comptables</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">
                Aucune entité sélectionnée
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour voir les pièces comptables.
              </p>
              <p className="text-xs text-gray-500">
                Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} /> 
                en haut à droite pour choisir une entité.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComptabiliteTableContainer
      data={filteredPieces}
      loading={loading}
      error={error}
      title="Pièces Comptables"
      moduleType="pieces"
      columns={columns}
      defaultVisibleColumns={[
        'date',
        'numero',
        'type',
        'partenaire',
        'montant_ht',
        'montant_taxes',
        'montant_ttc',
        'etat',
        'paiement'
      ]}
      onSelectionChange={setSelectedPieceIds}
      onRefresh={loadData}
      onExport={(format) => alert(`Export en ${format} non implémenté`)}
      onCreate={() => navigate('/comptabilite/pieces/create')}
      onSearch={handleSearch}
      onConfirm={() => handleBulkAction(piecesService.validate)}
      onCancel={() => handleBulkAction(piecesService.cancel)}
      onReverse={() => handleBulkAction(piecesService.reverse)}
      onDelete={() => handleBulkAction(piecesService.delete)}
      activeRowId={activeRowId}
      onRowClick={(p, event) => {
        // Clic simple : met à jour la ligne active
        setActiveRowId(p.id);
        // La sélection multiple est gérée dans le conteneur avec Ctrl/Shift
      }}
      onRowDoubleClick={(p) => {
        // Double-clic : navigation vers la vue détail
        navigate(`/comptabilite/pieces/${p.id}`);
      }}
      // expandedRow supprimé
      itemsPerPage={10}
      emptyState={pieces.length === 0 ? {
        title: 'Aucune pièce comptable',
        description: activeEntity ? 'Créez votre première pièce.' : 'Sélectionnez une entité pour commencer.',
        action: activeEntity ? { 
          label: 'Créer une pièce', 
          onClick: () => navigate('/comptabilite/pieces/create') 
        } : null
      } : null}
    />
  );
}
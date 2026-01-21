// features/comptabilité/pages/PiecesComptables/List.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiRotateCcw
} from 'react-icons/fi';

import { piecesService } from "../../services";
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function PiecesComptablesList() {
  const navigate = useNavigate();
  
  const [pieces, setPieces] = useState([]);
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPieceIds, setSelectedPieceIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [piecesRes, journauxRes, devisesRes, partnersRes] = await Promise.all([
        piecesService.getAll(),
        piecesService.getJournals(),
        piecesService.getDevises(),
        piecesService.getPartners()
      ]);
      
      const enrichedPieces = piecesRes.map(piece => {
        const journal = journauxRes.find(j => j.id === piece.journal) || 
                       { id: piece.journal, code: '??', name: 'Inconnu' };
        const currency = devisesRes.find(d => d.id === piece.currency) || 
                         { id: piece.currency, code: '??', symbol: '' };
        const partner = partnersRes.find(p => p.id === piece.partner) || 
                        { id: piece.partner, name: 'Inconnu' };
        
        let totalDebit = 0;
        let totalCredit = 0;
        if (Array.isArray(piece.lines)) {
          piece.lines.forEach(line => {
            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
          });
        }
        const isPaid = Math.abs(totalDebit - totalCredit) < 0.01;
        
        return {
          ...piece,
          journal,
          currency,
          partner,
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_paid: isPaid
        };
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (piece) => {
    if (!window.confirm(`Supprimer "${piece.name}" ?`)) return;
    try {
      await piecesService.delete(piece.id);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleValidate = async (piece) => {
    try {
      await piecesService.validate(piece.id);
      loadData();
    } catch (err) {
      alert('Erreur validation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCancel = async (piece) => {
    try {
      await piecesService.cancel(piece.id);
      loadData();
    } catch (err) {
      alert('Erreur annulation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReverse = async (piece) => {
    try {
      await piecesService.reverse(piece.id);
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
        await actionFn(id);
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
        (p.journal?.code || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.journal?.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.partner?.name || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredPieces(filtered);
    }
  }, [pieces]);

  const columns = [
    { id: 'date_facturation', label: 'Date facturation', width: '120px', render: p => p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—' },
    { id: 'numero', label: 'Numéro', width: '120px', render: p => <div className="font-semibold text-sm">{p.name || '—'}</div> },
    { id: 'compte_general', label: 'Compte général', width: '150px', render: p => {
      const firstLine = p.lines?.[0];
      const account = firstLine ? (typeof firstLine.account === 'object' ? firstLine.account : { code: '??', name: 'Inconnu' }) : { code: '??', name: 'Inconnu' };
      return (
        <div>
          <div className="font-medium text-sm">{account.code || '—'}</div>
          <div className="text-xs text-gray-500 truncate">{account.name || ''}</div>
        </div>
      );
    }},
    { id: 'partenaire', label: 'Partenaire', width: '160px', render: p => p.partner ? (
      <div>
        <div className="font-medium text-sm">{p.partner.name || '—'}</div>
        <div className="text-xs text-gray-500">{p.partner.email || p.partner.phone || ''}</div>
      </div>
    ) : '—' },
    { id: 'reference', label: 'Référence', width: '130px', render: p => <span className="text-sm">{p.ref || '—'}</span> },
    { id: 'journal', label: 'Journal', width: '140px', render: p => (
      <div>
        <div className="font-medium text-sm">{p.journal?.code || '—'}</div>
        <div className="text-xs text-gray-500">{p.journal?.name || ''}</div>
      </div>
    )},
    { id: 'montant_ht', label: 'Montant HT', width: '110px', render: p => (
      <div className="text-right font-medium text-sm">
        {(p.total_debit || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </div>
    )},
    { id: 'taxes', label: 'Taxes', width: '100px', render: p => {
      const ht = p.total_debit || 0;
      const ttc = p.total_credit || 0;
      const taxes = Math.abs(ttc - ht);
      return (
        <div className="text-right font-medium text-blue-600 text-sm">
          {taxes.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
        </div>
      );
    }},
    { id: 'montant_ttc', label: 'Montant TTC', width: '110px', render: p => (
      <div className="text-right font-medium text-red-600 text-sm">
        {(p.total_credit || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
      </div>
    )},
    { id: 'etat_piece', label: 'Etat pièce', width: '120px', render: p => {
      const config = {
        posted: { text: 'Comptabilisé', cls: 'bg-green-100 text-green-800' },
        draft: { text: 'Brouillon', cls: 'bg-amber-100 text-amber-800' },
        cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-800' }
      }[p.state] || { text: 'Inconnu', cls: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
          {config.text}
        </span>
      );
    }},
    { id: 'etat_paiement', label: 'Etat paiement', width: '120px', render: p => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        p.is_paid ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {p.is_paid ? 'Payé' : 'Non payé'}
      </span>
    )},
    { id: 'actions', label: 'Actions', width: '170px', render: p => (
      <div className="flex gap-1">
        <button onClick={e => { e.stopPropagation(); navigate(`/comptabilite/pieces/${p.id}`); }} className="p-1.5 bg-gray-100 rounded"><FiEye size={14} /></button>
        {p.state === 'draft' && (
          <>
            <button onClick={e => { e.stopPropagation(); navigate(`/comptabilite/pieces/${p.id}/edit`); }} className="p-1.5 bg-violet-100 rounded"><FiEdit2 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleValidate(p); }} className="p-1.5 bg-green-100 rounded"><FiCheckCircle size={14} /></button>
          </>
        )}
        {p.state === 'posted' && (
          <>
            <button onClick={e => { e.stopPropagation(); handleCancel(p); }} className="p-1.5 bg-amber-100 rounded"><FiXCircle size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleReverse(p); }} className="p-1.5 bg-purple-100 rounded"><FiRotateCcw size={14} /></button>
          </>
        )}
        <button onClick={e => { e.stopPropagation(); handleDelete(p); }} className="p-1.5 bg-red-100 rounded"><FiTrash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <ComptabiliteTableContainer
      data={filteredPieces}
      loading={loading}
      error={error}
      title="Pièces Comptables"
      moduleType="pieces"
      columns={columns}
      defaultVisibleColumns={[
        'date_facturation',
        'numero',
        'compte_general',
        'partenaire',
        'reference',
        'journal',
        'montant_ht',
        'taxes',
        'montant_ttc',
        'etat_piece',
        'etat_paiement',
        'actions'
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
      onRowClick={(p) => {
        setActiveRowId(p.id);
        navigate(`/comptabilite/pieces/${p.id}/edit`);
      }}
      onView={(p) => navigate(`/comptabilite/pieces/${p.id}`)}
      itemsPerPage={10}
      emptyState={pieces.length === 0 ? {
        title: 'Aucune pièce comptable',
        description: 'Créez votre première pièce.',
        action: { 
          label: 'Créer une pièce', 
          onClick: () => navigate('/comptabilite/pieces/create') 
        }
      } : null}
    />
  );
}
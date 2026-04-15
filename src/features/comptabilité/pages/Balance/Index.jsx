import React, { useState, useEffect } from 'react';
import { 
  FiDownload, FiPrinter, FiRefreshCw, FiCalendar,
  FiFilter, FiX, FiChevronDown, FiChevronUp,
  FiFileText, FiBarChart2, FiDollarSign
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

// ==========================================
// PAGE BALANCE GÉNÉRALE (TOUT-EN-UN)
// ==========================================
export default function BalanceGenerale() {
  const { activeEntity } = useEntity();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFiltres, setShowFiltres] = useState(false);
  
  const [frameworks, setFrameworks] = useState([]);
  const [balance, setBalance] = useState([]);
  const [totaux, setTotaux] = useState({
    total_debit: 0,
    total_credit: 0,
    total_solde: 0
  });

  // État des filtres
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [filtres, setFiltres] = useState({
    date_debut: formatDate(firstDay, 'YYYY-MM-DD'),
    date_fin: formatDate(today, 'YYYY-MM-DD'),
    plan_comptable_id: '',
    afficher_soldes_nuls: false
  });

  // États pour le détail des lignes
  const [ligneExpandue, setLigneExpandue] = useState(null);

  // Charger les plans comptables au montage
  useEffect(() => {
    loadFrameworks();
  }, []);

  // Charger la balance quand les filtres changent
  useEffect(() => {
    if (activeEntity) {
      loadBalance();
    }
  }, [filtres, activeEntity]);

  const loadFrameworks = async () => {
    try {
      const response = await apiClient.get('/compta/frameworks/');
      const data = response.data || response;
      setFrameworks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement frameworks:', err);
    }
  };

  const loadBalance = async () => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité');
      return;
    }

    setLoading(true);
    setError(null);
    setLigneExpandue(null);

    try {
      const params = new URLSearchParams({
        date_debut: filtres.date_debut,
        date_fin: filtres.date_fin,
        plan_comptable: filtres.plan_comptable_id,
        sans_soldes_nuls: !filtres.afficher_soldes_nuls
      });

      // ✅ URL CORRIGÉE : utilisation du bon endpoint
      const response = await apiClient.get(`/compta/move-lines/balance/?${params}`);
      const data = response.data || response;
      
      setBalance(data.lignes || []);
      setTotaux(data.totaux || {
        total_debit: 0,
        total_credit: 0,
        total_solde: 0
      });
    } catch (err) {
      console.error('❌ Erreur chargement balance:', err);
      setError('Erreur lors du chargement de la balance');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    console.log(`Export ${format}...`);
    // À implémenter
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleLigne = (index) => {
    setLigneExpandue(ligneExpandue === index ? null : index);
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Balance générale</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiBarChart2 className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour afficher la balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── EN-TÊTE ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiBarChart2 className="text-purple-600" />
              Balance générale
            </h1>
            <div className="flex items-center gap-2">
              {/* Période affichée */}
              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1">
                <FiCalendar size={12} />
                <span>Du {formatDate(filtres.date_debut, 'DD/MM/YYYY')}</span>
                <span>au {formatDate(filtres.date_fin, 'DD/MM/YYYY')}</span>
              </div>

              {/* Bouton Filtres */}
              <button
                onClick={() => setShowFiltres(true)}
                className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1"
              >
                <FiFilter size={12} />
                <span>Filtres</span>
              </button>

              {/* Bouton Actualiser */}
              <button
                onClick={loadBalance}
                disabled={loading}
                className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1 disabled:opacity-50"
              >
                <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Actualiser</span>
              </button>

              {/* Bouton Export */}
              <button
                onClick={() => handleExport('excel')}
                className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1"
              >
                <FiDownload size={12} />
                <span>Export</span>
              </button>

              {/* Bouton Imprimer */}
              <button
                onClick={handlePrint}
                className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1"
              >
                <FiPrinter size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── MESSAGE D'ERREUR ── */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b border-red-200 flex items-center gap-1">
            <FiBarChart2 size={12} />
            <span>{error}</span>
          </div>
        )}

        {/* ── INDICATEUR DE CHARGEMENT ── */}
        {loading && (
          <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center gap-1">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
            <span>Chargement de la balance...</span>
          </div>
        )}

        {/* ── TABLEAU DE LA BALANCE ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Compte</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700">Libellé</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-700">Débit</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-700">Crédit</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-700">Solde</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Détail</th>
              </tr>
            </thead>
            <tbody>
              {balance.length > 0 ? (
                balance.map((ligne, index) => (
                  <React.Fragment key={index}>
                    {/* Ligne principale */}
                    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition-colors`}>
                      <td className="px-2 py-1 text-xs text-gray-600">
                        {ligne.compte}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-800">
                        {ligne.libelle}
                      </td>
                      <td className="px-2 py-1 text-xs text-right font-mono">
                        {formatNumber(ligne.debit)}
                      </td>
                      <td className="px-2 py-1 text-xs text-right font-mono">
                        {formatNumber(ligne.credit)}
                      </td>
                      <td className={`px-2 py-1 text-xs text-right font-mono font-medium ${
                        ligne.solde > 0 ? 'text-green-600' : ligne.solde < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {formatNumber(ligne.solde)}
                      </td>
                      <td className="px-2 py-1 text-xs text-center">
                        <button
                          onClick={() => toggleLigne(index)}
                          className="text-gray-500 hover:text-purple-600 transition-colors"
                          title="Voir le détail"
                        >
                          {ligneExpandue === index ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Ligne de détail (si expandue) */}
                    {ligneExpandue === index && ligne.details && ligne.details.length > 0 && (
                      <tr className="bg-gray-100">
                        <td colSpan="6" className="px-4 py-2">
                          <div className="text-xs">
                            <p className="font-medium text-gray-700 mb-1">Écritures récentes :</p>
                            {ligne.details.map((detail, i) => (
                              <div key={i} className="flex justify-between text-gray-600 py-0.5 border-b border-gray-200 last:border-0">
                                <span>{detail.date} - {detail.libelle}</span>
                                <span className="font-mono">{formatNumber(detail.montant)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                    {loading ? 'Chargement...' : 'Aucune donnée pour la période sélectionnée'}
                  </td>
                </tr>
              )}
            </tbody>
            
            {/* Pied du tableau avec totaux */}
            {balance.length > 0 && (
              <tfoot className="bg-gray-100 border-t border-gray-300 font-medium">
                <tr>
                  <td colSpan="2" className="px-2 py-2 text-xs text-gray-800">
                    TOTAUX
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono text-gray-800">
                    {formatNumber(totaux.total_debit)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono text-gray-800">
                    {formatNumber(totaux.total_credit)}
                  </td>
                  <td className={`px-2 py-2 text-right text-xs font-mono font-bold ${
                    totaux.total_solde > 0 ? 'text-green-600' : 
                    totaux.total_solde < 0 ? 'text-red-600' : 'text-gray-800'
                  }`}>
                    {formatNumber(totaux.total_solde)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── PIED DE PAGE ── */}
        <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
          <div className="flex items-center gap-1">
            <FiFileText size={12} />
            <span>{balance.length} comptes affichés</span>
          </div>
          <div className="flex items-center gap-1">
            <FiDollarSign size={12} />
            <span>Solde général: {formatNumber(totaux.total_solde)}</span>
          </div>
        </div>
      </div>

      {/* ── MODAL DES FILTRES ── */}
      {showFiltres && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiFilter size={16} className="text-purple-600" />
                Filtres de la balance
              </h3>
              <button onClick={() => setShowFiltres(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Période */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-700 font-medium mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={filtres.date_debut}
                    onChange={(e) => setFiltres({...filtres, date_debut: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 font-medium mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={filtres.date_fin}
                    onChange={(e) => setFiltres({...filtres, date_fin: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px' }}
                  />
                </div>
              </div>

              {/* Plan comptable */}
              <div>
                <label className="block text-xs text-gray-700 font-medium mb-1">
                  Plan comptable
                </label>
                <select
                  value={filtres.plan_comptable_id}
                  onChange={(e) => setFiltres({...filtres, plan_comptable_id: e.target.value})}
                  className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                  style={{ height: '26px' }}
                >
                  <option value="">Tous les plans</option>
                  {frameworks.map(fw => (
                    <option key={fw.id} value={fw.id}>{fw.code} - {fw.name}</option>
                  ))}
                </select>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="soldes_nuls"
                  checked={filtres.afficher_soldes_nuls}
                  onChange={(e) => setFiltres({...filtres, afficher_soldes_nuls: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="soldes_nuls" className="text-sm text-gray-700">
                  Afficher les comptes à solde nul
                </label>
              </div>
            </div>

            <div className="border-t border-gray-300 px-4 py-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                  const today = new Date();
                  setFiltres({
                    date_debut: formatDate(firstDay, 'YYYY-MM-DD'),
                    date_fin: formatDate(today, 'YYYY-MM-DD'),
                    plan_comptable_id: '',
                    afficher_soldes_nuls: false
                  });
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setShowFiltres(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowFiltres(false);
                  loadBalance();
                }}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs hover:bg-purple-700 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// UTILITAIRES DE FORMATAGE
// ==========================================
function formatNumber(value) {
  if (value === null || value === undefined) return '0,00';
  return new Intl.NumberFormat('fr-FR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
}

function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'DD MMM YYYY') {
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    return `${day} ${months[month-1]} ${year}`;
  }
  return `${year}-${month}-${day}`;
}
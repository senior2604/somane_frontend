// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\TauxFiscaux\Index.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPercent,
  FiTrendingUp,
  FiShoppingCart,
  FiAlertCircle,
  FiLogIn,
  FiUsers,
  FiBriefcase,
  FiDollarSign,
  FiTag,
  FiEye,
  FiEdit,
  FiCopy
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';
import ComptabiliteTableContainer from '../../components/ComptabiliteTableContainer';

export default function TauxFiscauxIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [taxes, setTaxes] = useState([]);
  const [filteredTaxes, setFilteredTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTaxIds, setSelectedTaxIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterAmountType, setFilterAmountType] = useState('');
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasCompaniesAccess: false,
    showLoginPrompt: false
  });

  const [accountsMap, setAccountsMap] = useState({});
  const [companiesMap, setCompaniesMap] = useState({});
  const [paysMap, setPaysMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);

  // Vérifier l'authentification
  useEffect(() => {
    const isAuthenticated = authService.isAuthenticated();
    setAuthStatus(prev => ({
      ...prev,
      isAuthenticated,
      showLoginPrompt: !isAuthenticated
    }));
  }, []);

  // Gérer l'absence d'entité
  useEffect(() => {
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir les taux fiscaux');
      setLoading(false);
    }
  }, [activeEntity]);

  // Charger les référentiels
  useEffect(() => {
    if (!activeEntity) return;

    const loadReferentials = async () => {
      try {
        console.log('📥 Chargement des référentiels...');

        // Charger les comptes
        const accountsRes = await apiClient.get(`/compta/accounts/?company=${activeEntity.id}`).catch(() => ({ data: [] }));
        const accountsData = accountsRes.data?.results || accountsRes.data || [];
        const accountsObj = {};
        accountsData.forEach(a => { accountsObj[a.id] = a; });
        setAccountsMap(accountsObj);
        console.log('✅ Comptes chargés:', Object.keys(accountsObj).length);

        // Charger les entreprises
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = companiesRes.data?.results || companiesRes.data || [];
        const companiesObj = {};
        companiesData.forEach(c => { companiesObj[c.id] = c; });
        setCompaniesMap(companiesObj);
        console.log('✅ Entreprises chargées:', Object.keys(companiesObj).length);

        // Charger les pays
        const paysRes = await apiClient.get('/pays/').catch(() => ({ data: [] }));
        const paysData = paysRes.data?.results || paysRes.data || [];
        const paysObj = {};
        paysData.forEach(p => { paysObj[p.id] = p; });
        setPaysMap(paysObj);
        console.log('✅ Pays chargés:', Object.keys(paysObj).length);

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

  // ✅ FONCTION LOADDATA CORRIGÉE - sans taxesService
  const loadData = useCallback(async () => {
    if (!activeEntity || !referentialsLoaded) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📥 Chargement des taux fiscaux...');
      
      // Utilisation directe de apiClient
      const response = await apiClient.get(`/compta/taxes/?company=${activeEntity.id}`);
      
      // Extraction correcte des données selon la structure
      let taxesData = [];
      if (response) {
        if (Array.isArray(response)) {
          taxesData = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            taxesData = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            taxesData = response.data.results;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            taxesData = response.data.data;
          }
        }
      }
      
      console.log('✅ Taxes chargées:', taxesData.length);

      // Enrichir les données avec les détails des référentiels
      const enrichedTaxes = taxesData.map(tax => {
        // Gérer company
        let companyDetail = null;
        if (tax.company) {
          if (typeof tax.company === 'object') {
            companyDetail = tax.company;
          } else {
            companyDetail = companiesMap[tax.company] || null;
          }
        }

        // Gérer country
        let countryDetail = null;
        if (tax.country) {
          if (typeof tax.country === 'object') {
            countryDetail = tax.country;
          } else {
            countryDetail = paysMap[tax.country] || null;
          }
        }

        // Gérer account
        let accountDetail = null;
        if (tax.account) {
          if (typeof tax.account === 'object') {
            accountDetail = tax.account;
          } else {
            accountDetail = accountsMap[tax.account] || null;
          }
        }

        // Gérer refund_account
        let refundAccountDetail = null;
        if (tax.refund_account) {
          if (typeof tax.refund_account === 'object') {
            refundAccountDetail = tax.refund_account;
          } else {
            refundAccountDetail = accountsMap[tax.refund_account] || null;
          }
        }

        return {
          ...tax,
          company_detail: companyDetail,
          country_detail: countryDetail,
          account_detail: accountDetail,
          refund_account_detail: refundAccountDetail,
        };
      });

      console.log('✅ Taxes enrichies:', enrichedTaxes.length);
      setTaxes(enrichedTaxes);
      setFilteredTaxes(enrichedTaxes);
      setActiveRowId(null);
      
    } catch (err) {
      console.error('❌ Erreur chargement taxes:', err);
      setError('Impossible de charger les taux fiscaux.');
      setTaxes([]);
      setFilteredTaxes([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, accountsMap, companiesMap, paysMap]);

  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // Écouter les événements de rafraîchissement
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Événement de rafraîchissement reçu');
      loadData();
    };
    window.addEventListener('taxes:refresh', handleRefresh);
    return () => window.removeEventListener('taxes:refresh', handleRefresh);
  }, [loadData]);

  // Handlers
  const handleSearch = useCallback((term) => {
    if (!term.trim()) {
      setFilteredTaxes(taxes);
    } else {
      const filtered = taxes.filter(tax => {
        const searchLower = term.toLowerCase();
        return (
          (tax.name || '').toLowerCase().includes(searchLower) ||
          (tax.amount?.toString() || '').includes(term) ||
          (tax.company_detail?.nom || tax.company_detail?.raison_sociale || tax.company_detail?.name || '').toLowerCase().includes(searchLower) ||
          (tax.country_detail?.nom_fr || tax.country_detail?.nom || '').toLowerCase().includes(searchLower)
        );
      });
      setFilteredTaxes(filtered);
    }
  }, [taxes]);

  const handleFilterByType = useCallback((type) => {
    setFilterType(type);
    if (!type && !filterAmountType) {
      setFilteredTaxes(taxes);
    } else {
      let filtered = [...taxes];
      if (type) {
        filtered = filtered.filter(tax => tax.type_tax_use === type);
      }
      if (filterAmountType) {
        filtered = filtered.filter(tax => tax.amount_type === filterAmountType);
      }
      setFilteredTaxes(filtered);
    }
  }, [taxes, filterAmountType]);

  const handleFilterByAmountType = useCallback((amountType) => {
    setFilterAmountType(amountType);
    if (!filterType && !amountType) {
      setFilteredTaxes(taxes);
    } else {
      let filtered = [...taxes];
      if (filterType) {
        filtered = filtered.filter(tax => tax.type_tax_use === filterType);
      }
      if (amountType) {
        filtered = filtered.filter(tax => tax.amount_type === amountType);
      }
      setFilteredTaxes(filtered);
    }
  }, [taxes, filterType]);

  const handleBulkDelete = async () => {
    if (selectedTaxIds.length === 0) {
      alert('Aucun taux sélectionné');
      return;
    }

    if (!window.confirm(`Supprimer ${selectedTaxIds.length} taux fiscal/aux ?`)) return;

    try {
      for (const id of selectedTaxIds) {
        await apiClient.delete(`/compta/taxes/${id}/?company=${activeEntity.id}`);
      }
      setSelectedTaxIds([]);
      loadData();
    } catch (err) {
      alert('Erreur suppression groupée: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleLogin = () => {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  };

  // Configuration des colonnes
  const columns = useMemo(() => [
    {
      id: 'id',
      label: 'ID',
      width: '80px',
      render: (tax) => (
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
          #{tax.id}
        </span>
      )
    },
    {
      id: 'nom',
      label: 'Nom',
      width: '200px',
      render: (tax) => (
        <div className="flex items-center gap-2">
          <FiTag className="text-gray-400" size={14} />
          <div>
            <div className="text-xs font-semibold text-gray-900">{tax.name}</div>
            <div className="text-xs text-gray-500">
              {tax.amount_type === 'percent' ? 'Pourcentage' : 'Montant fixe'}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'montant',
      label: 'Montant',
      width: '120px',
      align: 'right',
      render: (tax) => (
        tax.amount_type === 'percent' ? (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200 text-xs font-medium font-mono">
            {tax.amount}%
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-medium">
            {tax.amount.toLocaleString('fr-FR')} FCFA
          </span>
        )
      )
    },
    {
      id: 'type',
      label: 'Utilisation',
      width: '120px',
      render: (tax) => {
        const config = {
          'sale': { bg: 'bg-green-100', text: 'text-green-800', label: 'Vente', icon: FiTrendingUp },
          'purchase': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Achat', icon: FiShoppingCart }
        }[tax.type_tax_use] || {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Divers',
          icon: FiAlertCircle
        };

        const Icon = config.icon;

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <Icon className="mr-1" size={10} />
            {config.label}
          </span>
        );
      }
    },
    {
      id: 'entreprise',
      label: 'Entreprise',
      width: '160px',
      render: (tax) => (
        <div className="flex items-center gap-1.5">
          <FiBriefcase className="text-gray-400" size={12} />
          <span className="text-xs text-gray-900 truncate">
            {tax.company_detail?.nom ||
             tax.company_detail?.raison_sociale ||
             tax.company_detail?.name ||
             '-'}
          </span>
        </div>
      )
    },
    {
      id: 'pays',
      label: 'Pays',
      width: '120px',
      render: (tax) => (
        <div className="flex items-center gap-1.5">
          <span className="text-base">{tax.country_detail?.emoji || '🌍'}</span>
          <span className="text-xs text-gray-600 truncate">
            {tax.country_detail?.nom_fr || tax.country_detail?.nom || '-'}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      width: '100px',
      align: 'center',
      render: (tax) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/comptabilite/taux-fiscaux/${tax.id}/edit`);
            }}
            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
            title="Modifier"
          >
            <FiEdit size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/comptabilite/taux-fiscaux/${tax.id}`);
            }}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Voir détails"
          >
            <FiEye size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Dupliquer
            }}
            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
            title="Dupliquer"
          >
            <FiCopy size={12} />
          </button>
        </div>
      )
    }
  ], [navigate]);

  // Configuration des filtres
  const filterConfigs = useMemo(() => [
    {
      id: 'type_tax_use',
      label: "Type d'utilisation",
      type: 'select',
      options: [
        { value: 'sale', label: 'Vente' },
        { value: 'purchase', label: 'Achat' }
      ]
    },
    {
      id: 'amount_type',
      label: 'Type de montant',
      type: 'select',
      options: [
        { value: 'percent', label: 'Pourcentage' },
        { value: 'fixed', label: 'Montant fixe' }
      ]
    }
  ], []);

  // Statistiques
  const stats = useMemo(() => ({
    total: taxes.length,
    saleTaxes: taxes.filter(t => t.type_tax_use === 'sale').length,
    purchaseTaxes: taxes.filter(t => t.type_tax_use === 'purchase').length,
    percentTaxes: taxes.filter(t => t.amount_type === 'percent').length,
    fixedTaxes: taxes.filter(t => t.amount_type === 'fixed').length
  }), [taxes]);

  // Header personnalisé
  const CustomHeader = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        <StatCard label="Total" value={stats.total} color="violet" icon={FiPercent} />
        <StatCard label="Vente" value={stats.saleTaxes} color="green" icon={FiTrendingUp} />
        <StatCard label="Achat" value={stats.purchaseTaxes} color="amber" icon={FiShoppingCart} />
        <StatCard label="Entreprises" value={Object.keys(companiesMap).length} color="blue" icon={FiUsers} sublabel={authStatus.hasCompaniesAccess ? "Accès complet" : "Limité"} />
        <StatCard label="% vs Fixe" value={`${stats.percentTaxes}/${stats.fixedTaxes}`} color="purple" icon={FiDollarSign} />
      </div>

      {authStatus.showLoginPrompt && <AuthBanner onLogin={handleLogin} />}

      <div className="flex border-b border-gray-200">
        <TabButton active={!filterType && !filterAmountType} onClick={() => {
          setFilterType('');
          setFilterAmountType('');
          setFilteredTaxes(taxes);
        }} label="Tous les taux" color="violet" />
        <TabButton active={filterType === 'sale'} onClick={() => handleFilterByType('sale')} label="Vente" color="green" />
        <TabButton active={filterType === 'purchase'} onClick={() => handleFilterByType('purchase')} label="Achat" color="amber" />
        <TabButton active={filterAmountType === 'percent'} onClick={() => handleFilterByAmountType('percent')} label="Pourcentage" color="purple" />
        <TabButton active={filterAmountType === 'fixed'} onClick={() => handleFilterByAmountType('fixed')} label="Montant fixe" color="blue" />
      </div>
    </div>
  );

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Taux Fiscaux</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">
                Aucune entité sélectionnée
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour voir les taux fiscaux.
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <ComptabiliteTableContainer
          data={filteredTaxes}
          loading={loading}
          error={error}
          title="Taux Fiscaux"
          moduleType="taxes"
          columns={columns}
          defaultVisibleColumns={['id', 'nom', 'montant', 'type', 'entreprise', 'pays', 'actions']}
          filterConfigs={filterConfigs}
          onFilterChange={(filters) => {
            let filtered = [...taxes];
            filters.forEach(filter => {
              if (filter.id === 'type_tax_use') {
                filtered = filtered.filter(t => t.type_tax_use === filter.value);
              }
              if (filter.id === 'amount_type') {
                filtered = filtered.filter(t => t.amount_type === filter.value);
              }
            });
            setFilteredTaxes(filtered);
          }}
          onSelectionChange={setSelectedTaxIds}
          onRefresh={loadData}
          onExport={(format) => {
            console.log(`Export ${format} - ${filteredTaxes.length} taux`);
            alert(`Export ${format} non encore implémenté`);
          }}
          onCreate={() => navigate('/comptabilite/taux-fiscaux/create')}
          onSearch={handleSearch}
          onDelete={handleBulkDelete}
          onModify={() => {
            if (selectedTaxIds.length === 1) {
              navigate(`/comptabilite/taux-fiscaux/${selectedTaxIds[0]}/edit`);
            } else if (selectedTaxIds.length > 1) {
              alert('Veuillez sélectionner un seul taux à modifier');
            }
          }}
          activeRowId={activeRowId}
          onRowClick={(tax) => setActiveRowId(tax.id)}
          onRowDoubleClick={(tax) => navigate(`/comptabilite/taux-fiscaux/${tax.id}`)}
          itemsPerPage={10}
          emptyState={taxes.length === 0 ? {
            title: 'Aucun taux fiscal',
            description: authStatus.showLoginPrompt
              ? 'Connectez-vous pour créer votre premier taux fiscal.'
              : 'Créez votre premier taux fiscal.',
            action: authStatus.showLoginPrompt ? {
              label: 'Se connecter',
              onClick: handleLogin
            } : {
              label: 'Créer un taux',
              onClick: () => navigate('/comptabilite/taux-fiscaux/create')
            }
          } : null}
          headerExtra={<CustomHeader />}
        />
      </div>
    </div>
  );
}

// ==========================================
// COMPOSANTS STATIQUES
// ==========================================

function StatCard({ label, value, color, icon: Icon, sublabel }) {
  const colorClasses = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', iconBg: 'bg-yellow-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'bg-cyan-100' }
  };
  const colors = colorClasses[color] || colorClasses.violet;

  return (
    <div className="bg-white rounded-lg p-1.5 border border-gray-200 shadow-sm h-14 flex items-center">
      <div className="flex items-center gap-2 w-full">
        <div className={`p-1.5 ${colors.iconBg} rounded`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-600 truncate">{label}</span>
            <span className={`text-sm font-bold ${colors.text} ml-1`}>{value}</span>
          </div>
          {sublabel && <div className="text-[9px] text-gray-500 truncate mt-0.5">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, color }) {
  const colorClasses = {
    violet: 'border-violet-600 text-violet-600',
    purple: 'border-purple-600 text-purple-600',
    green: 'border-green-600 text-green-600',
    amber: 'border-amber-600 text-amber-600',
    blue: 'border-blue-600 text-blue-600',
    yellow: 'border-yellow-600 text-yellow-600',
    red: 'border-red-600 text-red-600'
  };
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-medium border-b-2 ${
        active ? colorClasses[color] : 'border-transparent text-gray-500 hover:text-gray-700'
      } transition-colors`}
    >
      {label}
    </button>
  );
}

function AuthBanner({ onLogin }) {
  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 border-l-3 border-purple-500 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded">
            <FiLogIn className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-purple-800 text-xs font-medium">Authentification requise</p>
            <p className="text-purple-700 text-xs mt-0.5">Connectez-vous pour accéder à toutes les fonctionnalités</p>
          </div>
        </div>
        <button
          onClick={onLogin}
          className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded hover:from-purple-700 hover:to-purple-600 transition-colors text-xs font-medium flex items-center gap-1"
        >
          <FiLogIn size={12} />
          Se connecter
        </button>
      </div>
    </div>
  );
}
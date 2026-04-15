import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiBriefcase,
  FiShield,
  FiToggleRight,
  FiPercent,
  FiGlobe,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';
import ComptabiliteTableContainer from "../../components/ComptabiliteTableContainer";

export default function PositionsFiscalesIndex() {
  const navigate = useNavigate();
  
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositionIds, setSelectedPositionIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  
  // États pour les référentiels
  const [companiesMap, setCompaniesMap] = useState({});
  const [paysMap, setPaysMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);

  // Charger tous les référentiels
  useEffect(() => {
    const loadReferentials = async () => {
      try {
        setLoading(true);
        
        // Charger les pays
        console.log('📥 Chargement des pays...');
        const paysRes = await apiClient.get('/pays/').catch(() => ({ data: [] }));
        const paysData = paysRes.data || paysRes || [];
        const paysObj = {};
        paysData.forEach(p => { 
          paysObj[p.id] = {
            ...p,
            displayName: p.nom_fr || p.nom || p.name || 'Pays'
          }; 
        });
        setPaysMap(paysObj);
        console.log('✅ Pays chargés:', Object.keys(paysObj).length);
        
        // Charger les entreprises si authentifié
        if (authService.isAuthenticated()) {
          console.log('📥 Chargement des entreprises...');
          const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
          const companiesData = companiesRes.data || companiesRes || [];
          const companiesObj = {};
          companiesData.forEach(c => { 
            companiesObj[c.id] = {
              ...c,
              displayName: c.raison_sociale || c.nom || c.name || 'Entreprise'
            }; 
          });
          setCompaniesMap(companiesObj);
          console.log('✅ Entreprises chargées:', Object.keys(companiesObj).length);
        }
        
        setReferentialsLoaded(true);
        
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
        setError('Erreur lors du chargement des référentiels');
      } finally {
        setLoading(false);
      }
    };
    
    loadReferentials();
  }, []);

  // Charger les positions
  const loadData = useCallback(async () => {
    if (!referentialsLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des positions fiscales...');
      const positionsRes = await apiClient.get('/compta/fiscal-positions/').catch(() => ({ data: [] }));
      const positionsData = positionsRes.data || positionsRes || [];
      console.log('✅ Positions chargées:', positionsData.length);
      
      // Enrichir les positions avec les détails des référentiels
      const enrichedPositions = positionsData.map(position => ({
        ...position,
        // Détails du pays
        country_detail: position.country ? paysMap[position.country] || paysMap[position.country?.id] : null,
        // Détails de l'entreprise
        company_detail: position.company ? companiesMap[position.company] || companiesMap[position.company?.id] : null,
      }));

      setPositions(enrichedPositions);
      setFilteredPositions(enrichedPositions);
      setActiveRowId(null);
      
    } catch (err) {
      console.error('❌ Erreur chargement positions:', err);
      setError('Impossible de charger les positions fiscales.');
    } finally {
      setLoading(false);
    }
  }, [referentialsLoaded, paysMap, companiesMap]);

  // Effet pour charger les positions quand les référentiels sont prêts
  useEffect(() => {
    if (referentialsLoaded) {
      loadData();
    }
  }, [referentialsLoaded, loadData]);

  // Handlers CRUD
  const handleDelete = async (position) => {
    if (!window.confirm(`Supprimer "${position.name}" ?`)) return;
    try {
      await apiClient.delete(`/compta/fiscal-positions/${position.id}/`);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (position) => {
    try {
      await apiClient.patch(`/compta/fiscal-positions/${position.id}/`, {
        active: !position.active
      });
      loadData();
    } catch (err) {
      alert('Erreur modification: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleAutoApply = async (position) => {
    try {
      await apiClient.patch(`/compta/fiscal-positions/${position.id}/`, {
        auto_apply: !position.auto_apply
      });
      loadData();
    } catch (err) {
      alert('Erreur modification: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDuplicate = async (position) => {
    try {
      const { id, ...data } = position;
      data.name = `${data.name} (Copie)`;
      await apiClient.post('/compta/fiscal-positions/', data);
      loadData();
    } catch (err) {
      alert('Erreur duplication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAction = async (actionFn) => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    if (!window.confirm(`Appliquer l'action sur ${selectedPositionIds.length} position(s) ?`)) return;
    try {
      for (const id of selectedPositionIds) {
        await actionFn(id);
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur action groupée: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredPositions(positions);
    } else {
      const filtered = positions.filter(p =>
        (p.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.country_detail?.displayName || '').toLowerCase().includes(term.toLowerCase()) ||
        (p.company_detail?.displayName || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredPositions(filtered);
    }
  }, [positions]);

  // Composants d'affichage
  const StatusDisplay = ({ active }) => {
    if (active === false) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <FiXCircle className="mr-1" size={12} />
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FiCheckCircle className="mr-1" size={12} />
        Active
      </span>
    );
  };

  const AutoApplyDisplay = ({ autoApply }) => {
    if (autoApply) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <FiToggleRight className="mr-1" size={12} />
          Auto
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <FiToggleRight className="mr-1" size={12} />
        Manuel
      </span>
    );
  };

  const VatDisplay = ({ vatRequired }) => {
    if (vatRequired) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <FiPercent className="mr-1" size={12} />
          TVA requise
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <FiPercent className="mr-1" size={12} />
          Sans TVA
        </span>
    );
  };

  const CountryDisplay = ({ country }) => {
    if (!country) return <span className="text-gray-400">🌍 Global</span>;
    
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-base">{country.emoji || '🌍'}</span>
        <span className="font-medium">{country.displayName}</span>
      </div>
    );
  };

  const CompanyDisplay = ({ company }) => {
    if (!company) return <span className="text-gray-400">Toutes entreprises</span>;
    
    return (
      <div className="text-sm">
        <div className="font-medium">{company.displayName}</div>
      </div>
    );
  };

  const columns = useMemo(() => [
    { 
      id: 'name', 
      label: 'Position', 
      width: '200px', 
      render: p => (
        <div>
          <div className="font-semibold text-sm flex items-center gap-1">
            <FiShield className="text-violet-500" size={14} />
            {p.name || '—'}
          </div>
          {p.description && (
            <div className="text-xs text-gray-500 truncate max-w-[180px]" title={p.description}>
              {p.description}
            </div>
          )}
        </div>
      ) 
    },
    { 
      id: 'country', 
      label: 'Pays', 
      width: '150px', 
      render: p => <CountryDisplay country={p.country_detail} />
    },
    { 
      id: 'company', 
      label: 'Entreprise', 
      width: '180px', 
      render: p => <CompanyDisplay company={p.company_detail} />
    },
    { 
      id: 'config', 
      label: 'Configuration', 
      width: '150px', 
      render: p => (
        <div className="flex flex-wrap gap-1">
          <AutoApplyDisplay autoApply={p.auto_apply} />
          <VatDisplay vatRequired={p.vat_required} />
        </div>
      )
    },
    { 
      id: 'status', 
      label: 'Statut', 
      width: '100px', 
      render: p => <StatusDisplay active={p.active} />
    }
  ], []);

  return (
    <ComptabiliteTableContainer
      data={filteredPositions}
      loading={loading}
      error={error}
      title="Positions Fiscales"
      moduleType="positions"
      columns={columns}
      defaultVisibleColumns={[
        'name',
        'country',
        'company',
        'config',
        'status'
      ]}
      onSelectionChange={setSelectedPositionIds}
      onRefresh={loadData}
      onExport={(format) => alert(`Export en ${format} non implémenté`)}
      onCreate={() => navigate('/comptabilite/positions-fiscales/create')}
      onSearch={handleSearch}
      // Actions spécifiques aux positions
      onToggleActive={() => handleBulkAction((id) => {
        const position = positions.find(p => p.id === id);
        return apiClient.patch(`/compta/fiscal-positions/${id}/`, {
          active: !position?.active
        });
      })}
      onToggleAutoApply={() => handleBulkAction((id) => {
        const position = positions.find(p => p.id === id);
        return apiClient.patch(`/compta/fiscal-positions/${id}/`, {
          auto_apply: !position?.auto_apply
        });
      })}
      onDuplicate={() => handleBulkAction(async (id) => {
        const position = positions.find(p => p.id === id);
        if (!position) return;
        const { id: _, ...data } = position;
        data.name = `${data.name} (Copie)`;
        await apiClient.post('/compta/fiscal-positions/', data);
      })}
      onDelete={() => handleBulkAction((id) => 
        apiClient.delete(`/compta/fiscal-positions/${id}/`)
      )}
      activeRowId={activeRowId}
      onRowClick={(p, event) => {
        // Clic simple : met à jour la ligne active
        setActiveRowId(p.id);
        // La sélection multiple est gérée dans le conteneur avec Ctrl/Shift
      }}
      onRowDoubleClick={(p) => {
        // Double-clic : navigation vers la vue détail
        navigate(`/comptabilite/positions-fiscales/${p.id}`);
      }}
      itemsPerPage={10}
      emptyState={positions.length === 0 ? {
        title: 'Aucune position fiscale',
        description: 'Créez votre première position fiscale (Exonération, Export, TVA normale, etc.)',
        action: { 
          label: 'Créer une position', 
          onClick: () => navigate('/comptabilite/positions-fiscales/create') 
        }
      } : null}
    />
  );
}
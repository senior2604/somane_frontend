import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiSave, FiPlus, FiChevronDown, FiCopy, FiTrash2, FiRotateCcw } from 'react-icons/fi';

export default function EquipesCommercialesCreate() {
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showActions, setShowActions] = useState(false);
  
  const [formData, setFormData] = useState({
    name: 'EPC/26/4500',
    team_lead_id: '',
    region: '',
    sales_target: '',
    commission_rate: '',
    notes: ''
  });

  const [membres, setMembres] = useState([{
    id: 1,
    utilisateur_id: '',
    role: '',
    objectif_individuel: '0',
    commission_individuelle: '0'
  }]);

  const fetchReferenceData = useCallback(async () => {
    try {
      setLoading(true);
      const utilisateursRes = await apiClient.get('/utilisateurs/');
      setUtilisateurs(utilisateursRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const { totalObjectif, totalCommission } = useMemo(() => {
    let objectif = parseFloat(formData.sales_target) || 0;
    let commission = 0;
    
    membres.forEach(membre => {
      const objIndiv = parseFloat(membre.objectif_individuel) || 0;
      const commIndiv = parseFloat(membre.commission_individuelle) || 0;
      objectif += objIndiv;
      commission += commIndiv;
    });

    return { totalObjectif: objectif, totalCommission: commission };
  }, [formData.sales_target, membres]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMembreChange = (index, field, value) => {
    const newMembres = [...membres];
    
    if (field === 'objectif_individuel' || field === 'commission_individuelle') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const formatted = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
      newMembres[index][field] = formatted || '0';
    } else {
      newMembres[index][field] = value;
    }
    
    setMembres(newMembres);
  };

  const addMembre = () => {
    const newId = membres.length > 0 ? Math.max(...membres.map(m => m.id)) + 1 : 1;
    setMembres([...membres, {
      id: newId,
      utilisateur_id: '',
      role: '',
      objectif_individuel: '0',
      commission_individuelle: '0'
    }]);
  };

  const removeMembre = (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce membre ?')) {
      setMembres(membres.filter(membre => membre.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/ventes/equipes-commerciales/', formData);
      navigate('/ventes/equipes-commerciales');
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Erreur lors de la création');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIgnoreChanges = () => {
    if (window.confirm('Voulez-vous vraiment ignorer les modifications ?')) {
      navigate('/ventes/equipes-commerciales');
    }
  };

  const handleDuplicate = () => {
    alert('Dupliquer');
    setShowActions(false);
  };

  const handleDelete = () => {
    if (window.confirm('Voulez-vous vraiment supprimer cette équipe ?')) {
      alert('Supprimer');
      setShowActions(false);
    }
  };

  const handleExtourne = () => {
    alert('Extourné');
    setShowActions(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/ventes/equipes-commerciales')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
          <span>Nouveau</span>
        </button>
        <span className="text-gray-400">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Equipes Commerciales</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 mb-6">
        <div className="p-6 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Etat:</span>
                <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Brouillon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">N° équipe:</span>
                <span className="text-sm font-bold text-gray-900">{formData.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => setShowActions(!showActions)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
                  Actions <FiChevronDown className="text-sm" />
                </button>
                {showActions && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button onClick={handleDuplicate} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><FiCopy className="text-sm" /> Dupliquer</button>
                      <button onClick={handleDelete} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"><FiTrash2 className="text-sm" /> Supprimer</button>
                      <button onClick={handleExtourne} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><FiRotateCcw className="text-sm" /> Extourné</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleIgnoreChanges} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Ignorer</button>
              <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 flex items-center gap-2 disabled:opacity-50">
                <FiSave className="text-sm" /> Enregistrer
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-300">
          <h2 className="text-3xl font-bold text-gray-900 text-center">EPC/26/4500</h2>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 border-b border-gray-300">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nom *</p>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="EPC/26/4500" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Chef d'Équipe *</p>
            <select name="team_lead_id" value={formData.team_lead_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required>
              <option value="">Sélectionner</option>
              {utilisateurs.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Région</p>
            <input type="text" name="region" value={formData.region} onChange={handleChange} placeholder="Nord, Sud..." className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Objectif *</p>
            <input type="text" name="sales_target" value={formData.sales_target} onChange={handleChange} placeholder="0.00" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Taux Comm.</p>
            <input type="text" name="commission_rate" value={formData.commission_rate} onChange={handleChange} placeholder="0.00%" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div className="p-4 border-b border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Membre</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Rôle</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-28">Objectif Indiv.</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-28">Commission Indiv.</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {membres.map((membre, index) => (
                  <tr key={membre.id}>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <select value={membre.utilisateur_id} onChange={(e) => handleMembreChange(index, 'utilisateur_id', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent">
                        <option value="">Sélectionner</option>
                        {utilisateurs.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <select value={membre.role} onChange={(e) => handleMembreChange(index, 'role', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent">
                        <option value="">Rôle</option>
                        <option value="commercial">Commercial</option>
                        <option value="senior">Senior</option>
                        <option value="junior">Junior</option>
                        <option value="apprenti">Apprenti</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-28">
                      <input type="text" value={membre.objectif_individuel} onChange={(e) => handleMembreChange(index, 'objectif_individuel', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-28">
                      <input type="text" value={membre.commission_individuelle} onChange={(e) => handleMembreChange(index, 'commission_individuelle', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-10 text-center">
                      {membres.length > 1 && <button onClick={() => removeMembre(membre.id)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 className="text-xs" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-b border-gray-300">
          <div className="flex justify-between items-center">
            <button type="button" onClick={addMembre} className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 flex items-center gap-2">
              <FiPlus className="text-sm" /> Ajouter un membre
            </button>
            
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Objectif Total</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalObjectif)} XOF</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Commission Totale</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalCommission)} XOF</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 mb-2">Notes</p>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Ajoutez des notes ici..." rows="3" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </div>
  );
}
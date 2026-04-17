import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiSave, FiPlus, FiChevronDown, FiCopy, FiTrash2, FiRotateCcw } from 'react-icons/fi';

export default function LignesBonCommandeCreate() {
  const navigate = useNavigate();
  const [bonsCommande, setBonsCommande] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showActions, setShowActions] = useState(false);
  
  const [formData, setFormData] = useState({
    name: 'LBC/26/1000',
    bon_commande_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    notes: ''
  });

  const [lignes, setLignes] = useState([{
    id: 1,
    bon_commande: '',
    produit: '',
    quantite: '1',
    prix_unitaire: '0',
    notes: ''
  }]);

  const fetchReferenceData = useCallback(async () => {
    try {
      setLoading(true);
      const [bonsRes, produitsRes] = await Promise.all([
        apiClient.get('/achats/bons-commande/'),
        apiClient.get('/produits/')
      ]);
      
      setBonsCommande(bonsRes.data || []);
      setProduits(produitsRes.data || []);
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

  const calculerTotalLigne = useCallback((quantite, prixUnitaire) => {
    const qty = parseFloat(quantite) || 0;
    const prix = parseFloat(prixUnitaire) || 0;
    return qty * prix;
  }, []);

  const { totalGeneral } = useMemo(() => {
    const total = lignes.reduce((sum, ligne) => {
      return sum + calculerTotalLigne(ligne.quantite, ligne.prix_unitaire);
    }, 0);
    
    if (formData.quantity && formData.unit_price) {
      const qty = parseFloat(formData.quantity) || 0;
      const prix = parseFloat(formData.unit_price) || 0;
      setFormData(prev => ({ ...prev, total_price: qty * prix }));
    }
    
    return { totalGeneral: total };
  }, [lignes, formData.quantity, formData.unit_price, calculerTotalLigne]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignes];
    
    if (field === 'quantite' || field === 'prix_unitaire') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const formatted = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
      newLignes[index][field] = formatted || '0';
    } else {
      newLignes[index][field] = value;
    }
    
    setLignes(newLignes);
  };

  const addLigne = () => {
    const newId = lignes.length > 0 ? Math.max(...lignes.map(l => l.id)) + 1 : 1;
    setLignes([...lignes, {
      id: newId,
      bon_commande: '',
      produit: '',
      quantite: '1',
      prix_unitaire: '0',
      notes: ''
    }]);
  };

  const removeLigne = (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette ligne ?')) {
      setLignes(lignes.filter(ligne => ligne.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/achats/lignes-bon-commande/', formData);
      navigate('/achats/lignes-bon-commande');
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
      navigate('/achats/lignes-bon-commande');
    }
  };

  const handleDuplicate = () => {
    alert('Dupliquer');
    setShowActions(false);
  };

  const handleDelete = () => {
    if (window.confirm('Voulez-vous vraiment supprimer cette ligne ?')) {
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
        <button onClick={() => navigate('/achats/lignes-bon-commande')} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
          <span>Nouveau</span>
        </button>
        <span className="text-gray-400">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Lignes Bon Commande</h1>
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
                <span className="text-sm text-gray-600">N° ligne:</span>
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
          <h2 className="text-3xl font-bold text-gray-900 text-center">LBC/26/1000</h2>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 border-b border-gray-300">
          <div>
            <p className="text-xs text-gray-500 mb-1">Numéro *</p>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="LBC/26/1000" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Bon Commande *</p>
            <select name="bon_commande_id" value={formData.bon_commande_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required>
              <option value="">Sélectionner</option>
              {bonsCommande.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Produit *</p>
            <select name="product_id" value={formData.product_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required>
              <option value="">Sélectionner</option>
              {produits.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Quantité *</p>
            <input type="text" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="1" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Prix Unitaire *</p>
            <input type="text" name="unit_price" value={formData.unit_price} onChange={handleChange} placeholder="0.00" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
          </div>
        </div>

        <div className="p-4 border-b border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-40">Bon Commande</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-40">Produit</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-20">Qté</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-28">Prix Unitaire</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Notes</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, index) => (
                  <tr key={ligne.id}>
                    <td className="px-2 py-1.5 border border-gray-300 w-40">
                      <select value={ligne.bon_commande} onChange={(e) => handleLigneChange(index, 'bon_commande', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent">
                        <option value="">Sélectionner</option>
                        {bonsCommande.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-40">
                      <select value={ligne.produit} onChange={(e) => handleLigneChange(index, 'produit', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent">
                        <option value="">Sélectionner</option>
                        {produits.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-20">
                      <input type="text" value={ligne.quantite} onChange={(e) => handleLigneChange(index, 'quantite', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-28">
                      <input type="text" value={ligne.prix_unitaire} onChange={(e) => handleLigneChange(index, 'prix_unitaire', e.target.value)} className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <input type="text" value={ligne.notes} onChange={(e) => handleLigneChange(index, 'notes', e.target.value)} placeholder="Notes" className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-10 text-center">
                      {lignes.length > 1 && <button onClick={() => removeLigne(ligne.id)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 className="text-xs" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-b border-gray-300">
          <div className="flex justify-between items-center">
            <button type="button" onClick={addLigne} className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 flex items-center gap-2">
              <FiPlus className="text-sm" /> Ajouter une ligne
            </button>
            
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Total Général</p>
                <p className="text-base font-bold text-violet-600">{formatCurrency(totalGeneral)} XOF</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 mb-2">Notes Générales</p>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Ajoutez des notes ici..." rows="3" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </div>
  );
}
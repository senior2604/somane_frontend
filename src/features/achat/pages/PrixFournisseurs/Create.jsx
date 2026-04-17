import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiSave, FiPlus, FiChevronDown, FiCopy, FiTrash2, FiRotateCcw } from 'react-icons/fi';

export default function PrixFournisseursCreate() {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showActions, setShowActions] = useState(false);
  
  const [formData, setFormData] = useState({
    name: 'PXF/26/3000',
    fournisseur_id: '',
    product_id: '',
    price: '',
    currency_id: '',
    min_quantity: '',
    date_effective: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [lignes, setLignes] = useState([{
    id: 1,
    fournisseur: '',
    produit: '',
    prix: '0',
    devise: '',
    quantite_min: '',
    date_effective: new Date().toISOString().split('T')[0],
    notes: ''
  }]);

  const fetchReferenceData = useCallback(async () => {
    try {
      setLoading(true);
      const [fournisseursRes, produitsRes, devisesRes] = await Promise.all([
        apiClient.get('/fournisseurs/'),
        apiClient.get('/produits/'),
        apiClient.get('/devises/')
      ]);
      
      setFournisseurs(fournisseursRes.data || []);
      setProduits(produitsRes.data || []);
      setDevises(devisesRes.data || []);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignes];
    
    if (field === 'prix' || field === 'quantite_min') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const formatted = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
      newLignes[index][field] = formatted || '0';
    } else if (field === 'date_effective') {
      newLignes[index][field] = value;
    } else {
      newLignes[index][field] = value;
    }
    
    setLignes(newLignes);
  };

  const addLigne = () => {
    const newId = lignes.length > 0 ? Math.max(...lignes.map(l => l.id)) + 1 : 1;
    setLignes([...lignes, {
      id: newId,
      fournisseur: '',
      produit: '',
      prix: '0',
      devise: '',
      quantite_min: '',
      date_effective: new Date().toISOString().split('T')[0],
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
      await apiClient.post('/achats/prix-fournisseurs/', formData);
      navigate('/achats/prix-fournisseurs');
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
      navigate('/achats/prix-fournisseurs');
    }
  };

  const handleDuplicate = () => {
    alert('Fonctionnalité Dupliquer - À implémenter');
    setShowActions(false);
  };

  const handleDelete = () => {
    if (window.confirm('Voulez-vous vraiment supprimer ce prix fournisseur ?')) {
      alert('Fonctionnalité Supprimer - À implémenter');
      setShowActions(false);
    }
  };

  const handleExtourne = () => {
    alert('Fonctionnalité Extourné - À implémenter');
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
      {/* Ligne supérieure */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/achats/prix-fournisseurs')}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          <span>Nouveau</span>
        </button>
        <span className="text-gray-400">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Prix Fournisseurs</h1>
      </div>

      {/* BLOC UNIQUE - Tout intégré */}
      <div className="bg-white rounded-lg border border-gray-300 mb-6">
        {/* Section en-tête INTÉGRÉE dans le bloc */}
        <div className="p-6 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Etat:</span>
                <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">
                  Brouillon
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">N° prix:</span>
                <span className="text-sm font-bold text-gray-900">{formData.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Actions Dropdown - Ergonomique */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Actions
                  <FiChevronDown className="text-sm" />
                </button>
                
                {showActions && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={handleDuplicate}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiCopy className="text-sm" />
                        Dupliquer
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <FiTrash2 className="text-sm" />
                        Supprimer
                      </button>
                      <button
                        onClick={handleExtourne}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiRotateCcw className="text-sm" />
                        Extourné
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ignorer les modifications - Ergonomique */}
              <button
                onClick={handleIgnoreChanges}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Ignorer les modifications
              </button>
              
              {/* Bouton Enregistrer VIOLET */}
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FiSave className="text-sm" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>

        {/* Numéro en grand - PXF/26/3000 */}
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-3xl font-bold text-gray-900 text-center">PXF/26/3000</h2>
        </div>

        {/* PARTIE HAUTE - Grille 6 champs */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-gray-300">
          {/* Numéro */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Numéro *</p>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="PXF/26/3000"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Fournisseur */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Fournisseur *</p>
            <select
              name="fournisseur_id"
              value={formData.fournisseur_id}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          
          {/* Produit */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Produit *</p>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner</option>
              {produits.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          {/* Prix */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Prix *</p>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Devise */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Devise *</p>
            <select
              name="currency_id"
              value={formData.currency_id}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner</option>
              {devises.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          {/* Quantité Minimale */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Qté Min</p>
            <input
              type="text"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* TABLEAU COMPACT POUR PRIX FOURNISSEURS - LARGEUR 30-40px */}
        <div className="p-4 border-b border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Fournisseur</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Produit</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-20">Prix</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-24">Devise</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-20">Qté Min</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-28">Date Effective</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-32">Notes</th>
                  <th className="px-2 py-2 font-medium text-gray-500 border border-gray-300 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, index) => (
                  <tr key={ligne.id}>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <select
                        value={ligne.fournisseur}
                        onChange={(e) => handleLigneChange(index, 'fournisseur', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {fournisseurs.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <select
                        value={ligne.produit}
                        onChange={(e) => handleLigneChange(index, 'produit', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {produits.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-20">
                      <input
                        type="text"
                        value={ligne.prix}
                        onChange={(e) => handleLigneChange(index, 'prix', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-24">
                      <select
                        value={ligne.devise}
                        onChange={(e) => handleLigneChange(index, 'devise', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                      >
                        <option value="">Sélectionner</option>
                        {devises.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-20">
                      <input
                        type="text"
                        value={ligne.quantite_min}
                        onChange={(e) => handleLigneChange(index, 'quantite_min', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-28">
                      <input
                        type="date"
                        value={ligne.date_effective}
                        onChange={(e) => handleLigneChange(index, 'date_effective', e.target.value)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-32">
                      <input
                        type="text"
                        value={ligne.notes}
                        onChange={(e) => handleLigneChange(index, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-1.5 border border-gray-300 w-10 text-center">
                      {lignes.length > 1 && (
                        <button
                          onClick={() => removeLigne(ligne.id)}
                          className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                          title="Supprimer cette ligne"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION AVEC BOUTON À GAUCHE */}
        <div className="p-4 border-b border-gray-300">
          <div className="flex justify-start items-center">
            {/* BOUTON AJOUTER UNE LIGNE EN VIOLET À GAUCHE */}
            <button
              type="button"
              onClick={addLigne}
              className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700 flex items-center gap-2"
            >
              <FiPlus className="text-sm" />
              Ajouter une ligne
            </button>
          </div>
        </div>

        {/* NOTES */}
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-2">Notes Générales</p>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ajoutez des notes générales ici..."
            rows="3"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiSave, FiPlus, FiChevronDown, FiCopy, FiTrash2, FiRotateCcw } from 'react-icons/fi';

export default function DemandesAchatEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showActions, setShowActions] = useState(false);
  const [activeTab, setActiveTab] = useState('lignes');
  
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
    department_id: '',
    company_id: '',
    date_start: new Date().toISOString().split('T')[0],
    state: 'brouillon',
    notes: ''
  });

  const [lignes, setLignes] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [demandeRes, utilisateursRes, departementsRes, societesRes] = await Promise.all([
        apiClient.get(`/achats/demandes-achat/${id}/`),
        apiClient.get('/utilisateurs/'),
        apiClient.get('/departements/'),
        apiClient.get('/societes/')
      ]);
      
      setFormData(demandeRes.data);
      setLignes(demandeRes.data.lignes || []);
      setUtilisateurs(utilisateursRes.data || []);
      setDepartements(departementsRes.data || []);
      setSocietes(societesRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const totalEstime = useMemo(() => {
    return lignes.reduce((sum, ligne) => {
      return sum + (parseFloat(ligne.prix_estime) || 0) * (parseFloat(ligne.quantite) || 0);
    }, 0);
  }, [lignes]);

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
    
    if (field === 'quantite' || field === 'prix_estime') {
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
    const newId = lignes.length > 0 ? Math.max(...lignes.map(l => l.id || 0)) + 1 : 1;
    setLignes([...lignes, {
      id: newId,
      article: '',
      description: '',
      quantite: '1',
      prix_estime: '0',
      urgence: 'normal',
      date_besoin: '',
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
      await apiClient.put(`/achats/demandes-achat/${id}/`, { ...formData, lignes });
      navigate('/achats/demandes-achat');
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Erreur lors de la modification');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIgnoreChanges = () => {
    if (window.confirm('Voulez-vous vraiment ignorer les modifications ?')) {
      navigate('/achats/demandes-achat');
    }
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
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/achats/demandes-achat')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Nouveau
        </button>
        <span className="text-gray-400">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Demande d'Achat</h1>
      </div>

      {/* BLOC PRINCIPAL */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-6">
        
        {/* HEADER GRIS */}
        <div className="bg-gray-100 border-b border-gray-300 p-4">
          <div className="flex items-center justify-between">
            {/* Gauche: État et Référence */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">État</span>
                <button className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-800 text-xs rounded hover:bg-teal-200">
                  <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                  {formData.state}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Référence</span>
                <span className="text-sm font-bold text-gray-900">{formData.name}</span>
              </div>
            </div>

            {/* Droite: Boutons d'action */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="px-3 py-1.5 text-xs border border-gray-300 bg-white rounded hover:bg-gray-50 flex items-center gap-1"
                >
                  Actions <FiChevronDown size={14} />
                </button>
                
                {showActions && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-10">
                    <button className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center gap-2">
                      <FiCopy size={14} /> Dupliquer
                    </button>
                    <button className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 text-red-600">
                      <FiTrash2 size={14} /> Supprimer
                    </button>
                    <button className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center gap-2">
                      <FiRotateCcw size={14} /> Extourné
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleIgnoreChanges}
                className="px-3 py-1.5 text-xs border border-gray-300 bg-white rounded hover:bg-gray-50"
              >
                Ignorer les modifications
              </button>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FiSave size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>

        {/* SECTION INFO */}
        <div className="border-b border-gray-300 p-6">
          <div className="mb-6">
            <label className="text-xs font-medium text-gray-700 block mb-2">Référence *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-32 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Utilisateur *</p>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner</option>
                {utilisateurs.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Département *</p>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner</option>
                {departements.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Société *</p>
              <select
                name="company_id"
                value={formData.company_id}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner</option>
                {societes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Date Début *</p>
              <input
                type="date"
                name="date_start"
                value={formData.date_start}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">État</p>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value="brouillon">Brouillon</option>
                <option value="demande_prix">Demande Prix</option>
                <option value="envoyer">Envoyé</option>
                <option value="confirmer">Confirmé</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="border-b border-gray-300">
          <div className="flex gap-0 px-6">
            <button
              onClick={() => setActiveTab('lignes')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'lignes'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Lignes de Demande
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('pieces')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === 'pieces'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pièces jointes
            </button>
          </div>
        </div>

        {/* CONTENU DES ONGLETS */}
        <div className="p-6">
          {/* TAB: LIGNES */}
          {activeTab === 'lignes' && (
            <div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300">Article</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300">Description</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300 text-right">Quantité</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300 text-right">Prix Estimé</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300">Urgence</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300">Date Besoin</th>
                      <th className="px-2 py-2 font-medium text-gray-700 border border-gray-300 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((ligne, index) => (
                      <tr key={ligne.id}>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input
                            type="text"
                            value={ligne.article || ''}
                            onChange={(e) => handleLigneChange(index, 'article', e.target.value)}
                            placeholder="Code article"
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input
                            type="text"
                            value={ligne.description || ''}
                            onChange={(e) => handleLigneChange(index, 'description', e.target.value)}
                            placeholder="Description du besoin"
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input
                            type="text"
                            value={ligne.quantite || ''}
                            onChange={(e) => handleLigneChange(index, 'quantite', e.target.value)}
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input
                            type="text"
                            value={ligne.prix_estime || ''}
                            onChange={(e) => handleLigneChange(index, 'prix_estime', e.target.value)}
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs text-right bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <select
                            value={ligne.urgence || 'normal'}
                            onChange={(e) => handleLigneChange(index, 'urgence', e.target.value)}
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                          >
                            <option value="faible">Faible</option>
                            <option value="normal">Normal</option>
                            <option value="urgent">Urgent</option>
                            <option value="tres_urgent">Très urgent</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input
                            type="date"
                            value={ligne.date_besoin || ''}
                            onChange={(e) => handleLigneChange(index, 'date_besoin', e.target.value)}
                            className="w-full px-1 py-0.5 border-0 focus:ring-0 text-xs bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center">
                          {lignes.length > 1 && (
                            <button
                              onClick={() => removeLigne(ligne.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* LIGNES ADD ET TOTAL */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={addLigne}
                  className="px-4 py-2 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 flex items-center gap-2"
                >
                  <FiPlus size={14} />
                  Ajouter une ligne
                </button>
                
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 bg-green-50 px-3 py-1 rounded">
                    Total estimé: {formatCurrency(totalEstime)} XOF
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ajoutez des notes ici..."
                rows="5"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* TAB: PIECES JOINTES */}
          {activeTab === 'pieces' && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Aucune pièce jointe pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

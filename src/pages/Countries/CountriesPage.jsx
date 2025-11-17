import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function PaysPage() {
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPays, setEditingPays] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPays();
    fetchDevises();
  }, []);

  // Fonction pour obtenir les détails d'une devise par son ID
  const getDeviseDetails = (deviseId) => {
    if (!deviseId && deviseId !== 0) {
      return null;
    }
    
    // Si c'est un ID numérique, trouver dans la liste des devises
    const idRecherche = typeof deviseId === 'object' ? deviseId.id : deviseId;
    
    const deviseTrouvee = devises.find(d => d.id === idRecherche);
    
    return deviseTrouvee || null;
  };

  const fetchPays = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/pays/');
      
      console.log('📊 Données pays reçues:', response);
      
      let paysData = [];
      if (Array.isArray(response)) {
        paysData = response;
      } else if (response && Array.isArray(response.results)) {
        paysData = response.results;
      } else {
        setError('Format de données inattendu');
        paysData = [];
      }

      // Debug des données pays
      if (paysData.length > 0) {
        console.log('🔍 Premier pays:', {
          nom: paysData[0].nom,
          devise_par_defaut: paysData[0].devise_par_defaut,
          type: typeof paysData[0].devise_par_defaut
        });
      }

      setPays(paysData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des pays:', err);
      setError('Erreur lors du chargement des pays');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevises = async () => {
    try {
      const response = await apiClient.get('/devises/');
      
      console.log('💰 Données devises reçues:', response);
      
      let devisesData = [];
      if (Array.isArray(response)) {
        devisesData = response;
      } else if (response && Array.isArray(response.results)) {
        devisesData = response.results;
      } else {
        devisesData = [];
      }

      console.log('📊 Nombre de devises chargées:', devisesData.length);
      if (devisesData.length > 0) {
        console.log('🔍 Devises disponibles:', devisesData.map(d => ({ id: d.id, code: d.code })));
      }

      setDevises(devisesData);
    } catch (err) {
      console.error('Error fetching devises:', err);
      setDevises([]);
    }
  };

  // Filtrage et recherche
  const filteredPays = pays.filter(paysItem => {
    const matchesSearch = 
      paysItem.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paysItem.code_iso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paysItem.code_tel?.includes(searchTerm);
    
    return matchesSearch;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPays = Array.isArray(filteredPays) ? filteredPays.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPays) ? filteredPays.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewPays = () => {
    setEditingPays(null);
    setShowForm(true);
  };

  const handleEdit = (paysItem) => {
    setEditingPays(paysItem);
    setShowForm(true);
  };

  const handleDelete = async (paysItem) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le pays "${paysItem.nom}" ?`)) {
      try {
        await apiClient.delete(`/pays/${paysItem.id}/`);
        fetchPays();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting pays:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPays(null);
    fetchPays();
  };

  const handleRetry = () => {
    fetchPays();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des pays...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Pays</h1>
          <p className="text-gray-600 mt-1">
            {filteredPays.length} pays trouvé(s)
            {searchTerm && ' • Recherche active'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRetry}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          <button 
            onClick={handleNewPays}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Pays
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom, code ISO, indicatif téléphonique..."
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Code ISO
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Indicatif
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Devise
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentPays.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {pays.length === 0 ? 'Aucun pays trouvé' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentPays.map((paysItem, index) => {
                  const deviseDetails = getDeviseDetails(paysItem.devise_par_defaut);
                  
                  // Debug pour chaque pays
                  console.log(`🎯 ${paysItem.nom}: devise_id=${paysItem.devise_par_defaut}, trouvée=`, !!deviseDetails);
                  
                  return (
                    <tr 
                      key={paysItem.id} 
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                        {paysItem.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                        {paysItem.nom}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          {paysItem.code_iso}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        <span className="font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                          {paysItem.code_tel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        {deviseDetails ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono bg-purple-50 px-2 py-1 rounded border border-purple-200">
                              {deviseDetails.code}
                            </span>
                            <span className="text-gray-500">{deviseDetails.symbole}</span>
                          </div>
                        ) : (
                          <div className="text-orange-500 text-xs">
                            {paysItem.devise_par_defaut ? `ID: ${paysItem.devise_par_defaut}` : 'Non définie'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleEdit(paysItem)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Éditer
                          </button>
                          <button 
                            onClick={() => handleDelete(paysItem)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPays.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Lignes par page:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPays.length)} sur {filteredPays.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`w-8 h-8 rounded border text-sm ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire Modal */}
      {showForm && (
        <PaysFormModal
          pays={editingPays}
          devises={devises}
          onClose={() => {
            setShowForm(false);
            setEditingPays(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des pays
function PaysFormModal({ pays, devises, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: pays?.nom || '',
    code_iso: pays?.code_iso || '',
    code_tel: pays?.code_tel || '',
    devise_par_defaut: pays?.devise_par_defaut || '', // Ici on utilise directement l'ID
    format_adresse: pays?.format_adresse || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.nom) {
      setError('Le nom du pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.code_iso || formData.code_iso.length !== 2) {
      setError('Le code ISO doit contenir exactement 2 caractères');
      setLoading(false);
      return;
    }

    try {
      const url = pays 
        ? `/pays/${pays.id}/`
        : `/pays/`;
      
      const method = pays ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la sauvegarde';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {pays ? 'Modifier le pays' : 'Créer un nouveau pays'}
          </h2>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom du pays */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du pays *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="France, Togo, États-Unis..."
              />
            </div>
            
            {/* Code ISO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code ISO (2 lettres) *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={formData.code_iso}
                onChange={(e) => handleChange('code_iso', e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                placeholder="FR"
              />
              <p className="text-xs text-gray-500 mt-1">
                2 lettres majuscules (ex: FR, TG, US)
              </p>
            </div>
            
            {/* Indicatif téléphonique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indicatif téléphonique
              </label>
              <input
                type="text"
                value={formData.code_tel}
                onChange={(e) => handleChange('code_tel', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+33"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: +228, +33, +1
              </p>
            </div>
            
            {/* Devise par défaut */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise par défaut
              </label>
              <select
                value={formData.devise_par_defaut}
                onChange={(e) => handleChange('devise_par_defaut', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez une devise</option>
                {devises.map(devise => (
                  <option key={devise.id} value={devise.id}>
                    {devise.code} - {devise.nom} ({devise.symbole})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Format d'adresse */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format d'adresse
              </label>
              <textarea
                value={formData.format_adresse}
                onChange={(e) => handleChange('format_adresse', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Rue, Code Postal Ville, Pays"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format recommandé pour les adresses de ce pays
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu du pays</h3>
            <div className="flex items-center space-x-4 text-lg">
              <span className="font-semibold">{formData.nom || 'Nom du pays'}</span>
              <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                {formData.code_iso || 'XX'}
              </span>
              <span className="text-gray-500">{formData.code_tel || '+XXX'}</span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              <span>{loading ? 'Sauvegarde...' : pays ? 'Mettre à jour' : 'Créer le pays'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
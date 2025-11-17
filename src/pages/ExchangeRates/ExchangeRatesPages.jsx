import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function TauxChangePage() {
  const [tauxChange, setTauxChange] = useState([]);
  const [devises, setDevises] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTaux, setEditingTaux] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDevise, setFilterDevise] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchTauxChange();
    fetchDevises();
    fetchEntites();
  }, []);

  const fetchTauxChange = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/taux-change/'); // ✅ Endpoint corrigé
      
      console.log('📊 Données taux de change reçues:', response);
      
      let tauxData = [];
      if (Array.isArray(response)) {
        tauxData = response;
      } else if (response && Array.isArray(response.results)) {
        tauxData = response.results;
      } else {
        setError('Format de données inattendu');
        tauxData = [];
      }

      setTauxChange(tauxData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des taux de change:', err);
      setError('Erreur lors du chargement des taux de change');
      setTauxChange([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevises = async () => {
    try {
      const response = await apiClient.get('/devises/');
      
      let devisesData = [];
      if (Array.isArray(response)) {
        devisesData = response;
      } else if (response && Array.isArray(response.results)) {
        devisesData = response.results;
      } else {
        devisesData = [];
      }

      setDevises(devisesData);
    } catch (err) {
      console.error('Error fetching devises:', err);
      setDevises([]);
    }
  };

  const fetchEntites = async () => {
    try {
      const response = await apiClient.get('/entites/');
      
      let entitesData = [];
      if (Array.isArray(response)) {
        entitesData = response;
      } else if (response && Array.isArray(response.results)) {
        entitesData = response.results;
      } else {
        entitesData = [];
      }

      setEntites(entitesData);
    } catch (err) {
      console.error('Error fetching entites:', err);
      setEntites([]);
    }
  };

  // Fonction pour obtenir les détails d'une devise - utilise maintenant les champs du serializer
  const getDeviseDetails = (tauxItem) => {
    return {
      code: tauxItem.devise_code,
      nom: tauxItem.devise_nom,
      symbole: tauxItem.devise_symbole
    };
  };

  // Fonction pour obtenir les détails d'une entité
  const getEntiteDetails = (tauxItem) => {
    return {
      raison_sociale: tauxItem.entite_nom
    };
  };

  // Formater le taux pour l'affichage
  const formatTaux = (taux) => {
    if (!taux) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(taux);
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Filtrage et recherche
  const filteredTauxChange = tauxChange.filter(taux => {
    const deviseDetails = getDeviseDetails(taux);
    const matchesSearch = 
      deviseDetails?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deviseDetails?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taux.date_taux?.includes(searchTerm);
    
    const matchesDevise = filterDevise === '' || taux.devise == filterDevise;
    const matchesDate = filterDate === '' || taux.date_taux === filterDate;
    
    return matchesSearch && matchesDevise && matchesDate;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTauxChange = Array.isArray(filteredTauxChange) ? filteredTauxChange.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredTauxChange) ? filteredTauxChange.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewTaux = () => {
    setEditingTaux(null);
    setShowForm(true);
  };

  const handleEdit = (taux) => {
    setEditingTaux(taux);
    setShowForm(true);
  };

  const handleDelete = async (taux) => {
    const deviseDetails = getDeviseDetails(taux);
    const deviseNom = deviseDetails ? `${deviseDetails.code} - ${deviseDetails.nom}` : 'cette devise';
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le taux de change du ${formatDate(taux.date_taux)} pour ${deviseNom} ?`)) {
      try {
        await apiClient.delete(`/taux-change/${taux.id}/`); // ✅ Endpoint corrigé
        fetchTauxChange();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting taux change:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTaux(null);
    fetchTauxChange();
  };

  const handleRetry = () => {
    fetchTauxChange();
    fetchDevises();
    fetchEntites();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des taux de change...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Taux de Change</h1>
          <p className="text-gray-600 mt-1">
            {filteredTauxChange.length} taux trouvé(s)
            {(searchTerm || filterDevise || filterDate) && ' • Filtres actifs'}
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
            onClick={handleNewTaux}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Taux
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Devise, date..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
            <select
              value={filterDevise}
              onChange={(e) => setFilterDevise(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les devises</option>
              {devises.map(devise => (
                <option key={devise.id} value={devise.id}>
                  {devise.code} - {devise.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterDevise('');
                setFilterDate('');
                setCurrentPage(1);
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{tauxChange.length}</div>
          <div className="text-sm text-gray-600">Total des taux</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(tauxChange.map(t => t.devise)).size}
          </div>
          <div className="text-sm text-gray-600">Devises différentes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(tauxChange.map(t => t.date_taux)).size}
          </div>
          <div className="text-sm text-gray-600">Dates différentes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {new Set(tauxChange.map(t => t.entite)).size}
          </div>
          <div className="text-sm text-gray-600">Entités différentes</div>
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
                  Devise
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Taux
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Entité
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentTauxChange.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {tauxChange.length === 0 ? 'Aucun taux de change trouvé' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentTauxChange.map((taux, index) => {
                  const deviseDetails = getDeviseDetails(taux);
                  const entiteDetails = getEntiteDetails(taux);
                  
                  return (
                    <tr 
                      key={taux.id} 
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                        {taux.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                        {deviseDetails ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              {deviseDetails.code}
                            </span>
                            <span className="text-gray-600">{deviseDetails.nom}</span>
                            <span className="text-gray-400">{deviseDetails.symbole}</span>
                          </div>
                        ) : (
                          <div className="text-orange-500 text-xs">
                            ID: {taux.devise}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        <span className="font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                          {formatDate(taux.date_taux)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        <span className="font-mono bg-purple-50 px-2 py-1 rounded border border-purple-200">
                          {formatTaux(taux.taux)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                        {entiteDetails ? (
                          <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                            {entiteDetails.raison_sociale}
                          </span>
                        ) : (
                          <div className="text-orange-500 text-xs">
                            ID: {taux.entite}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleEdit(taux)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Éditer
                          </button>
                          <button 
                            onClick={() => handleDelete(taux)}
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
        {filteredTauxChange.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTauxChange.length)} sur {filteredTauxChange.length}
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
        <TauxChangeFormModal
          taux={editingTaux}
          devises={devises}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingTaux(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des taux de change
function TauxChangeFormModal({ taux, devises, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    devise: taux?.devise || '',
    date_taux: taux?.date_taux || '',
    taux: taux?.taux || '',
    entite: taux?.entite || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.devise) {
      setError('La devise est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.date_taux) {
      setError('La date du taux est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.taux || parseFloat(formData.taux) <= 0) {
      setError('Le taux doit être un nombre positif');
      setLoading(false);
      return;
    }

    if (!formData.entite) {
      setError('L\'entité est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = taux 
        ? `/taux-change/${taux.id}/` // ✅ Endpoint corrigé
        : `/taux-change/`; // ✅ Endpoint corrigé
      
      const method = taux ? 'PUT' : 'POST';

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

  // Obtenir les détails pour l'aperçu
  const deviseDetails = devises.find(d => d.id == formData.devise);
  const entiteDetails = entites.find(e => e.id == formData.entite);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {taux ? 'Modifier le taux de change' : 'Créer un nouveau taux de change'}
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
            {/* Devise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise *
              </label>
              <select
                required
                value={formData.devise}
                onChange={(e) => handleChange('devise', e.target.value)}
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
            
            {/* Date du taux */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du taux *
              </label>
              <input
                type="date"
                required
                value={formData.date_taux}
                onChange={(e) => handleChange('date_taux', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Taux */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux *
              </label>
              <input
                type="number"
                required
                step="0.000001"
                min="0.000001"
                value={formData.taux}
                onChange={(e) => handleChange('taux', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.000000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valeur du taux de change (ex: 655.957000)
              </p>
            </div>
            
            {/* Entité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entité *
              </label>
              <select
                required
                value={formData.entite}
                onChange={(e) => handleChange('entite', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez une entité</option>
                {entites.map(entite => (
                  <option key={entite.id} value={entite.id}>
                    {entite.raison_sociale}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu du taux de change</h3>
            <div className="flex items-center space-x-4 text-lg">
              {deviseDetails ? (
                <div className="flex items-center space-x-2">
                  <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    {deviseDetails.code}
                  </span>
                  <span className="text-gray-600">{deviseDetails.nom}</span>
                  <span className="text-gray-400">{deviseDetails.symbole}</span>
                </div>
              ) : (
                <span className="text-gray-400">Sélectionnez une devise</span>
              )}
              <span className="text-gray-500">→</span>
              <span className="font-mono bg-purple-50 px-2 py-1 rounded border border-purple-200">
                {formData.taux || '0.000000'}
              </span>
              <span className="text-gray-500">le</span>
              <span className="font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                {formData.date_taux || 'JJ/MM/AAAA'}
              </span>
              {entiteDetails && (
                <>
                  <span className="text-gray-500">pour</span>
                  <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                    {entiteDetails.raison_sociale}
                  </span>
                </>
              )}
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
              <span>{loading ? 'Sauvegarde...' : taux ? 'Mettre à jour' : 'Créer le taux'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
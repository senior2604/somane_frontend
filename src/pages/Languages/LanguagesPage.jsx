import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function LanguesPage() {
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLangue, setEditingLangue] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSens, setFilterSens] = useState('');

  useEffect(() => {
    fetchLangues();
  }, []);

  const fetchLangues = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/langues/');
      
      let languesData = [];
      if (Array.isArray(response)) {
        languesData = response;
      } else if (response && Array.isArray(response.results)) {
        languesData = response.results;
      } else {
        setError('Format de données inattendu');
        languesData = [];
      }

      setLangues(languesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des langues:', err);
      setError('Erreur lors du chargement des langues');
      setLangues([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredLangues = langues.filter(langue => {
    const matchesSearch = 
      langue.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      langue.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSens = filterSens === '' || langue.sens_ecriture === filterSens;
    
    return matchesSearch && matchesSens;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLangues = Array.isArray(filteredLangues) ? filteredLangues.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredLangues) ? filteredLangues.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewLangue = () => {
    setEditingLangue(null);
    setShowForm(true);
  };

  const handleEdit = (langue) => {
    setEditingLangue(langue);
    setShowForm(true);
  };

  const handleDelete = async (langue) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la langue "${langue.nom} (${langue.code})" ?`)) {
      try {
        await apiClient.delete(`/langues/${langue.id}/`);
        fetchLangues();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting langue:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLangue(null);
    fetchLangues();
  };

  const handleRetry = () => {
    fetchLangues();
  };

  // Formater le sens d'écriture pour l'affichage
  const getSensEcritureLabel = (sens) => {
    const sensLabels = {
      'LTR': 'Gauche → Droite',
      'RTL': 'Droite → Gauche'
    };
    return sensLabels[sens] || sens;
  };

  const getSensEcritureBadge = (sens) => {
    const badgeClasses = {
      'LTR': 'bg-blue-100 text-blue-800 border-blue-300',
      'RTL': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return badgeClasses[sens] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des langues...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Langues</h1>
          <p className="text-gray-600 mt-1">
            {filteredLangues.length} langue(s) trouvée(s)
            {(searchTerm || filterSens) && ' • Filtres actifs'}
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
            onClick={handleNewLangue}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Langue
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Code, nom de la langue..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sens d'écriture</label>
            <select
              value={filterSens}
              onChange={(e) => setFilterSens(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les sens</option>
              <option value="LTR">Gauche → Droite</option>
              <option value="RTL">Droite → Gauche</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSens('');
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
          <div className="text-2xl font-bold text-blue-600">{langues.length}</div>
          <div className="text-sm text-gray-600">Total des langues</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {langues.filter(l => l.sens_ecriture === 'LTR').length}
          </div>
          <div className="text-sm text-gray-600">Langues LTR</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {langues.filter(l => l.sens_ecriture === 'RTL').length}
          </div>
          <div className="text-sm text-gray-600">Langues RTL</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(langues.map(l => l.code.split('_')[0])).size}
          </div>
          <div className="text-sm text-gray-600">Langues différentes</div>
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
                  Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Sens d'écriture
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentLangues.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {langues.length === 0 ? 'Aucune langue trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentLangues.map((langue, index) => (
                  <tr 
                    key={langue.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {langue.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {langue.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {langue.nom}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getSensEcritureBadge(langue.sens_ecriture)}`}>
                        {getSensEcritureLabel(langue.sens_ecriture)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(langue)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(langue)}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLangues.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLangues.length)} sur {filteredLangues.length}
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
        <LangueFormModal
          langue={editingLangue}
          onClose={() => {
            setShowForm(false);
            setEditingLangue(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des langues
function LangueFormModal({ langue, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: langue?.code || '',
    nom: langue?.nom || '',
    sens_ecriture: langue?.sens_ecriture || 'LTR'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.code) {
      setError('Le code de la langue est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.nom) {
      setError('Le nom de la langue est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = langue 
        ? `/langues/${langue.id}/`
        : `/langues/`;
      
      const method = langue ? 'PUT' : 'POST';

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
            {langue ? 'Modifier la langue' : 'Créer une nouvelle langue'}
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
            {/* Code de la langue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de la langue *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="fr_FR, en_US, ar_SA..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: langue_RÉGION (ex: fr_FR, en_US, ar_SA)
              </p>
            </div>
            
            {/* Nom de la langue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la langue *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Français, English, العربية..."
              />
            </div>
            
            {/* Sens d'écriture */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sens d'écriture
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.sens_ecriture === 'LTR' 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="sens_ecriture"
                    value="LTR"
                    checked={formData.sens_ecriture === 'LTR'}
                    onChange={(e) => handleChange('sens_ecriture', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Gauche → Droite</span>
                    <span className="block text-sm text-gray-500">Langues européennes, etc.</span>
                  </div>
                </label>
                
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.sens_ecriture === 'RTL' 
                    ? 'bg-orange-50 border-orange-300' 
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="sens_ecriture"
                    value="RTL"
                    checked={formData.sens_ecriture === 'RTL'}
                    onChange={(e) => handleChange('sens_ecriture', e.target.value)}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Droite → Gauche</span>
                    <span className="block text-sm text-gray-500">Arabe, Hébreu, etc.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de la langue</h3>
            <div className="flex items-center space-x-4 text-lg">
              <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                {formData.code || 'xx_XX'}
              </span>
              <span className="font-semibold">{formData.nom || 'Nom de la langue'}</span>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                formData.sens_ecriture === 'LTR' 
                  ? 'bg-blue-100 text-blue-800 border-blue-300' 
                  : 'bg-orange-100 text-orange-800 border-orange-300'
              }`}>
                {formData.sens_ecriture === 'LTR' ? 'Gauche → Droite' : 'Droite → Gauche'}
              </span>
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
              <span>{loading ? 'Sauvegarde...' : langue ? 'Mettre à jour' : 'Créer la langue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
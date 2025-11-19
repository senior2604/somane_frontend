import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function UtilisateurEntitePage() {
  const [affiliations, setAffiliations] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterActif, setFilterActif] = useState('');

  useEffect(() => {
    fetchAffiliations();
    fetchUtilisateurs();
    fetchEntites();
  }, []);

  const fetchAffiliations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/utilisateur-entites/');
      
      let affiliationsData = [];
      if (Array.isArray(response)) {
        affiliationsData = response;
      } else if (response && Array.isArray(response.results)) {
        affiliationsData = response.results;
      } else {
        setError('Format de données inattendu');
        affiliationsData = [];
      }

      setAffiliations(affiliationsData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des affiliations:', err);
      setError('Erreur lors du chargement des affiliations utilisateur-entité');
    } finally {
      setLoading(false);
    }
  };

  const fetchUtilisateurs = async () => {
    try {
      const response = await apiClient.get('/utilisateurs/');
      
      let utilisateursData = [];
      if (Array.isArray(response)) {
        utilisateursData = response;
      } else if (response && Array.isArray(response.results)) {
        utilisateursData = response.results;
      } else {
        utilisateursData = [];
      }

      setUtilisateurs(utilisateursData);
    } catch (err) {
      console.error('Error fetching utilisateurs:', err);
      setUtilisateurs([]);
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

  // Filtrage et recherche
  const filteredAffiliations = affiliations.filter(affiliation => {
    const matchesSearch = 
      affiliation.utilisateur?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliation.utilisateur?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliation.entite?.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntite = filterEntite === '' || 
      (affiliation.entite && affiliation.entite.id.toString() === filterEntite);
    
    const matchesActif = filterActif === '' || 
      affiliation.actif.toString() === filterActif;
    
    return matchesSearch && matchesEntite && matchesActif;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAffiliations = Array.isArray(filteredAffiliations) ? filteredAffiliations.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredAffiliations) ? filteredAffiliations.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewAffiliation = () => {
    setEditingAffiliation(null);
    setShowForm(true);
  };

  const handleEdit = (affiliation) => {
    setEditingAffiliation(affiliation);
    setShowForm(true);
  };

  const handleDelete = async (affiliation) => {
    const utilisateurNom = affiliation.utilisateur?.email || affiliation.utilisateur?.username;
    const entiteNom = affiliation.entite?.raison_sociale;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'affiliation "${utilisateurNom} @ ${entiteNom}" ?`)) {
      try {
        await apiClient.delete(`/utilisateur-entites/${affiliation.id}/`);
        fetchAffiliations();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting affiliation:', err);
      }
    }
  };

  const handleToggleActif = async (affiliation) => {
    try {
      await apiClient.patch(`/utilisateur-entites/${affiliation.id}/`, {
        actif: !affiliation.actif
      });
      fetchAffiliations();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling actif:', err);
    }
  };

  const handleSetDefault = async (affiliation) => {
    try {
      // Désactiver toutes les entités par défaut pour cet utilisateur
      const autresAffiliations = affiliations.filter(
        aff => aff.utilisateur.id === affiliation.utilisateur.id && aff.id !== affiliation.id
      );
      
      for (const aff of autresAffiliations) {
        await apiClient.patch(`/utilisateur-entites/${aff.id}/`, {
          est_defaut: false
        });
      }
      
      // Définir celle-ci comme défaut
      await apiClient.patch(`/utilisateur-entites/${affiliation.id}/`, {
        est_defaut: true
      });
      
      fetchAffiliations();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error setting default:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAffiliation(null);
    fetchAffiliations();
  };

  const handleRetry = () => {
    fetchAffiliations();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des affiliations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Affiliations Utilisateur-Entité</h1>
          <p className="text-gray-600 mt-1">
            {filteredAffiliations.length} affiliation(s) trouvée(s)
            {(searchTerm || filterEntite || filterActif) && ' • Filtres actifs'}
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
            onClick={handleNewAffiliation}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Affiliation
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
              placeholder="Email, username, raison sociale..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entité</label>
            <select
              value={filterEntite}
              onChange={(e) => setFilterEntite(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les entités</option>
              {entites.map(entite => (
                <option key={entite.id} value={entite.id}>
                  {entite.raison_sociale}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterActif}
              onChange={(e) => setFilterActif(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterEntite('');
                setFilterActif('');
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
          <div className="text-2xl font-bold text-blue-600">{affiliations.length}</div>
          <div className="text-sm text-gray-600">Total des affiliations</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {affiliations.filter(a => a.actif).length}
          </div>
          <div className="text-sm text-gray-600">Affiliations actives</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {affiliations.filter(a => a.est_defaut).length}
          </div>
          <div className="text-sm text-gray-600">Entités par défaut</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {new Set(affiliations.map(a => a.utilisateur?.id).filter(id => id)).size}
          </div>
          <div className="text-sm text-gray-600">Utilisateurs affiliés</div>
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
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Entité
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Par défaut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Date création
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentAffiliations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {affiliations.length === 0 ? 'Aucune affiliation trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentAffiliations.map((affiliation, index) => (
                  <tr 
                    key={affiliation.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {affiliation.id}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {affiliation.utilisateur?.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {affiliation.utilisateur?.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      {affiliation.entite?.raison_sociale}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        affiliation.actif 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {affiliation.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      {affiliation.est_defaut ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Défaut
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {new Date(affiliation.date_creation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleToggleActif(affiliation)}
                          className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                            affiliation.actif 
                              ? 'text-orange-600 hover:text-orange-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {affiliation.actif ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                          {affiliation.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        {!affiliation.est_defaut && (
                          <button 
                            onClick={() => handleSetDefault(affiliation)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Défaut
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(affiliation)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(affiliation)}
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
        {filteredAffiliations.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAffiliations.length)} sur {filteredAffiliations.length}
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
        <UtilisateurEntiteFormModal
          affiliation={editingAffiliation}
          utilisateurs={utilisateurs}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingAffiliation(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des affiliations
function UtilisateurEntiteFormModal({ affiliation, utilisateurs, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    utilisateur: affiliation?.utilisateur?.id || '',
    entite: affiliation?.entite?.id || '',
    est_defaut: affiliation?.est_defaut || false,
    actif: affiliation?.actif ?? true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.utilisateur || !formData.entite) {
      setError('L\'utilisateur et l\'entité sont obligatoires');
      setLoading(false);
      return;
    }

    try {
      const url = affiliation 
        ? `/utilisateur-entites/${affiliation.id}/`
        : `/utilisateur-entites/`;
      
      const method = affiliation ? 'PUT' : 'POST';

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
            {affiliation ? 'Modifier l\'affiliation' : 'Créer une nouvelle affiliation'}
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
            {/* Utilisateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur *
              </label>
              <select
                required
                value={formData.utilisateur}
                onChange={(e) => handleChange('utilisateur', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un utilisateur</option>
                {utilisateurs.map(utilisateur => (
                  <option key={utilisateur.id} value={utilisateur.id}>
                    {utilisateur.email} ({utilisateur.username})
                  </option>
                ))}
              </select>
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
            
            {/* Statut actif */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => handleChange('actif', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Affiliation active
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                L'utilisateur pourra accéder à cette entité
              </p>
            </div>
            
            {/* Entité par défaut */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.est_defaut}
                  onChange={(e) => handleChange('est_defaut', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Entité par défaut
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Cette entité sera sélectionnée par défaut pour l'utilisateur
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de l'affiliation</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Utilisateur:</strong> {
                  utilisateurs.find(u => u.id === formData.utilisateur)?.email || 'Non défini'
                }
              </div>
              <div>
                <strong>Entité:</strong> {
                  entites.find(e => e.id === formData.entite)?.raison_sociale || 'Non défini'
                }
              </div>
              <div>
                <strong>Statut:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.actif 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div>
                <strong>Par défaut:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.est_defaut 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {formData.est_defaut ? 'Oui' : 'Non'}
                </span>
              </div>
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
              <span>{loading ? 'Sauvegarde...' : affiliation ? 'Mettre à jour' : 'Créer l\'affiliation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
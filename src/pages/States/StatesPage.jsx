import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function SubdivisionsPage() {
  const [subdivisions, setSubdivisions] = useState([]);
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubdivision, setEditingSubdivision] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPays, setFilterPays] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchSubdivisions();
    fetchPays();
  }, []);

  const fetchSubdivisions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/subdivisions/');
      
      let subdivisionsData = [];
      if (Array.isArray(response)) {
        subdivisionsData = response;
      } else if (response && Array.isArray(response.results)) {
        subdivisionsData = response.results;
      } else {
        setError('Format de données inattendu');
        subdivisionsData = [];
      }

      setSubdivisions(subdivisionsData);
    } catch (err) {
      console.error('Erreur lors du chargement des subdivisions:', err);
      setError('Erreur lors du chargement des subdivisions');
      setSubdivisions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPays = async () => {
    try {
      const response = await apiClient.get('/pays/');
      setPays(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Erreur lors du chargement des pays:', err);
    }
  };

  // Filtrage et recherche
  const filteredSubdivisions = subdivisions.filter(subdivision => {
    const matchesSearch = 
      subdivision.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subdivision.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subdivision.pays?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPays = filterPays === '' || subdivision.pays?.id?.toString() === filterPays;
    const matchesType = filterType === '' || subdivision.type_subdivision === filterType;
    
    return matchesSearch && matchesPays && matchesType;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubdivisions = Array.isArray(filteredSubdivisions) ? filteredSubdivisions.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredSubdivisions) ? filteredSubdivisions.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewSubdivision = () => {
    setEditingSubdivision(null);
    setShowForm(true);
  };

  const handleEdit = (subdivision) => {
    setEditingSubdivision(subdivision);
    setShowForm(true);
  };

  const handleDelete = async (subdivision) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la subdivision "${subdivision.nom}" ?`)) {
      try {
        await apiClient.delete(`/subdivisions/${subdivision.id}/`);
        fetchSubdivisions();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting subdivision:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSubdivision(null);
    fetchSubdivisions();
  };

  const handleRetry = () => {
    fetchSubdivisions();
  };

  // Formater le type de subdivision pour l'affichage
  const getTypeSubdivisionLabel = (type) => {
    const typeLabels = {
      'region': 'Région',
      'state': 'État',
      'province': 'Province',
      'department': 'Département',
      'canton': 'Canton',
      'district': 'District',
      'other': 'Autre'
    };
    return typeLabels[type] || type;
  };

  const getTypeSubdivisionBadge = (type) => {
    const badgeClasses = {
      'region': 'bg-blue-100 text-blue-800 border-blue-300',
      'state': 'bg-green-100 text-green-800 border-green-300',
      'province': 'bg-purple-100 text-purple-800 border-purple-300',
      'department': 'bg-orange-100 text-orange-800 border-orange-300',
      'canton': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'district': 'bg-pink-100 text-pink-800 border-pink-300',
      'other': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return badgeClasses[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des subdivisions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Subdivisions</h1>
          <p className="text-gray-600 mt-1">
            {filteredSubdivisions.length} subdivision(s) trouvée(s)
            {(searchTerm || filterPays || filterType) && ' • Filtres actifs'}
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
            onClick={handleNewSubdivision}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Subdivision
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
              placeholder="Code, nom, pays..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
            <select
              value={filterPays}
              onChange={(e) => setFilterPays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les pays</option>
              {pays.map(paysItem => (
                <option key={paysItem.id} value={paysItem.id}>
                  {paysItem.emoji} {paysItem.nom_fr || paysItem.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              <option value="region">Région</option>
              <option value="state">État</option>
              <option value="province">Province</option>
              <option value="department">Département</option>
              <option value="canton">Canton</option>
              <option value="district">District</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterPays('');
              setFilterType('');
              setCurrentPage(1);
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{subdivisions.length}</div>
          <div className="text-sm text-gray-600">Total des subdivisions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(subdivisions.map(s => s.pays?.id)).size}
          </div>
          <div className="text-sm text-gray-600">Pays représentés</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {subdivisions.filter(s => s.type_subdivision === 'region').length}
          </div>
          <div className="text-sm text-gray-600">Régions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {subdivisions.filter(s => s.type_subdivision === 'state').length}
          </div>
          <div className="text-sm text-gray-600">États</div>
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
                  Type
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Pays
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentSubdivisions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {subdivisions.length === 0 ? 'Aucune subdivision trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentSubdivisions.map((subdivision, index) => (
                  <tr 
                    key={subdivision.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {subdivision.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {subdivision.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {subdivision.nom}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getTypeSubdivisionBadge(subdivision.type_subdivision)}`}>
                        {getTypeSubdivisionLabel(subdivision.type_subdivision)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <div className="flex items-center gap-2">
                        <span>{subdivision.pays?.emoji}</span>
                        <span>{subdivision.pays?.nom_fr || subdivision.pays?.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(subdivision)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(subdivision)}
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
        {filteredSubdivisions.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredSubdivisions.length)} sur {filteredSubdivisions.length}
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
        <SubdivisionFormModal
          subdivision={editingSubdivision}
          pays={pays}
          onClose={() => {
            setShowForm(false);
            setEditingSubdivision(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des subdivisions
function SubdivisionFormModal({ subdivision, pays, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: subdivision?.code || '',
    nom: subdivision?.nom || '',
    type_subdivision: subdivision?.type_subdivision || 'region',
    pays: subdivision?.pays?.id || '',
    latitude: subdivision?.latitude || '',
    longitude: subdivision?.longitude || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.code) {
      setError('Le code de la subdivision est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.nom) {
      setError('Le nom de la subdivision est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = subdivision 
        ? `/subdivisions/${subdivision.id}/`
        : `/subdivisions/`;
      
      const method = subdivision ? 'PUT' : 'POST';

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
            {subdivision ? 'Modifier la subdivision' : 'Créer une nouvelle subdivision'}
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
            {/* Code de la subdivision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de la subdivision *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TG-M, US-CA, FR-75..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: CodePays-CodeRégion (ex: TG-M pour Maritime, US-CA pour Californie)
              </p>
            </div>
            
            {/* Nom de la subdivision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la subdivision *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Maritime, Californie, Île-de-France..."
              />
            </div>
            
            {/* Type de subdivision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de subdivision *
              </label>
              <select
                required
                value={formData.type_subdivision}
                onChange={(e) => handleChange('type_subdivision', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="region">Région</option>
                <option value="state">État</option>
                <option value="province">Province</option>
                <option value="department">Département</option>
                <option value="canton">Canton</option>
                <option value="district">District</option>
                <option value="other">Autre</option>
              </select>
            </div>

            {/* Pays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays *
              </label>
              <select
                required
                value={formData.pays}
                onChange={(e) => handleChange('pays', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un pays</option>
                {pays.map(paysItem => (
                  <option key={paysItem.id} value={paysItem.id}>
                    {paysItem.emoji} {paysItem.nom_fr || paysItem.nom} ({paysItem.code_iso})
                  </option>
                ))}
              </select>
            </div>

            {/* Coordonnées géographiques */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="6.1378"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.2123"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de la subdivision</h3>
            <div className="flex items-center space-x-4 text-lg">
              <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                {formData.code || 'XX-XXX'}
              </span>
              <span className="font-semibold">{formData.nom || 'Nom de la subdivision'}</span>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                formData.type_subdivision === 'region' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                formData.type_subdivision === 'state' ? 'bg-green-100 text-green-800 border-green-300' :
                formData.type_subdivision === 'province' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                'bg-gray-100 text-gray-800 border-gray-300'
              }`}>
                {formData.type_subdivision === 'region' ? 'Région' :
                 formData.type_subdivision === 'state' ? 'État' :
                 formData.type_subdivision === 'province' ? 'Province' :
                 formData.type_subdivision === 'department' ? 'Département' :
                 formData.type_subdivision === 'canton' ? 'Canton' :
                 formData.type_subdivision === 'district' ? 'District' : 'Autre'}
              </span>
            </div>
            {formData.pays && (
              <div className="mt-2 text-sm text-gray-600">
                Pays: {pays.find(p => p.id.toString() === formData.pays)?.emoji} {pays.find(p => p.id.toString() === formData.pays)?.nom_fr || pays.find(p => p.id.toString() === formData.pays)?.nom}
              </div>
            )}
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
              <span>{loading ? 'Sauvegarde...' : subdivision ? 'Mettre à jour' : 'Créer la subdivision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
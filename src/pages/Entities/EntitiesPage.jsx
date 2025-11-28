import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient';

export default function EntitiesPage() {
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPays, setFilterPays] = useState('');

  useEffect(() => {
    fetchEntities();
    fetchUsers();
    fetchPays();
    fetchDevises();
    fetchLangues();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/entites/');
      
      if (Array.isArray(response)) {
        setEntities(response);
      } else if (response && Array.isArray(response.results)) {
        setEntities(response.results);
      } else {
        setError('Format de données inattendu');
        setEntities([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des entités:', err);
      setError('Erreur lors du chargement des entités');
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      
      if (Array.isArray(response)) {
        setUsers(response);
      } else if (response && Array.isArray(response.results)) {
        setUsers(response.results);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const fetchPays = async () => {
    try {
      const response = await apiClient.get('/pays/');
      
      if (Array.isArray(response)) {
        setPays(response);
      } else {
        setPays([]);
      }
    } catch (err) {
      console.error('Error fetching pays:', err);
      setPays([]);
    }
  };

  const fetchDevises = async () => {
    try {
      const response = await apiClient.get('/devises/');
      
      if (Array.isArray(response)) {
        setDevises(response);
      } else {
        setDevises([]);
      }
    } catch (err) {
      console.error('Error fetching devises:', err);
      setDevises([]);
    }
  };

  const fetchLangues = async () => {
    try {
      const response = await apiClient.get('/langues/');
      
      if (Array.isArray(response)) {
        setLangues(response);
      } else {
        setLangues([]);
      }
    } catch (err) {
      console.error('Error fetching langues:', err);
      setLangues([]);
    }
  };

  // Filtrage et recherche
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = 
      entity.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entity.activite && entity.activite.toLowerCase().includes(searchTerm.toLowerCase())) ||
      entity.ville?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.ville?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatut = !filterStatut || 
      (filterStatut === 'actif' ? entity.statut : !entity.statut);
    
    const matchesPays = !filterPays || 
      (entity.pays && entity.pays.id.toString() === filterPays);
    
    return matchesSearch && matchesStatut && matchesPays;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntities = Array.isArray(filteredEntities) ? filteredEntities.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredEntities) ? filteredEntities.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewEntity = () => {
    setEditingEntity(null);
    setShowForm(true);
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setShowForm(true);
  };

  const handleDelete = async (entity) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${entity.raison_sociale}" ?`)) {
      try {
        await apiClient.delete(`/entites/${entity.id}/`);
        fetchEntities();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting entity:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntity(null);
    fetchEntities();
  };

  const handleRetry = () => {
    fetchEntities();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des entités...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Entités</h1>
          <p className="text-gray-600 mt-1">
            {filteredEntities.length} entité(s) trouvé(s)
            {(searchTerm || filterPays || filterStatut) && ' • Filtres actifs'}
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
            onClick={handleNewEntity}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Entité
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
              placeholder="Raison sociale, activité, ville..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
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
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatut('');
              setFilterPays('');
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
          <div className="text-2xl font-bold text-blue-600">{entities.length}</div>
          <div className="text-sm text-gray-600">Total des entités</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(entities.map(e => e.pays?.id)).size}
          </div>
          <div className="text-sm text-gray-600">Pays représentés</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {entities.filter(e => e.statut).length}
          </div>
          <div className="text-sm text-gray-600">Entités actives</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {entities.filter(e => !e.statut).length}
          </div>
          <div className="text-sm text-gray-600">Entités inactives</div>
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
                  Raison Sociale
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Activité
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Forme Juridique
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Capital
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Ville
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Pays
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Téléphone
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentEntities.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {entities.length === 0 ? 'Aucune entité trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentEntities.map((entity, index) => (
                  <tr 
                    key={entity.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {entity.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      {entity.raison_sociale}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {entity.activite || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {entity.forme_juridique || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300 font-mono">
                      {entity.capital_social ? (
                        new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'XOF' 
                        }).format(entity.capital_social)
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {entity.ville?.nom || entity.ville || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <div className="flex items-center gap-2">
                        <span>{entity.pays?.emoji}</span>
                        <span>{entity.pays?.nom_fr || entity.pays?.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {entity.telephone}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                        entity.statut
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {entity.statut ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(entity)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(entity)}
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
        {filteredEntities.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEntities.length)} sur {filteredEntities.length}
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
        <EntityFormModal
          entity={editingEntity}
          users={users}
          pays={pays}
          devises={devises}
          langues={langues}
          onClose={() => {
            setShowForm(false);
            setEditingEntity(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// COMPOSANT MODAL AVEC DROPDOWNS AVEC RECHERCHE INTÉGRÉE
function EntityFormModal({ entity, users, pays, devises, langues, onClose, onSuccess }) {
  // Données pour les listes déroulantes
  const secteursActivite = [
    "Agriculture", "Agroalimentaire", "Artisanat", "Assurance", "Automobile",
    "Bancaire", "Bâtiment et Travaux Publics", "Commerce", "Communication",
    "Construction", "Consulting", "Distribution", "Éducation", "Énergie",
    "Finance", "Immobilier", "Industrie", "Informatique et Technologie",
    "Logistique", "Médical et Santé", "Restaurant et Hôtellerie", "Services",
    "Tourisme", "Transport", "Autre"
  ];

  const formesJuridiques = [
    "Entreprise Individuelle (EI)",
    "Entreprise Unipersonnelle à Responsabilité Limitée (EURL)",
    "Société à Responsabilité Limitée (SARL)",
    "Société Anonyme (SA)",
    "Société par Actions Simplifiée (SAS)",
    "Société par Actions Simplifiée Unipersonnelle (SASU)",
    "Société en Nom Collectif (SNC)",
    "Société Civile",
    "Groupement d'Intérêt Economique (GIE)",
    "Société Coopérative",
    "Association",
    "Fondation",
    "Autre"
  ];

  // États pour le formulaire
  const [formData, setFormData] = useState({
    raison_sociale: entity?.raison_sociale || '',
    activite: entity?.activite || '',
    activite_autre: '',
    forme_juridique: entity?.forme_juridique || '',
    forme_juridique_autre: '',
    capital_social: entity?.capital_social || '',
    date_creation: entity?.date_creation || new Date().toISOString().split('T')[0],
    registre_commerce: entity?.registre_commerce || '',
    numero_fiscal: entity?.numero_fiscal || '',
    securite_sociale: entity?.securite_sociale || '',
    adresse: entity?.adresse || '',
    complement_adresse: entity?.complement_adresse || '',
    code_postal: entity?.code_postal || '',
    pays: entity?.pays?.id || '',
    subdivision: entity?.subdivision?.id || '',
    ville: entity?.ville?.id || '',
    telephone: entity?.telephone || '',
    email: entity?.email || '',
    site_web: entity?.site_web || '',
    devise: entity?.devise?.id || '',
    langue: entity?.langue?.id || '',
    statut: entity?.statut !== undefined ? entity.statut : true,
    cree_par: entity?.cree_par?.id || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAutreActivite, setShowAutreActivite] = useState(false);
  const [showAutreFormeJuridique, setShowAutreFormeJuridique] = useState(false);
  
  // ÉTATS POUR LISTES DYNAMIQUES
  const [subdivisions, setSubdivisions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);
  const [loadingVilles, setLoadingVilles] = useState(false);

  // ÉTATS POUR RECHERCHE DANS LES DROPDOWNS
  const [searchActivite, setSearchActivite] = useState('');
  const [searchFormeJuridique, setSearchFormeJuridique] = useState('');
  const [searchPays, setSearchPays] = useState('');
  const [searchDevise, setSearchDevise] = useState('');
  const [searchLangue, setSearchLangue] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchSubdivision, setSearchSubdivision] = useState('');
  const [searchVille, setSearchVille] = useState('');

  // S'assurer que les tableaux sont toujours des tableaux
  const usersArray = Array.isArray(users) ? users : [];
  const paysArray = Array.isArray(pays) ? pays : [];
  const devisesArray = Array.isArray(devises) ? devises : [];
  const languesArray = Array.isArray(langues) ? langues : [];

  // Filtrer les listes avec la recherche
  const filteredSecteursActivite = secteursActivite.filter(secteur =>
    secteur.toLowerCase().includes(searchActivite.toLowerCase())
  );

  const filteredFormesJuridiques = formesJuridiques.filter(forme =>
    forme.toLowerCase().includes(searchFormeJuridique.toLowerCase())
  );

  const filteredPays = paysArray.filter(paysItem =>
    (paysItem.nom_fr || paysItem.nom).toLowerCase().includes(searchPays.toLowerCase()) ||
    paysItem.code_iso.toLowerCase().includes(searchPays.toLowerCase())
  );

  const filteredDevises = devisesArray.filter(devise =>
    devise.nom.toLowerCase().includes(searchDevise.toLowerCase()) ||
    devise.code.toLowerCase().includes(searchDevise.toLowerCase())
  );

  const filteredLangues = languesArray.filter(langue =>
    langue.nom.toLowerCase().includes(searchLangue.toLowerCase()) ||
    langue.code.toLowerCase().includes(searchLangue.toLowerCase())
  );

  const filteredUsers = usersArray.filter(user =>
    user.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredSubdivisions = subdivisions.filter(subdivision =>
    subdivision.nom.toLowerCase().includes(searchSubdivision.toLowerCase()) ||
    subdivision.code.toLowerCase().includes(searchSubdivision.toLowerCase())
  );

  const filteredVilles = villes.filter(ville =>
    ville.nom.toLowerCase().includes(searchVille.toLowerCase()) ||
    (ville.code_postal && ville.code_postal.includes(searchVille))
  );

  // CHARGEMENT DYNAMIQUE DES SUBDIVISIONS
  useEffect(() => {
    const fetchSubdivisions = async () => {
      if (formData.pays) {
        setLoadingSubdivisions(true);
        try {
          const response = await apiClient.get(`/subdivisions/?pays=${formData.pays}`);
          
          let subdivisionsData = [];
          if (Array.isArray(response)) {
            subdivisionsData = response;
          } else if (response && Array.isArray(response.results)) {
            subdivisionsData = response.results;
          }
          
          setSubdivisions(subdivisionsData);
          
          // Réinitialiser la subdivision si elle ne fait pas partie du nouveau pays
          if (formData.subdivision) {
            const currentSubdivisionExists = subdivisionsData.some(
              sub => sub.id.toString() === formData.subdivision.toString()
            );
            if (!currentSubdivisionExists) {
              setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement subdivisions:', err);
          setSubdivisions([]);
        } finally {
          setLoadingSubdivisions(false);
        }
      } else {
        setSubdivisions([]);
        setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
      }
    };

    fetchSubdivisions();
  }, [formData.pays, formData.subdivision]);

  // CHARGEMENT DYNAMIQUE DES VILLES
  useEffect(() => {
    const fetchVilles = async () => {
      if (formData.subdivision) {
        setLoadingVilles(true);
        try {
          const response = await apiClient.get(`/villes/?subdivision=${formData.subdivision}`);
          
          let villesData = [];
          if (Array.isArray(response)) {
            villesData = response;
          } else if (response && Array.isArray(response.results)) {
            villesData = response.results;
          }
          
          setVilles(villesData);
          
          // Réinitialiser la ville si elle ne fait pas partie de la nouvelle subdivision
          if (formData.ville) {
            const currentVilleExists = villesData.some(
              ville => ville.id.toString() === formData.ville.toString()
            );
            if (!currentVilleExists) {
              setFormData(prev => ({ ...prev, ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement villes:', err);
          setVilles([]);
        } finally {
          setLoadingVilles(false);
        }
      } else {
        setVilles([]);
        setFormData(prev => ({ ...prev, ville: '' }));
      }
    };

    fetchVilles();
  }, [formData.subdivision, formData.ville]);

  // Gestion du choix "Autre" pour les listes déroulantes
  useEffect(() => {
    setShowAutreActivite(formData.activite === 'Autre');
    setShowAutreFormeJuridique(formData.forme_juridique === 'Autre');
  }, [formData.activite, formData.forme_juridique]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.raison_sociale) {
      setError('La raison sociale est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.subdivision) {
      setError('La subdivision (état/province/région) est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.ville) {
      setError('La ville est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.telephone) {
      setError('Le téléphone est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.email) {
      setError('L\'email est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = entity 
        ? `/entites/${entity.id}/`
        : `/entites/`;
      
      const method = entity ? 'PUT' : 'POST';

      // Préparer les données finales
      const submitData = {
        ...formData,
        activite: showAutreActivite ? formData.activite_autre : formData.activite,
        forme_juridique: showAutreFormeJuridique ? formData.forme_juridique_autre : formData.forme_juridique,
      };

      // Nettoyer les champs temporaires
      delete submitData.activite_autre;
      delete submitData.forme_juridique_autre;

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
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

  // Composant réutilisable pour les dropdowns avec recherche - SOLUTION ULTIME
  const SearchableDropdown = ({ 
    label, 
    value, 
    onChange, 
    options, 
    searchValue,
    onSearchChange,
    placeholder,
    required = false,
    disabled = false,
    getOptionLabel = (option) => option,
    getOptionValue = (option) => option,
    renderOption = (option) => getOptionLabel(option)
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(option =>
      getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
    );

    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    // SOLUTION ULTIME : Utiliser mousedown au lieu de click et gérer les événements manuellement
    useEffect(() => {
      const handleMouseDown = (event) => {
        if (!dropdownRef.current?.contains(event.target)) {
          setIsOpen(false);
          onSearchChange('');
        }
      };

      // Utiliser capture phase pour intercepter l'événement plus tôt
      document.addEventListener('mousedown', handleMouseDown, true);
      
      return () => {
        document.removeEventListener('mousedown', handleMouseDown, true);
      };
    }, [onSearchChange]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          // Focus sur l'input quand on ouvre
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        } else {
          onSearchChange('');
        }
      }
    };

    const handleInputMouseDown = (e) => {
      e.stopPropagation();
    };

    const handleInputFocus = (e) => {
      e.stopPropagation();
    };

    const handleInputClick = (e) => {
      e.stopPropagation();
    };

    const handleOptionClick = (optionValue) => {
      onChange(optionValue);
      setIsOpen(false);
      onSearchChange('');
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && '*'}
        </label>
        
        {/* Bouton d'ouverture du dropdown */}
        <button
          type="button"
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()} // Empêcher le focus immédiat
          disabled={disabled}
          className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-400'
          }`}
        >
          {selectedOption ? (
            <span className="block truncate">{getOptionLabel(selectedOption)}</span>
          ) : (
            <span className="text-gray-500">{placeholder || `Sélectionnez ${label.toLowerCase()}`}</span>
          )}
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Dropdown avec recherche */}
        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
            onMouseDown={handleInputMouseDown} // Empêcher la fermeture immédiate
          >
            {/* Barre de recherche */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onMouseDown={handleInputMouseDown}
                  onClick={handleInputClick}
                  onFocus={handleInputFocus}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder={`Rechercher...`}
                  autoFocus
                />
                <svg className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {filteredOptions.length} résultat(s) trouvé(s)
              </p>
            </div>
            
            {/* Liste des options */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Aucun résultat trouvé pour "{searchValue}"
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                      value === getOptionValue(option) ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Empêcher le focus
                      e.stopPropagation();
                    }}
                    onClick={() => handleOptionClick(getOptionValue(option))}
                  >
                    {renderOption(option)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Affichage de la valeur sélectionnée */}
        {selectedOption && !isOpen && (
          <p className="text-sm text-green-600 mt-1">
            Sélectionné: {getOptionLabel(selectedOption)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {entity ? 'Modifier l\'entité' : 'Créer une nouvelle entité'}
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
          {/* Informations Générales */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  value={formData.raison_sociale}
                  onChange={(e) => handleChange('raison_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'entreprise"
                />
              </div>
              
              {/* Secteur d'Activité avec recherche */}
              <div className="md:col-span-2">
                <SearchableDropdown
                  label="Secteur d'Activité"
                  value={formData.activite}
                  onChange={(value) => handleChange('activite', value)}
                  options={secteursActivite}
                  searchValue={searchActivite}
                  onSearchChange={setSearchActivite}
                  placeholder="Sélectionnez un secteur d'activité"
                  getOptionLabel={(option) => option}
                  getOptionValue={(option) => option}
                />
                {showAutreActivite && (
                  <input
                    type="text"
                    value={formData.activite_autre}
                    onChange={(e) => handleChange('activite_autre', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Précisez le secteur d'activité"
                    required
                  />
                )}
              </div>
              
              {/* Forme Juridique avec recherche */}
              <div>
                <SearchableDropdown
                  label="Forme Juridique"
                  value={formData.forme_juridique}
                  onChange={(value) => handleChange('forme_juridique', value)}
                  options={formesJuridiques}
                  searchValue={searchFormeJuridique}
                  onSearchChange={setSearchFormeJuridique}
                  placeholder="Sélectionnez une forme juridique"
                  getOptionLabel={(option) => option}
                  getOptionValue={(option) => option}
                />
                {showAutreFormeJuridique && (
                  <input
                    type="text"
                    value={formData.forme_juridique_autre}
                    onChange={(e) => handleChange('forme_juridique_autre', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Précisez la forme juridique"
                    required
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capital Social</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capital_social}
                  onChange={(e) => handleChange('capital_social', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de Création</label>
                <input
                  type="date"
                  required
                  value={formData.date_creation}
                  onChange={(e) => handleChange('date_creation', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly={!entity}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {!entity ? "Date du jour par défaut" : "Modifiable pour les entités existantes"}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={true}>Actif</option>
                  <option value={false}>Inactif</option>
                </select>
              </div>

              {/* Devise avec recherche */}
              <div>
                <SearchableDropdown
                  label="Devise"
                  value={formData.devise}
                  onChange={(value) => handleChange('devise', value)}
                  options={devisesArray}
                  searchValue={searchDevise}
                  onSearchChange={setSearchDevise}
                  placeholder="Sélectionnez une devise"
                  getOptionLabel={(devise) => `${devise.code} - ${devise.nom} (${devise.symbole})`}
                  getOptionValue={(devise) => devise.id}
                />
              </div>

              {/* Langue avec recherche */}
              <div>
                <SearchableDropdown
                  label="Langue"
                  value={formData.langue}
                  onChange={(value) => handleChange('langue', value)}
                  options={languesArray}
                  searchValue={searchLangue}
                  onSearchChange={setSearchLangue}
                  placeholder="Sélectionnez une langue"
                  getOptionLabel={(langue) => `${langue.nom} (${langue.code})`}
                  getOptionValue={(langue) => langue.id}
                />
              </div>
            </div>
          </div>

          {/* Informations Légales */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Légales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registre de Commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro RC"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro d'identification fiscale"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sécurité Sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Localisation</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse complète *</label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Adresse complète"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bâtiment, étage, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code Postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Code postal"
                />
              </div>

              {/* Pays avec recherche */}
              <div>
                <SearchableDropdown
                  label="Pays"
                  value={formData.pays}
                  onChange={(value) => handleChange('pays', value)}
                  options={paysArray}
                  searchValue={searchPays}
                  onSearchChange={setSearchPays}
                  placeholder="Sélectionnez un pays"
                  required={true}
                  getOptionLabel={(paysItem) => `${paysItem.emoji} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
                />
              </div>

              {/* Subdivision avec recherche */}
              <div>
                <SearchableDropdown
                  label="État/Province/Région"
                  value={formData.subdivision}
                  onChange={(value) => handleChange('subdivision', value)}
                  options={subdivisions}
                  searchValue={searchSubdivision}
                  onSearchChange={setSearchSubdivision}
                  placeholder="Sélectionnez une subdivision"
                  required={true}
                  disabled={!formData.pays || loadingSubdivisions}
                  getOptionLabel={(subdivision) => `${subdivision.nom} (${subdivision.type_subdivision})`}
                  getOptionValue={(subdivision) => subdivision.id}
                />
                {!formData.pays && (
                  <p className="text-xs text-gray-500 mt-1">Veuillez d'abord sélectionner un pays</p>
                )}
                {loadingSubdivisions && (
                  <p className="text-xs text-blue-500 mt-1">Chargement des subdivisions...</p>
                )}
              </div>

              {/* Ville avec recherche */}
              <div>
                <SearchableDropdown
                  label="Ville"
                  value={formData.ville}
                  onChange={(value) => handleChange('ville', value)}
                  options={villes}
                  searchValue={searchVille}
                  onSearchChange={setSearchVille}
                  placeholder="Sélectionnez une ville"
                  required={true}
                  disabled={!formData.subdivision || loadingVilles}
                  getOptionLabel={(ville) => `${ville.nom} ${ville.code_postal ? `(${ville.code_postal})` : ''}`}
                  getOptionValue={(ville) => ville.id}
                />
                {!formData.subdivision && (
                  <p className="text-xs text-gray-500 mt-1">Veuillez d'abord sélectionner une subdivision</p>
                )}
                {loadingVilles && (
                  <p className="text-xs text-blue-500 mt-1">Chargement des villes...</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+228 XX XXX XXX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@entreprise.tg"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Web</label>
                <input
                  type="url"
                  value={formData.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          {/* Administration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Administration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Utilisateur créateur avec recherche */}
              <div>
                <SearchableDropdown
                  label="Créé par"
                  value={formData.cree_par}
                  onChange={(value) => handleChange('cree_par', value)}
                  options={usersArray}
                  searchValue={searchUser}
                  onSearchChange={setSearchUser}
                  placeholder="Sélectionnez un utilisateur"
                  getOptionLabel={(user) => `${user.username} (${user.email})`}
                  getOptionValue={(user) => user.id}
                />
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
              <span>{loading ? 'Sauvegarde...' : entity ? 'Mettre à jour' : 'Créer l\'entité'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
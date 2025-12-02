import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function PartnerBanksPage() {
  const [partnerBanks, setPartnerBanks] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [banques, setBanques] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartnerBank, setEditingPartnerBank] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartenaire, setFilterPartenaire] = useState('');
  const [filterBanque, setFilterBanque] = useState('');

  useEffect(() => {
    fetchPartnerBanks();
    fetchPartenaires();
    fetchBanques();
    fetchEntites();
  }, []);

  const fetchPartnerBanks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/banques-partenaires/');
      
      let partnerBanksData = [];
      if (Array.isArray(response)) {
        partnerBanksData = response;
      } else if (response && Array.isArray(response.results)) {
        partnerBanksData = response.results;
      } else {
        setError('Format de données inattendu');
        partnerBanksData = [];
      }

      setPartnerBanks(partnerBanksData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des banques partenaires:', err);
      setError('Erreur lors du chargement des banques partenaires');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await apiClient.get('/partenaires/');
      
      let partenairesData = [];
      if (Array.isArray(response)) {
        partenairesData = response;
      } else if (response && Array.isArray(response.results)) {
        partenairesData = response.results;
      } else {
        partenairesData = [];
      }

      setPartenaires(partenairesData);
    } catch (err) {
      console.error('Error fetching partenaires:', err);
      setPartenaires([]);
    }
  };

  const fetchBanques = async () => {
    try {
      const response = await apiClient.get('/banques/');
      
      let banquesData = [];
      if (Array.isArray(response)) {
        banquesData = response;
      } else if (response && Array.isArray(response.results)) {
        banquesData = response.results;
      } else {
        banquesData = [];
      }

      setBanques(banquesData);
    } catch (err) {
      console.error('Error fetching banques:', err);
      setBanques([]);
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
  const filteredPartnerBanks = partnerBanks.filter(partnerBank => {
    const matchesSearch = 
      partnerBank.numero_compte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partnerBank.partenaire?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partnerBank.banque?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPartenaire = filterPartenaire === '' || 
      (partnerBank.partenaire && partnerBank.partenaire.id.toString() === filterPartenaire);
    
    const matchesBanque = filterBanque === '' || 
      (partnerBank.banque && partnerBank.banque.id.toString() === filterBanque);
    
    return matchesSearch && matchesPartenaire && matchesBanque;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartnerBanks = Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPartnerBanks) ? filteredPartnerBanks.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewPartnerBank = () => {
    setEditingPartnerBank(null);
    setShowForm(true);
  };

  const handleEdit = (partnerBank) => {
    setEditingPartnerBank(partnerBank);
    setShowForm(true);
  };

  const handleDelete = async (partnerBank) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${partnerBank.numero_compte}" ?`)) {
      try {
        await apiClient.delete(`/banques-partenaires/${partnerBank.id}/`);
        fetchPartnerBanks();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting partner bank:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPartnerBank(null);
    fetchPartnerBanks();
  };

  const handleRetry = () => {
    fetchPartnerBanks();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des comptes bancaires partenaires...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Comptes Bancaires Partenaires</h1>
          <p className="text-gray-600 mt-1">
            {filteredPartnerBanks.length} compte(s) trouvé(s)
            {(searchTerm || filterPartenaire || filterBanque) && ' • Filtres actifs'}
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
            onClick={handleNewPartnerBank}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Compte
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
              placeholder="Numéro compte, partenaire, banque..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Partenaire</label>
            <select
              value={filterPartenaire}
              onChange={(e) => setFilterPartenaire(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les partenaires</option>
              {partenaires.map(partenaire => (
                <option key={partenaire.id} value={partenaire.id}>
                  {partenaire.nom} ({partenaire.type_partenaire})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banque</label>
            <select
              value={filterBanque}
              onChange={(e) => setFilterBanque(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les banques</option>
              {banques.map(banque => (
                <option key={banque.id} value={banque.id}>
                  {banque.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPartenaire('');
                setFilterBanque('');
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
          <div className="text-2xl font-bold text-blue-600">{partnerBanks.length}</div>
          <div className="text-sm text-gray-600">Total des comptes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(partnerBanks.map(pb => pb.partenaire?.id).filter(id => id)).size}
          </div>
          <div className="text-sm text-gray-600">Partenaires uniques</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(partnerBanks.map(pb => pb.banque?.id).filter(id => id)).size}
          </div>
          <div className="text-sm text-gray-600">Banques uniques</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {new Set(partnerBanks.map(pb => pb.entite?.id).filter(id => id)).size}
          </div>
          <div className="text-sm text-gray-600">Entités concernées</div>
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
                  Partenaire
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Banque
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Numéro de Compte
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
              {currentPartnerBanks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {partnerBanks.length === 0 ? 'Aucun compte bancaire partenaire trouvé' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentPartnerBanks.map((partnerBank, index) => (
                  <tr 
                    key={partnerBank.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {partnerBank.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-semibold">{partnerBank.partenaire_details?.nom}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {partnerBank.partenaire?.type_partenaire}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {partnerBank.banque ? (
                        <div>
                          <div className="font-medium">{partnerBank.banque_details?.nom}</div>
                          {partnerBank.banque.code_bic && (
                            <div className="text-xs text-gray-500 font-mono">
                              {partnerBank.banque.code_bic}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {partnerBank.numero_compte}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {partnerBank.entite ? (
                        <div className="max-w-xs truncate" title={partnerBank.entite_details?.raison_sociale}>
                          {partnerBank.entite_details?.raison_sociale}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(partnerBank)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(partnerBank)}
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
        {filteredPartnerBanks.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPartnerBanks.length)} sur {filteredPartnerBanks.length}
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
        <PartnerBankFormModal
          partnerBank={editingPartnerBank}
          partenaires={partenaires}
          banques={banques}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingPartnerBank(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des banques partenaires
function PartnerBankFormModal({ partnerBank, partenaires, banques, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    partenaire: partnerBank?.partenaire?.id || '',
    banque: partnerBank?.banque?.id || '',
    numero_compte: partnerBank?.numero_compte || '',
    entite: partnerBank?.entite?.id || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.partenaire) {
      setError('Le partenaire est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.banque) {
      setError('La banque est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.numero_compte) {
      setError('Le numéro de compte est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.entite) {
      setError('L\'entité est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = partnerBank 
        ? `/banques-partenaires/${partnerBank.id}/`
        : `/banques-partenaires/`;
      
      const method = partnerBank ? 'PUT' : 'POST';

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
            {partnerBank ? 'Modifier le compte bancaire' : 'Créer un nouveau compte bancaire'}
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
            {/* Partenaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partenaire *
              </label>
              <select
                required
                value={formData.partenaire}
                onChange={(e) => handleChange('partenaire', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un partenaire</option>
                {partenaires.map(partenaire => (
                  <option key={partenaire.id} value={partenaire.id}>
                    {partenaire.nom} ({partenaire.type_partenaire})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Banque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banque *
              </label>
              <select
                required
                value={formData.banque}
                onChange={(e) => handleChange('banque', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez une banque</option>
                {banques.map(banque => (
                  <option key={banque.id} value={banque.id}>
                    {banque.nom} {banque.code_bic && `(${banque.code_bic})`}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Numéro de compte */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de compte *
              </label>
              <input
                type="text"
                required
                value={formData.numero_compte}
                onChange={(e) => handleChange('numero_compte', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="IBAN, numéro de compte..."
              />
            </div>
            
            {/* Entité */}
            <div className="md:col-span-2">
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu du compte bancaire</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Partenaire:</strong> {partenaires.find(p => p.id == formData.partenaire)?.nom || 'Non défini'}</div>
              <div><strong>Banque:</strong> {banques.find(b => b.id == formData.banque)?.nom || 'Non défini'}</div>
              <div><strong>Numéro compte:</strong> {formData.numero_compte || 'Non défini'}</div>
              <div><strong>Entité:</strong> {entites.find(e => e.id == formData.entite)?.raison_sociale || 'Non défini'}</div>
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
              <span>{loading ? 'Sauvegarde...' : partnerBank ? 'Mettre à jour' : 'Créer le compte'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
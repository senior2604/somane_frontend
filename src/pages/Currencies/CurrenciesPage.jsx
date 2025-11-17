import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function DevisesPage() {
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDevise, setEditingDevise] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActif, setFilterActif] = useState('');

  // Liste des devises courantes avec leurs symboles
  const devisesCourantes = [
    { code: 'XOF', nom: 'Franc CFA', symbole: 'CFA' },
    { code: 'EUR', nom: 'Euro', symbole: '€' },
    { code: 'USD', nom: 'Dollar US', symbole: '$' },
    { code: 'GBP', nom: 'Livre Sterling', symbole: '£' },
    { code: 'JPY', nom: 'Yen Japonais', symbole: '¥' },
    { code: 'CAD', nom: 'Dollar Canadien', symbole: 'CA$' },
    { code: 'CHF', nom: 'Franc Suisse', symbole: 'CHF' },
    { code: 'CNY', nom: 'Yuan Chinois', symbole: '¥' },
    { code: 'XAF', nom: 'Franc CFA BCEAO', symbole: 'FCFA' },
    { code: 'XPF', nom: 'Franc CFP', symbole: 'F' },
    { code: 'NGN', nom: 'Naira Nigérian', symbole: '₦' },
    { code: 'GHS', nom: 'Cedi Ghanéen', symbole: 'GH₵' },
    { code: 'ZAR', nom: 'Rand Sud-Africain', symbole: 'R' },
    { code: 'AED', nom: 'Dirham des Émirats', symbole: 'د.إ' },
    { code: 'INR', nom: 'Roupie Indienne', symbole: '₹' },
    { code: 'BRL', nom: 'Real Brésilien', symbole: 'R$' },
    { code: 'MAD', nom: 'Dirham Marocain', symbole: 'د.م.' },
    { code: 'TND', nom: 'Dinar Tunisien', symbole: 'د.ت' },
    { code: 'EGP', nom: 'Livre Égyptienne', symbole: '£' },
    { code: 'RUB', nom: 'Rouble Russe', symbole: '₽' },
    { code: 'TRY', nom: 'Livre Turque', symbole: '₺' },
    { code: 'KRW', nom: 'Won Sud-Coréen', symbole: '₩' },
    { code: 'SGD', nom: 'Dollar de Singapour', symbole: 'S$' },
    { code: 'AUD', nom: 'Dollar Australien', symbole: 'A$' },
    { code: 'NZD', nom: 'Dollar Néo-Zélandais', symbole: 'NZ$' },
    { code: 'SEK', nom: 'Couronne Suédoise', symbole: 'kr' },
    { code: 'NOK', nom: 'Couronne Norvégienne', symbole: 'kr' },
    { code: 'DKK', nom: 'Couronne Danoise', symbole: 'kr' },
    { code: 'PLN', nom: 'Zloty Polonais', symbole: 'zł' },
    { code: 'HUF', nom: 'Forint Hongrois', symbole: 'Ft' },
    { code: 'CZK', nom: 'Couronne Tchèque', symbole: 'Kč' },
    { code: 'RON', nom: 'Leu Roumain', symbole: 'lei' },
    { code: 'BGN', nom: 'Lev Bulgare', symbole: 'лв' },
    { code: 'HRK', nom: 'Kuna Croate', symbole: 'kn' },
    { code: 'THB', nom: 'Baht Thaïlandais', symbole: '฿' },
    { code: 'MYR', nom: 'Ringgit Malaisien', symbole: 'RM' },
    { code: 'PHP', nom: 'Peso Philippin', symbole: '₱' },
    { code: 'IDR', nom: 'Roupie Indonésienne', symbole: 'Rp' },
    { code: 'VND', nom: 'Dong Vietnamien', symbole: '₫' },
    { code: 'PKR', nom: 'Roupie Pakistanaise', symbole: '₨' },
    { code: 'BDT', nom: 'Taka Bangladeshi', symbole: '৳' },
    { code: 'LKR', nom: 'Roupie Sri Lankaise', symbole: 'Rs' },
    { code: 'KWD', nom: 'Dinar Koweïtien', symbole: 'د.ك' },
    { code: 'SAR', nom: 'Riyal Saoudien', symbole: 'ر.س' },
    { code: 'QAR', nom: 'Riyal Qatari', symbole: 'ر.ق' },
    { code: 'OMR', nom: 'Rial Omani', symbole: 'ر.ع.' },
    { code: 'BHD', nom: 'Dinar Bahreïni', symbole: 'د.ب' },
    { code: 'JOD', nom: 'Dinar Jordanien', symbole: 'د.ا' },
    { code: 'LBP', nom: 'Livre Libanaise', symbole: 'ل.ل' },
    { code: 'ILS', nom: 'Nouveau Shekel Israélien', symbole: '₪' }
  ];

  useEffect(() => {
    fetchDevises();
  }, []);

  const fetchDevises = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/devises/');
      
      if (Array.isArray(response)) {
        setDevises(response);
      } else if (response && Array.isArray(response.results)) {
        setDevises(response.results);
      } else {
        // Si l'API ne répond pas, utiliser les données de démonstration
        console.log('⚠️ Utilisation des données de démonstration');
        setDevises(getDemoDevises());
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des devises:', err);
      setError('Erreur lors du chargement des devises');
      // En cas d'erreur, utiliser les données de démonstration
      setDevises(getDemoDevises());
    } finally {
      setLoading(false);
    }
  };

  // Données de démonstration étendues
  const getDemoDevises = () => [
    { id: 1, code: 'XOF', nom: 'Franc CFA', symbole: 'CFA', arrondi: 1, actif: true },
    { id: 2, code: 'EUR', nom: 'Euro', symbole: '€', arrondi: 0.01, actif: true },
    { id: 3, code: 'USD', nom: 'Dollar US', symbole: '$', arrondi: 0.01, actif: true },
    { id: 4, code: 'GBP', nom: 'Livre Sterling', symbole: '£', arrondi: 0.01, actif: true },
    { id: 5, code: 'JPY', nom: 'Yen Japonais', symbole: '¥', arrondi: 1, actif: true },
    { id: 6, code: 'CAD', nom: 'Dollar Canadien', symbole: 'CA$', arrondi: 0.01, actif: true },
    { id: 7, code: 'CHF', nom: 'Franc Suisse', symbole: 'CHF', arrondi: 0.01, actif: true },
    { id: 8, code: 'CNY', nom: 'Yuan Chinois', symbole: '¥', arrondi: 0.01, actif: true },
    { id: 9, code: 'XAF', nom: 'Franc CFA BCEAO', symbole: 'FCFA', arrondi: 1, actif: true },
    { id: 10, code: 'XPF', nom: 'Franc CFP', symbole: 'F', arrondi: 1, actif: false },
    { id: 11, code: 'NGN', nom: 'Naira Nigérian', symbole: '₦', arrondi: 1, actif: true },
    { id: 12, code: 'GHS', nom: 'Cedi Ghanéen', symbole: 'GH₵', arrondi: 0.01, actif: true },
    { id: 13, code: 'ZAR', nom: 'Rand Sud-Africain', symbole: 'R', arrondi: 0.01, actif: true },
    { id: 14, code: 'AED', nom: 'Dirham des Émirats', symbole: 'د.إ', arrondi: 0.01, actif: true },
    { id: 15, code: 'INR', nom: 'Roupie Indienne', symbole: '₹', arrondi: 0.01, actif: true },
    { id: 16, code: 'BRL', nom: 'Real Brésilien', symbole: 'R$', arrondi: 0.01, actif: true },
    { id: 17, code: 'MAD', nom: 'Dirham Marocain', symbole: 'د.م.', arrondi: 0.01, actif: true },
    { id: 18, code: 'TND', nom: 'Dinar Tunisien', symbole: 'د.ت', arrondi: 0.001, actif: true },
    { id: 19, code: 'EGP', nom: 'Livre Égyptienne', symbole: '£', arrondi: 0.01, actif: true },
    { id: 20, code: 'RUB', nom: 'Rouble Russe', symbole: '₽', arrondi: 0.01, actif: false },
    { id: 21, code: 'TRY', nom: 'Livre Turque', symbole: '₺', arrondi: 0.01, actif: true },
    { id: 22, code: 'KRW', nom: 'Won Sud-Coréen', symbole: '₩', arrondi: 1, actif: true },
    { id: 23, code: 'SGD', nom: 'Dollar de Singapour', symbole: 'S$', arrondi: 0.01, actif: true },
    { id: 24, code: 'AUD', nom: 'Dollar Australien', symbole: 'A$', arrondi: 0.01, actif: true },
    { id: 25, code: 'NZD', nom: 'Dollar Néo-Zélandais', symbole: 'NZ$', arrondi: 0.01, actif: true }
  ];

  // Filtrage et recherche
  const filteredDevises = devises.filter(devise => {
    const matchesSearch = 
      devise.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      devise.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      devise.symbole?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActif = filterActif === '' || 
      (filterActif === 'actif' ? devise.actif : !devise.actif);
    
    return matchesSearch && matchesActif;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDevises = Array.isArray(filteredDevises) ? filteredDevises.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredDevises) ? filteredDevises.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewDevise = () => {
    setEditingDevise(null);
    setShowForm(true);
  };

  const handleEdit = (devise) => {
    setEditingDevise(devise);
    setShowForm(true);
  };

  const handleDelete = async (devise) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la devise "${devise.code} - ${devise.nom}" ?`)) {
      try {
        await apiClient.delete(`/devises/${devise.id}/`);
        fetchDevises();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting devise:', err);
      }
    }
  };

  const handleToggleActif = async (devise) => {
    try {
      await apiClient.patch(`/devises/${devise.id}/`, {
        actif: !devise.actif
      });
      fetchDevises();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
      console.error('Error toggling devise status:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDevise(null);
    fetchDevises();
  };

  const handleRetry = () => {
    fetchDevises();
  };

  // Formater l'arrondi pour l'affichage
  const formatArrondi = (arrondi) => {
    if (!arrondi) return '1';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    }).format(arrondi);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des devises...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Devises</h1>
          <p className="text-gray-600 mt-1">
            {filteredDevises.length} devise(s) trouvée(s)
            {filterActif && ' • Filtres actifs'}
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
            onClick={handleNewDevise}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Devise
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
              placeholder="Code, nom, symbole..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterActif}
              onChange={(e) => setFilterActif(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actives</option>
              <option value="inactif">Inactives</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{devises.length}</div>
          <div className="text-sm text-gray-600">Total des devises</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {devises.filter(d => d.actif).length}
          </div>
          <div className="text-sm text-gray-600">Devises actives</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {devises.filter(d => !d.actif).length}
          </div>
          <div className="text-sm text-gray-600">Devises inactives</div>
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
                  Symbole
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Arrondi
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
              {currentDevises.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {devises.length === 0 ? 'Aucune devise trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentDevises.map((devise, index) => (
                  <tr 
                    key={devise.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {devise.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <span className="font-mono bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {devise.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {devise.nom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <span className="font-semibold">{devise.symbole}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300 font-mono">
                      {formatArrondi(devise.arrondi)}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <button
                        onClick={() => handleToggleActif(devise)}
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          devise.actif
                            ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {devise.actif ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(devise)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(devise)}
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
        {filteredDevises.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDevises.length)} sur {filteredDevises.length}
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
        <DeviseFormModal
          devise={editingDevise}
          devisesCourantes={devisesCourantes}
          onClose={() => {
            setShowForm(false);
            setEditingDevise(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des devises
function DeviseFormModal({ devise, devisesCourantes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: devise?.code || '',
    nom: devise?.nom || '',
    symbole: devise?.symbole || '',
    arrondi: devise?.arrondi || 1,
    actif: devise?.actif !== undefined ? devise.actif : true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modeSelection, setModeSelection] = useState('liste'); // 'liste' ou 'manuel'

  // Quand le code change, mettre à jour automatiquement le nom et le symbole si la devise existe dans la liste
  useEffect(() => {
    if (modeSelection === 'liste' && formData.code) {
      const deviseTrouvee = devisesCourantes.find(d => d.code === formData.code);
      if (deviseTrouvee) {
        setFormData(prev => ({
          ...prev,
          nom: deviseTrouvee.nom,
          symbole: deviseTrouvee.symbole
        }));
      }
    }
  }, [formData.code, modeSelection, devisesCourantes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (formData.code.length !== 3) {
      setError('Le code devise doit contenir exactement 3 caractères');
      setLoading(false);
      return;
    }

    if (!formData.nom) {
      setError('Le nom complet est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.symbole) {
      setError('Le symbole est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = devise 
        ? `/devises/${devise.id}/`
        : `/devises/`;
      
      const method = devise ? 'PUT' : 'POST';

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

  const handleSelectionModeChange = (mode) => {
    setModeSelection(mode);
    if (mode === 'liste') {
      // Réinitialiser les champs si on passe en mode liste
      setFormData(prev => ({
        ...prev,
        code: '',
        nom: '',
        symbole: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {devise ? 'Modifier la devise' : 'Créer une nouvelle devise'}
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
          {/* Mode de sélection */}
          {!devise && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Mode de sélection</h3>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleSelectionModeChange('liste')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    modeSelection === 'liste'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📋 Depuis la liste
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectionModeChange('manuel')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    modeSelection === 'manuel'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✏️ Saisie manuelle
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code devise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code devise *
              </label>
              {modeSelection === 'liste' && !devise ? (
                <select
                  required
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                >
                  <option value="">Sélectionnez un code</option>
                  {devisesCourantes.map(devise => (
                    <option key={devise.code} value={devise.code}>
                      {devise.code} - {devise.nom}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                  placeholder="EUR"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                3 lettres majuscules (ex: EUR, USD, XOF)
              </p>
            </div>
            
            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              {modeSelection === 'liste' && !devise ? (
                <select
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez un nom</option>
                  {devisesCourantes.map(devise => (
                    <option key={devise.nom} value={devise.nom}>
                      {devise.nom}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Euro, Dollar US, Franc CFA..."
                />
              )}
            </div>
            
            {/* Symbole */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symbole *
              </label>
              {modeSelection === 'liste' && !devise ? (
                <select
                  required
                  value={formData.symbole}
                  onChange={(e) => handleChange('symbole', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez un symbole</option>
                  {devisesCourantes.map(devise => (
                    <option key={devise.symbole} value={devise.symbole}>
                      {devise.symbole} ({devise.nom})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.symbole}
                  onChange={(e) => handleChange('symbole', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="€, $, CFA..."
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Symbole monétaire (max 10 caractères)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valeur d'arrondi
              </label>
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                value={formData.arrondi}
                onChange={(e) => handleChange('arrondi', parseFloat(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiple d'arrondi (ex: 1, 0.5, 0.01, 0.0001)
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => handleChange('actif', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Devise active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Les devises inactives ne seront pas disponibles dans les sélections
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de la devise</h3>
            <div className="flex items-center space-x-4 text-lg">
              <span className="font-mono bg-white px-3 py-2 rounded border border-gray-300">
                {formData.code || 'XXX'}
              </span>
              <span className="text-gray-600">{formData.nom || 'Nom de la devise'}</span>
              <span className="font-semibold">{formData.symbole || '¤'}</span>
              <span className="text-sm text-gray-500">
                Arrondi: {formData.arrondi || 1}
              </span>
              <span className={`text-sm px-2 py-1 rounded ${
                formData.actif 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {formData.actif ? 'Active' : 'Inactive'}
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
              <span>{loading ? 'Sauvegarde...' : devise ? 'Mettre à jour' : 'Créer la devise'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
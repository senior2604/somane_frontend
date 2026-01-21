import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../services/apiClient';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiUsers,
  FiUser,
  FiBriefcase,
  FiXCircle
} from "react-icons/fi";

export default function EquipesCommercialesPage() {
  const [equipes, setEquipes] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // États pour formulaire/modal
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [equipesResponse, societesResponse, utilisateursResponse] = await Promise.all([
        apiClient.get('/vente/equipes-commerciales/').catch(() => ({ data: [] })),
        apiClient.get('/societes/').catch(() => ({ data: [] })),
        apiClient.get('/utilisateurs/').catch(() => ({ data: [] }))
      ]);

      setEquipes(equipesResponse.data || []);
      setSocietes(societesResponse.data || []);
      setUtilisateurs(utilisateursResponse.data || []);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions utilitaires
  const getReferenceName = (list, id) => {
    const item = list.find(item => item.id === id);
    return item ? item.name : 'N/A';
  };

  const getMembersNames = (memberIds) => {
    if (!memberIds || !Array.isArray(memberIds)) return 'N/A';
    return memberIds.map(id => getReferenceName(utilisateurs, id)).join(', ');
  };

  // Filtrage et pagination
  const filteredData = equipes.filter(equipe => {
    const searchString = searchTerm.toLowerCase();
    return (
      (equipe.name && equipe.name.toLowerCase().includes(searchString)) ||
      (getReferenceName(utilisateurs, equipe.user_id)?.toLowerCase().includes(searchString)) ||
      (getMembersNames(equipe.member_ids)?.toLowerCase().includes(searchString))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      const endpoint = '/vente/equipes-commerciales/';
      if (editingItem) {
        await apiClient.put(`${endpoint}${editingItem.id}/`, formData);
      } else {
        await apiClient.post(endpoint, formData);
      }
      fetchData();
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe commerciale ?')) {
      try {
        await apiClient.delete(`/vente/equipes-commerciales/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipes Commerciales</h1>
          <p className="text-gray-600 mt-1">Gestion des équipes commerciales</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Actualiser
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <FiPlus className="mr-2" />
            Nouvelle Équipe
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom d'équipe, responsable, membres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={5}>5 par page</option>
              <option value={10}>10 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
              <FiFilter className="mr-2" />
              Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Table principale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom Équipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre de Membres
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membres
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((equipe) => (
                <tr key={equipe.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUsers className="text-blue-400 mr-3" size={20} />
                      <span className="font-medium text-gray-900">{equipe.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReferenceName(societes, equipe.company_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(utilisateurs, equipe.user_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-bold">
                          {equipe.member_ids && Array.isArray(equipe.member_ids) ? equipe.member_ids.length : 0}
                        </span>
                      </div>
                      <span className="ml-2 font-medium">
                        {equipe.member_ids && Array.isArray(equipe.member_ids) ? equipe.member_ids.length : 0} membres
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getMembersNames(equipe.member_ids)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(equipe);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Voir détails"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(equipe);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Modifier"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(equipe.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Supprimer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredData.length)} sur {filteredData.length} résultats
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiChevronLeft />
              </button>
              <span className="px-3 py-2 text-sm">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques sommaires */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Synthèse des Équipes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nombre total d'équipes</p>
                <p className="text-2xl font-bold mt-1">{equipes.length}</p>
              </div>
              <FiUsers className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total membres</p>
                <p className="text-2xl font-bold mt-1">
                  {equipes.reduce((sum, equipe) => 
                    sum + (equipe.member_ids && Array.isArray(equipe.member_ids) ? equipe.member_ids.length : 0), 0
                  )}
                </p>
              </div>
              <FiUser className="text-green-500" size={24} />
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sociétés représentées</p>
                <p className="text-2xl font-bold mt-1">
                  {[...new Set(equipes.map(equipe => equipe.company_id))].length}
                </p>
              </div>
              <FiBriefcase className="text-purple-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <EquipeCommercialeFormModal
          item={editingItem}
          societes={societes}
          utilisateurs={utilisateurs}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedItem && (
        <EquipeCommercialeDetailModal
          item={selectedItem}
          societes={societes}
          utilisateurs={utilisateurs}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// Modal de formulaire pour Équipe Commerciale
function EquipeCommercialeFormModal({ item, societes, utilisateurs, onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => ({
    name: item?.name || '',
    company_id: item?.company_id || '',
    user_id: item?.user_id || '',
    member_ids: item?.member_ids || []
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-t-lg">
          <h3 className="text-lg font-semibold">
            {item ? 'Modifier' : 'Nouvelle'} Équipe Commerciale
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'équipe *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Société *
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner une société</option>
                {societes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un responsable</option>
                {utilisateurs.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membres de l'équipe
            </label>
            <select
              multiple
              value={formData.member_ids}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, member_ids: options });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              size={6}
            >
              {utilisateurs.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Maintenez Ctrl pour sélectionner plusieurs membres
            </p>
            <div className="mt-2">
              <span className="text-sm text-gray-700">
                {formData.member_ids.length} membre(s) sélectionné(s)
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {item ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de détails pour Équipe Commerciale
function EquipeCommercialeDetailModal({ item, societes, utilisateurs, onClose }) {
  const getReferenceName = (list, id) => {
    const found = list.find(i => i.id === id);
    return found ? found.name : 'N/A';
  };

  const getMembersNames = (memberIds) => {
    if (!memberIds || !Array.isArray(memberIds)) return 'Aucun membre';
    return memberIds.map(id => getReferenceName(utilisateurs, id)).join(', ');
  };

  const getMembersCount = () => {
    if (!item.member_ids || !Array.isArray(item.member_ids)) return 0;
    return item.member_ids.length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiUsers className="mr-2 text-blue-600" />
            Détails de l'Équipe Commerciale
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiXCircle size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de l'équipe</label>
              <p className="text-xl font-bold">{item.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Société</label>
              <div className="flex items-center mt-1">
                <FiBriefcase className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(societes, item.company_id)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Responsable</label>
              <div className="flex items-center mt-1">
                <FiUser className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(utilisateurs, item.user_id)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de membres</label>
              <div className="flex items-center mt-1">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-700">{getMembersCount()}</span>
                </div>
                <span className="ml-4 text-lg">
                  {getMembersCount()} membre{getMembersCount() > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Identifiant</label>
              <p className="text-gray-600">ID: {item.id}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Membres de l'équipe</label>
          <div className="bg-gray-50 rounded-lg p-4">
            {item.member_ids && Array.isArray(item.member_ids) && item.member_ids.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {item.member_ids.map((memberId, index) => (
                  <div key={index} className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-700 font-medium">{index + 1}</span>
                    </div>
                    <span>{getReferenceName(utilisateurs, memberId)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Aucun membre assigné à cette équipe</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
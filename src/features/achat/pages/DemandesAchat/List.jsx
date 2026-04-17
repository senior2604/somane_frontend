import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiRefreshCw } from 'react-icons/fi';

const getStatusColor = (status) => {
  const colors = {
    'brouillon': 'gray',
    'demande_prix': 'yellow',
    'envoyer': 'blue',
    'confirmer': 'green',
    'annule': 'red'
  };
  return colors[status] || 'gray';
};

export default function DemandesAchatList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [demandesRes, utilisateursRes, departementsRes] = await Promise.all([
        apiClient.get('/achats/demandes-achat/'),
        apiClient.get('/utilisateurs/'),
        apiClient.get('/departements/')
      ]);
      
      setData(demandesRes.data || []);
      setUtilisateurs(utilisateursRes.data || []);
      setDepartements(departementsRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserName = (userId) => {
    const user = utilisateurs.find(u => u.id === userId);
    return user?.name || userId;
  };

  const getDepartmentName = (departmentId) => {
    const dept = departements.find(d => d.id === departmentId);
    return dept?.name || departmentId;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'achat?')) {
      try {
        await apiClient.delete(`/achats/demandes-achat/${id}/`);
        setData(data.filter(item => item.id !== id));
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const filteredData = data.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    getUserName(item.user_id).toLowerCase().includes(search.toLowerCase()) ||
    getDepartmentName(item.department_id).toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'Achat</h1>
          <p className="text-gray-600 mt-1">Gérez vos demandes d'achat</p>
        </div>
        <button
          onClick={() => navigate('create')}
          className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center gap-2"
        >
          <FiPlus /> Nouvelle Demande
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, utilisateur ou département..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={fetchData}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FiRefreshCw className="text-gray-600" />
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Numéro</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Utilisateur</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Département</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date Début</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedData.map(item => {
              const statusColor = getStatusColor(item.state);
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getUserName(item.user_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getDepartmentName(item.department_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.date_start)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-700`}>
                      {item.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`${item.id}`)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <FiEye className="text-lg" />
                      </button>
                      <button
                        onClick={() => navigate(`${item.id}/edit`)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                      >
                        <FiEdit2 className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <FiTrash2 className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Afficher</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600">éléments</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function DemandesAchatShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [demandeRes, utilisateursRes, departementsRes, societesRes] = await Promise.all([
        apiClient.get(`/achats/demandes-achat/${id}/`),
        apiClient.get('/utilisateurs/'),
        apiClient.get('/departements/'),
        apiClient.get('/societes/')
      ]);
      
      setItem(demandeRes.data);
      setUtilisateurs(utilisateursRes.data || []);
      setDepartements(departementsRes.data || []);
      setSocietes(societesRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getReferenceName = (list, id, field = 'name') => {
    const ref = list.find(r => r.id === id);
    return ref ? ref[field] : 'N/A';
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'N/A';
  };

  const getStatusColor = (status) => {
    const colors = {
      'brouillon': 'bg-gray-100 text-gray-800',
      'attente': 'bg-yellow-100 text-yellow-800',
      'approuve': 'bg-green-100 text-green-800',
      'rejete': 'bg-red-100 text-red-800',
      'traite': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      try {
        await apiClient.delete(`/achats/demandes-achat/${id}/`);
        navigate('/achats/demandes-achat');
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  if (!item) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Demande d'achat non trouvée</p>
        <button onClick={() => navigate('/achats/demandes-achat')} className="text-violet-600 hover:text-violet-800 mt-4">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/achats/demandes-achat')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600 mt-1">Détails de la demande d'achat</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/achats/demandes-achat/${id}/edit`)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <FiEdit2 /> Modifier
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <FiTrash2 /> Supprimer
          </button>
        </div>
      </div>

      {/* Conteneur principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Utilisateur</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(utilisateurs, item.user_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Département</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(departements, item.department_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Société</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(societes, item.company_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date de Début</p>
                <p className="text-lg font-medium text-gray-900">
                  {formatDate(item.date_start)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statut */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Statut</h3>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded ${getStatusColor(item.state)}`}>
              {item.state}
            </span>
          </div>

          {/* Résumé */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Numéro</p>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date de Début</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(item.date_start)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

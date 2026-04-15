import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import VenteFormContainer from '../../components/VenteFormContainer';

export default function EquipesCommercialesShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [equipeRes, utilisateursRes] = await Promise.all([
        apiClient.get(`/ventes/equipes-commerciales/${id}/`),
        apiClient.get('/utilisateurs/')
      ]);
      
      setItem(equipeRes.data);
      setUtilisateurs(utilisateursRes.data || []);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
      try {
        await apiClient.delete(`/ventes/equipes-commerciales/${id}/`);
        navigate('/ventes/equipes-commerciales');
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
        <p className="text-gray-600">Équipe non trouvée</p>
        <button onClick={() => navigate('/ventes/equipes-commerciales')} className="text-violet-600 hover:text-violet-800 mt-4">
          Retour à la liste
        </button>
      </div>
    );
  }

  const headerData = { client: '', date: '', amounts: [] };

  const customMain = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Chef d'Équipe</p>
              <p className="text-lg font-medium text-gray-900">{getReferenceName(utilisateurs, item.team_lead_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Région</p>
              <p className="text-lg font-medium text-gray-900">{item.region || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Objectif Ventes</p>
              <p className="text-lg font-medium text-gray-900">{formatCurrency(item.sales_target)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Taux Commission</p>
              <p className="text-lg font-medium text-gray-900">{item.commission_rate ? `${item.commission_rate}%` : '-'}</p>
            </div>
          </div>
        </div>

        {item.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700">{item.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Nom</p>
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Région</p>
              <p className="text-sm font-medium text-gray-900">{item.region || '-'}</p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Objectif Ventes</p>
              <p className="text-lg font-bold text-violet-600">{formatCurrency(item.sales_target)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <VenteFormContainer
      title={item.name}
      reference={item.name}
      status={'draft'}
      mode="view"
      onBack={() => navigate('/ventes/equipes-commerciales')}
      onEdit={() => navigate(`/ventes/equipes-commerciales/${id}/edit`)}
      onDelete={handleDelete}
      headerData={headerData}
      customMainSection={customMain}
    />
  );
}

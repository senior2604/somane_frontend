import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function PrixFournisseursShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prixRes, fournisseursRes, produitsRes, devisesRes] = await Promise.all([
        apiClient.get(`/achats/prix-fournisseurs/${id}/`),
        apiClient.get('/fournisseurs/'),
        apiClient.get('/produits/'),
        apiClient.get('/devises/')
      ]);
      
      setItem(prixRes.data);
      setFournisseurs(fournisseursRes.data || []);
      setProduits(produitsRes.data || []);
      setDevises(devisesRes.data || []);
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

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'N/A';
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
      try {
        await apiClient.delete(`/achats/prix-fournisseurs/${id}/`);
        navigate('/achats/prix-fournisseurs');
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
        <p className="text-gray-600">Prix fournisseur non trouvé</p>
        <button onClick={() => navigate('/achats/prix-fournisseurs')} className="text-violet-600 hover:text-violet-800 mt-4">
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
            onClick={() => navigate('/achats/prix-fournisseurs')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prix #{item.id}</h1>
            <p className="text-gray-600 mt-1">Détails du prix fournisseur</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/achats/prix-fournisseurs/${id}/edit`)}
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
                <p className="text-sm text-gray-600">Fournisseur</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(fournisseurs, item.fournisseur_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Produit</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(produits, item.product_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Prix</p>
                <p className="text-lg font-medium text-gray-900">
                  {formatCurrency(item.price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Devise</p>
                <p className="text-lg font-medium text-gray-900">
                  {getReferenceName(devises, item.currency_id)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantité Minimale</p>
                <p className="text-lg font-medium text-gray-900">
                  {item.min_quantity || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Effective</p>
                <p className="text-lg font-medium text-gray-900">
                  {formatDate(item.date_effective)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Prix</p>
                <p className="text-lg font-bold text-violet-600">{formatCurrency(item.price)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Devise</p>
                <p className="text-sm font-medium text-gray-900">{getReferenceName(devises, item.currency_id)}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">Date Effective</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(item.date_effective)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

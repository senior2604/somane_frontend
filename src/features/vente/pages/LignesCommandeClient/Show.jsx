import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import VenteFormContainer from '../../components/VenteFormContainer';

export default function LignesCommandeClientShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [commandesClient, setCommandesClient] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ligneRes, commandesRes, produitsRes] = await Promise.all([
        apiClient.get(`/ventes/lignes-commande-client/${id}/`),
        apiClient.get('/ventes/commandes-client/'),
        apiClient.get('/produits/')
      ]);
      
      setItem(ligneRes.data);
      setCommandesClient(commandesRes.data || []);
      setProduits(produitsRes.data || []);
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      try {
        await apiClient.delete(`/ventes/lignes-commande-client/${id}/`);
        navigate('/ventes/lignes-commande-client');
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
        <p className="text-gray-600">Ligne non trouvée</p>
        <button onClick={() => navigate('/ventes/lignes-commande-client')} className="text-violet-600 hover:text-violet-800 mt-4">
          Retour à la liste
        </button>
      </div>
    );
  }

  const headerData = { client: getReferenceName(commandesClient, item.commande_client_id), date: '', amounts: [{ label: 'Prix total', value: formatCurrency(item.total_price) }] };

  const customMain = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Commande Client</p>
              <p className="text-lg font-medium text-gray-900">{getReferenceName(commandesClient, item.commande_client_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Produit</p>
              <p className="text-lg font-medium text-gray-900">{getReferenceName(produits, item.product_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantité</p>
              <p className="text-lg font-medium text-gray-900">{item.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Prix Unitaire</p>
              <p className="text-lg font-medium text-gray-900">{formatCurrency(item.unit_price)}</p>
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
              <p className="text-sm text-gray-600">Quantité</p>
              <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Prix Unitaire</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(item.unit_price)}</p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Prix Total</p>
              <p className="text-lg font-bold text-violet-600">{formatCurrency(item.total_price)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <VenteFormContainer
      title={`Ligne #${item.id}`}
      reference={`Ligne ${item.id}`}
      status={'draft'}
      mode="view"
      onBack={() => navigate('/ventes/lignes-commande-client')}
      onEdit={() => navigate(`/ventes/lignes-commande-client/${id}/edit`)}
      onDelete={handleDelete}
      headerData={headerData}
      customMainSection={customMain}
    />
  );
}

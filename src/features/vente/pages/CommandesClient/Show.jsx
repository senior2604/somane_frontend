import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import VenteFormContainer from '../../components/VenteFormContainer';

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

const getInvoiceStatusColor = (status) => {
  const colors = {
    'non_facturee': 'gray',
    'facturee': 'green',
    'partiellement_facturee': 'blue'
  };
  return colors[status] || 'gray';
};

const getDeliveryStatusColor = (status) => {
  const colors = {
    'en_attente': 'gray',
    'en_cours': 'yellow',
    'livree': 'green',
    'partiellement_livree': 'blue'
  };
  return colors[status] || 'gray';
};

export default function CommandesClientShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [devises, setDevises] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemRes, clientsRes, devisesRes, societesRes, utilisateursRes] = await Promise.all([
        apiClient.get(`/ventes/commandes-client/${id}/`),
        apiClient.get('/clients/'),
        apiClient.get('/devises/'),
        apiClient.get('/societes/'),
        apiClient.get('/utilisateurs/')
      ]);
      
      setItem(itemRes.data);
      setClients(clientsRes.data || []);
      setDevises(devisesRes.data || []);
      setSocietes(societesRes.data || []);
      setUtilisateurs(utilisateursRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getReferenceName = (items, id) => {
    const item = items.find(i => i.id === id);
    return item?.name || id;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande?')) {
      try {
        await apiClient.delete(`/ventes/commandes-client/${id}/`);
        navigate('/ventes/commandes-client');
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  if (!item) {
    return <div className="p-6 text-center text-gray-600">Commande non trouvée</div>;
  }

  const headerData = {
    client: getReferenceName(clients, item.partner_id),
    date: formatDate(item.date_order),
    amounts: [{ label: 'Montant total', value: formatCurrency(item.amount_total) }]
  };

  const customMain = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informations Générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium text-gray-900">{getReferenceName(clients, item.partner_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date de Commande</p>
              <p className="font-medium text-gray-900">{formatDate(item.date_order)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Devise</p>
              <p className="font-medium text-gray-900">{getReferenceName(devises, item.currency_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Montant Total</p>
              <p className="font-medium text-gray-900">{formatCurrency(item.amount_total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Société</p>
              <p className="font-medium text-gray-900">{getReferenceName(societes, item.company_id)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Responsable</p>
              <p className="font-medium text-gray-900">{getReferenceName(utilisateurs, item.user_id)}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Statuts</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <p className="text-sm text-gray-500 mb-2">Statut Général</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 w-fit`}>{item.state}</span>
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-500 mb-2">Facturation</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 w-fit`}>{item.invoice_status || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-500 mb-2">Livraison</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 w-fit`}>{item.delivery_status || 'N/A'}</span>
            </div>
          </div>
        </div>

        {item.notes && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">Statut</p>
          <p className="text-lg font-bold text-gray-700">{item.state}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">Montant Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.amount_total)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">Numéro</p>
          <p className="text-lg font-bold text-gray-900">{item.name}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-xs text-gray-500 space-y-2">
          {item.created_at && (
            <>
              <p>Créé le:</p>
              <p className="text-gray-900 font-medium">{formatDate(item.created_at)}</p>
            </>
          )}
          {item.updated_at && (
            <>
              <p className="mt-3">Modifié le:</p>
              <p className="text-gray-900 font-medium">{formatDate(item.updated_at)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <VenteFormContainer
      title={item.name}
      reference={item.name}
      status={item.state}
      date={formatDate(item.date_order)}
      mode="view"
      onBack={() => navigate('/ventes/commandes-client')}
      onEdit={() => navigate(`${id}/edit`)}
      onDelete={handleDelete}
      headerData={headerData}
      customMainSection={customMain}
    />
  );
}

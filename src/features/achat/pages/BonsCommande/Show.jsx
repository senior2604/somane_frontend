import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheck, FiPlus, FiFileText } from 'react-icons/fi';

export default function BonsCommandeShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [devises, setDevises] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bonRes, fournisseurRes, devisesRes, societesRes, utilisateursRes] = await Promise.all([
        apiClient.get(`/achats/bons-commande/${id}/`),
        apiClient.get('/fournisseurs/'),
        apiClient.get('/devises/'),
        apiClient.get('/societes/'),
        apiClient.get('/utilisateurs/')
      ]);
      
      setItem(bonRes.data);
      setFournisseurs(fournisseurRes.data || []);
      setDevises(devisesRes.data || []);
      setSocietes(societesRes.data || []);
      setUtilisateurs(utilisateursRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id]); // id est la seule dépendance ici

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData est maintenant stable grâce à useCallback

  const getReferenceName = (list, id, field = 'name') => {
    const ref = list.find(r => r.id === id);
    return ref ? ref[field] : 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'N/A';
  };

  const getStatusColor = (status) => {
    const colors = {
      'brouillon': 'bg-gray-200 text-gray-800',
      'demande_prix': 'bg-yellow-100 text-yellow-800',
      'envoyer': 'bg-blue-100 text-blue-800',
      'confirmer': 'bg-green-100 text-green-800',
      'annule': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bon ?')) {
      try {
        await apiClient.delete(`/achats/bons-commande/${id}/`);
        navigate('/achats/bons-commande');
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleValidate = () => {
    // Logique de validation/comptabilisation
    alert('Bon de commande validé avec succès !');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  if (!item) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Bon de commande non trouvé</p>
        <button onClick={() => navigate('/achats/bons-commande')} className="text-violet-600 hover:text-violet-800 mt-4">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Barre d'en-tête supérieure */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/achats/bons-commande')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="text-xl" />
            <span className="font-medium">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <FiFileText className="text-gray-400" />
            <h1 className="text-lg font-semibold text-gray-900">Bon de commande</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(item.state)}`}>
            État: {item.state.charAt(0).toUpperCase() + item.state.slice(1)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/achats/bons-commande/${id}/edit`)}
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
      </div>

      {/* En-tête principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-gray-600">N° bon:</span>
                <span className="text-2xl font-bold text-gray-900">{item.name}</span>
              </div>
            </div>
            
            <button
              onClick={handleValidate}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FiCheck className="text-lg" />
              Valider le bon
            </button>
          </div>
        </div>

        {/* Informations générales */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Date de commande</p>
              <p className="text-base font-medium text-gray-900">{formatDate(item.date_order)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Référence</p>
              <p className="text-base font-medium text-gray-900">{item.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Date création</p>
              <p className="text-base font-medium text-gray-900">{formatDate(new Date().toISOString())}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Devise</p>
              <p className="text-base font-medium text-gray-900">
                {getReferenceName(devises, item.currency_id)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Société</p>
              <p className="text-base font-medium text-gray-900">
                {getReferenceName(societes, item.company_id)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal - Tableau des articles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Détails du bon de commande</h2>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acheteur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crédit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getReferenceName(fournisseurs, item.partner_id)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getReferenceName(utilisateurs, item.user_id)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {item.notes || 'Aucune description'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">-</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-red-600">
                    {formatCurrency(item.amount_total)} XOF
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-green-600">
                    0,00 XOF
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bouton Ajouter une ligne */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button className="flex items-center gap-2 text-violet-600 hover:text-violet-800">
            <FiPlus />
            Ajouter une ligne
          </button>
        </div>
      </div>

      {/* Section des totaux et notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <div className="text-gray-700">
              {item.notes ? (
                <p>{item.notes}</p>
              ) : (
                <p className="text-gray-400 italic">Aucune note ajoutée</p>
              )}
            </div>
          </div>
        </div>

        {/* Totaux */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Débit:</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(item.amount_total)} XOF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Crédit:</span>
                <span className="text-lg font-bold text-green-600">0,00 XOF</span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Solde:</span>
                  <span className="text-xl font-bold text-violet-600">{formatCurrency(item.amount_total)} XOF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
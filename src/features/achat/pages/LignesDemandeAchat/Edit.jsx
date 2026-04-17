import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

export default function LignesDemandeAchatEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demandesAchat, setDemandesAchat] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    demande_achat_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    total_price: 0,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ligneRes, demandesRes, produitsRes] = await Promise.all([
        apiClient.get(`/achats/lignes-demande-achat/${id}/`),
        apiClient.get('/achats/demandes-achat/'),
        apiClient.get('/produits/')
      ]);
      
      setFormData(ligneRes.data);
      setDemandesAchat(demandesRes.data || []);
      setProduits(produitsRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    // Recalculer le prix total si quantité ou prix unitaire change
    if (name === 'quantity' || name === 'unit_price') {
      const qty = parseFloat(newFormData.quantity) || 0;
      const price = parseFloat(newFormData.unit_price) || 0;
      newFormData.total_price = qty * price;
    }
    
    setFormData(newFormData);
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiClient.put(`/achats/lignes-demande-achat/${id}/`, formData);
      navigate('/achats/lignes-demande-achat');
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Erreur lors de la modification');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/achats/lignes-demande-achat')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="text-xl" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier Ligne de Demande d'Achat</h1>
          <p className="text-gray-600 mt-1">Modifiez les détails de la ligne</p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demande d'Achat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Demande d'Achat <span className="text-red-500">*</span>
            </label>
            <select
              name="demande_achat_id"
              value={formData.demande_achat_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.demande_achat_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Sélectionnez une demande d'achat</option>
              {demandesAchat.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.demande_achat_id && <p className="text-red-500 text-sm mt-1">{errors.demande_achat_id}</p>}
          </div>

          {/* Produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produit <span className="text-red-500">*</span>
            </label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.product_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Sélectionnez un produit</option>
              {produits.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.product_id && <p className="text-red-500 text-sm mt-1">{errors.product_id}</p>}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
          </div>

          {/* Prix Unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix Unitaire <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.unit_price ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.unit_price && <p className="text-red-500 text-sm mt-1">{errors.unit_price}</p>}
          </div>

          {/* Prix Total (lecture seule) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix Total
            </label>
            <input
              type="number"
              name="total_price"
              value={formData.total_price}
              readOnly
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Ajoutez des notes..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/achats/lignes-demande-achat')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FiSave /> Modifier
          </button>
        </div>
      </form>
    </div>
  );
}

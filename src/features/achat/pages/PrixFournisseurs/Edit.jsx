import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

export default function PrixFournisseursEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    fournisseur_id: '',
    product_id: '',
    price: '',
    currency_id: '',
    min_quantity: '',
    date_effective: '',
    notes: ''
  });

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
      
      setFormData(prixRes.data);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      await apiClient.put(`/achats/prix-fournisseurs/${id}/`, formData);
      navigate('/achats/prix-fournisseurs');
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
          onClick={() => navigate('/achats/prix-fournisseurs')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="text-xl" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier Prix Fournisseur</h1>
          <p className="text-gray-600 mt-1">Modifiez les détails du prix</p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fournisseur <span className="text-red-500">*</span>
            </label>
            <select
              name="fournisseur_id"
              value={formData.fournisseur_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.fournisseur_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Sélectionnez un fournisseur</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {errors.fournisseur_id && <p className="text-red-500 text-sm mt-1">{errors.fournisseur_id}</p>}
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

          {/* Prix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>

          {/* Devise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise <span className="text-red-500">*</span>
            </label>
            <select
              name="currency_id"
              value={formData.currency_id}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.currency_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Sélectionnez une devise</option>
              {devises.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.currency_id && <p className="text-red-500 text-sm mt-1">{errors.currency_id}</p>}
          </div>

          {/* Quantité Minimale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité Minimale
            </label>
            <input
              type="number"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Date Effective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Effective <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date_effective"
              value={formData.date_effective}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
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
            onClick={() => navigate('/achats/prix-fournisseurs')}
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

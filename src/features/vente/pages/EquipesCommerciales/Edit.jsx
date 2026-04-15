import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { FiSave, FiArrowLeft } from 'react-icons/fi';

export default function EquipesCommercialesEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    team_lead_id: '',
    region: '',
    sales_target: '',
    commission_rate: '',
    notes: ''
  });

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
      
      setFormData(equipeRes.data);
      setUtilisateurs(utilisateursRes.data || []);
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
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      await apiClient.put(`/ventes/equipes-commerciales/${id}/`, formData);
      navigate('/ventes/equipes-commerciales');
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
  const headerData = { client: '', date: '', amounts: [] };

  const customMain = (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Équipe Nord" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`} required />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chef d'Équipe <span className="text-red-500">*</span></label>
          <select name="team_lead_id" value={formData.team_lead_id} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent ${errors.team_lead_id ? 'border-red-500' : 'border-gray-300'}`} required>
            <option value="">Sélectionnez un chef d'équipe</option>
            {utilisateurs.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
          {errors.team_lead_id && <p className="text-red-500 text-sm mt-1">{errors.team_lead_id}</p>}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={() => navigate('/ventes/equipes-commerciales')} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2 disabled:opacity-50"><FiSave /> Modifier</button>
      </div>
    </form>
  );

  return (
    <VenteFormContainer
      title="Modifier Équipe Commerciale"
      reference={formData.name}
      status={'draft'}
      mode="edit"
      onBack={() => navigate('/ventes/equipes-commerciales')}
      onSave={() => handleSubmit()}
      headerData={headerData}
      customMainSection={customMain}
    />
  );
}

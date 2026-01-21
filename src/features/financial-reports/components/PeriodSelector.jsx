// src/features/financial-reports/pages/PeriodsList.jsx
import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

export default function PeriodsList() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date_from: '',
    date_to: '',
    state: 'draft',
    is_actual: true,
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const response = await apiClient.get('financial-reports/periods/');
      const data = Array.isArray(response) ? response : response.results || [];
      setPeriods(data);
    } catch (err) {
      console.error('Erreur chargement périodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPeriod) {
        await apiClient.put(`financial-reports/periods/${editingPeriod.id}/`, formData);
      } else {
        await apiClient.post('financial-reports/periods/', formData);
      }
      
      setShowModal(false);
      setEditingPeriod(null);
      setFormData({ name: '', date_from: '', date_to: '', state: 'draft', is_actual: true });
      loadPeriods();
    } catch (err) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (period) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      date_from: period.date_from,
      date_to: period.date_to,
      state: period.state,
      is_actual: period.is_actual,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette période ?')) return;
    
    try {
      await apiClient.delete(`financial-reports/periods/${id}/`);
      loadPeriods();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Périodes financières</h1>
          <p className="text-gray-600 mt-1">Gérez les exercices et périodes comptables</p>
        </div>
        <button
          onClick={() => {
            setEditingPeriod(null);
            setFormData({ name: '', date_from: '', date_to: '', state: 'draft', is_actual: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <FiPlus size={20} />
          Nouvelle période
        </button>
      </div>

      {/* Liste des périodes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date début</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date fin</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">État</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{period.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(period.date_from).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(period.date_to).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      period.is_actual
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {period.is_actual ? 'Réel' : 'Prévisionnel'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      period.state === 'validated'
                        ? 'bg-green-100 text-green-700'
                        : period.state === 'archived'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {period.state === 'draft'
                      ? 'Brouillon'
                      : period.state === 'validated'
                      ? 'Validé'
                      : 'Archivé'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(period)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(period.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingPeriod ? 'Modifier la période' : 'Nouvelle période'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la période *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: Exercice 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={formData.date_from}
                    onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin *
                  </label>
                  <input
                    type="date"
                    value={formData.date_to}
                    onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    État
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="validated">Validé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.is_actual}
                    onChange={(e) => setFormData({ ...formData, is_actual: e.target.value === 'true' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="true">Réel</option>
                    <option value="false">Prévisionnel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              {editingPeriod ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</div> );
}
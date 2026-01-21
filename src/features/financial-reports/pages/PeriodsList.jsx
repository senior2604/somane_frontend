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
      alert('Erreur lors de la sauvegarde : ' + (err.message || 'Vérifiez les données'));
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
    if (!window.confirm('Supprimer cette période ? Cette action est irréversible.')) return;

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
          <p className="text-gray-600 mt-1">Gérez les exercices, trimestres et mois comptables</p>
        </div>
        <button
          onClick={() => {
            setEditingPeriod(null);
            setFormData({ name: '', date_from: '', date_to: '', state: 'draft', is_actual: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <FiPlus size={18} />
          Nouvelle période
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Début</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fin</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">État</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{period.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(period.date_from).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(period.date_to).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      period.is_actual ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {period.is_actual ? 'Réel' : 'Prévisionnel'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      period.state === 'validated' ? 'bg-green-100 text-green-800' :
                      period.state === 'archived' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {period.state === 'draft' ? 'Brouillon' :
                     period.state === 'validated' ? 'Validé' : 'Archivé'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => handleEdit(period)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(period.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan="6" className="py-12 text-center text-gray-500">
                  Aucune période créée pour le moment
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-6">
              {editingPeriod ? 'Modifier la période' : 'Nouvelle période'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la période *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Ex: Exercice comptable 2025"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="true">Réel</option>
                    <option value="false">Prévisionnel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <FiSave size={18} />
                  {editingPeriod ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
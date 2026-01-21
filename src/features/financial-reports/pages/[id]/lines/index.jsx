import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiPlus, FiEdit2, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { apiClient } from '../../../../../services/apiClient';

export default function ReportLines() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  const [formData, setFormData] = useState({
    parent: '',
    code: '',
    name: '',
    sequence: 10,
    line_type: 'header',
    sign: 1,
  });

  useEffect(() => {
    loadLines();
  }, [id]);

  const loadLines = async () => {
    try {
      const response = await apiClient.get(`financial-reports/reports/${id}/lines/`);
      const data = Array.isArray(response) ? response : response.results || [];
      // Tri par sequence pour affichage hiérarchique
      const sorted = data.sort((a, b) => a.sequence - b.sequence);
      setLines(sorted);
    } catch (err) {
      console.error('Erreur chargement lignes:', err);
      setError('Impossible de charger les lignes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, report: id };
      if (editingLine) {
        await apiClient.put(`financial-reports/lines/${editingLine.id}/`, payload);
      } else {
        await apiClient.post('financial-reports/lines/', payload);
      }
      setShowModal(false);
      setEditingLine(null);
      setFormData({
        parent: '',
        code: '',
        name: '',
        sequence: 10,
        line_type: 'header',
        sign: 1,
      });
      loadLines();
    } catch (err) {
      alert('Erreur sauvegarde : ' + (err.message || 'Vérifiez les données'));
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      parent: line.parent || '',
      code: line.code,
      name: line.name,
      sequence: line.sequence,
      line_type: line.line_type,
      sign: line.sign,
    });
    setShowModal(true);
  };

  const handleDelete = async (lineId) => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    try {
      await apiClient.delete(`financial-reports/lines/${lineId}/`);
      loadLines();
    } catch (err) {
      alert('Erreur suppression');
    }
  };

  const handleMoveUp = async (line) => {
    if (line.sequence <= 10) return;
    try {
      await apiClient.patch(`financial-reports/lines/${line.id}/`, {
        sequence: line.sequence - 10,
      });
      loadLines();
    } catch (err) {
      alert('Erreur déplacement');
    }
  };

  const handleMoveDown = async (line) => {
    try {
      await apiClient.patch(`financial-reports/lines/${line.id}/`, {
        sequence: line.sequence + 10,
      });
      loadLines();
    } catch (err) {
      alert('Erreur déplacement');
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Chargement des lignes...</div>;
  if (error) return <div className="p-8 text-red-600 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lignes du rapport</h1>
          <p className="text-gray-600 mt-1">Définissez la structure de votre état financier</p>
        </div>
        <button
          onClick={() => {
            setEditingLine(null);
            setFormData({
              parent: '',
              code: '',
              name: '',
              sequence: lines.length * 10 + 10,
              line_type: 'header',
              sign: 1,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <FiPlus size={18} />
          Nouvelle ligne
        </button>
      </div>

      {/* Tableau hiérarchique */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom / Libellé</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Signe</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ordre</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {lines.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-gray-500">
                  Aucune ligne définie pour ce rapport
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-600">{line.code}</td>
                  <td className="px-6 py-4">
                    <div style={{ paddingLeft: `${(line.parent ? 2 : 0) * 20}px` }}>
                      {line.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      line.line_type === 'header' ? 'bg-gray-100 text-gray-800' :
                      line.line_type === 'account' ? 'bg-blue-100 text-blue-800' :
                      line.line_type === 'formula' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {line.line_type === 'header' ? 'Titre' :
                       line.line_type === 'account' ? 'Poste comptable' :
                       line.line_type === 'formula' ? 'Formule' : 'Total'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={line.sign === 1 ? 'text-green-600' : 'text-red-600'}>
                      {line.sign === 1 ? '+' : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {line.sequence}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleEdit(line)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleMoveUp(line)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                        disabled={line.sequence <= 10}
                        title="Monter"
                      >
                        <FiArrowUp size={18} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(line)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Descendre"
                      >
                        <FiArrowDown size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(line.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-6">
              {editingLine ? 'Modifier la ligne' : 'Nouvelle ligne'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                  placeholder="Ex: CURRENT_ASSETS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom / Libellé *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Ex: Actifs courants"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de ligne *
                  </label>
                  <select
                    value={formData.line_type}
                    onChange={(e) => setFormData({ ...formData, line_type: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="header">Titre de section</option>
                    <option value="account">Poste comptable</option>
                    <option value="formula">Formule de calcul</option>
                    <option value="total">Sous-total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signe
                  </label>
                  <select
                    value={formData.sign}
                    onChange={(e) => setFormData({ ...formData, sign: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="1">+ (positif)</option>
                    <option value="-1">- (négatif)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordre (sequence)
                  </label>
                  <input
                    type="number"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    min="10"
                    step="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ligne parent (pour hiérarchie)
                  </label>
                  <select
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Aucune (niveau racine)</option>
                    {lines
                      .filter(l => l.line_type === 'header')
                      .map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name} ({line.code})
                        </option>
                      ))}
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
                  {editingLine ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
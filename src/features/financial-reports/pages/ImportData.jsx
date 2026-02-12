// src/features/financial-reports/pages/ImportData.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';  // ← LIGNE 2 : IMPORT OBLIGATOIRE
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

export default function ImportData() {
  const navigate = useNavigate();  // ← LIGNE 7 : DÉCLARATION

  const [dataSources, setDataSources] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);  // ← LIGNE 13 : NOUVEAU pour le bouton
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [uploadData, setUploadData] = useState({
    name: '',
    data_source: '',
    period: '',
    file: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sourcesRes, periodsRes, importsRes] = await Promise.all([
        apiClient.get('financial-reports/data-sources/'),
        apiClient.get('financial-reports/periods/'),
        apiClient.get('financial-reports/raw-imports/'),
      ]);

      setDataSources(sourcesRes.results || sourcesRes || []);
      setPeriods(periodsRes.results || periodsRes || []);
      setImports(importsRes.results || importsRes || []);
    } catch (err) {
      setErrorMessage('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file });
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!uploadData.name.trim()) return setErrorMessage('Le nom est obligatoire');
    if (!uploadData.data_source) return setErrorMessage('Choisissez une source');
    if (!uploadData.period) return setErrorMessage('Choisissez une période');
    if (!uploadData.file) return setErrorMessage('Sélectionnez un fichier');

    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', uploadData.name);
    formData.append('data_source', uploadData.data_source);
    formData.append('period', uploadData.period);
    formData.append('file', uploadData.file);

    try {
      const response = await apiClient.upload('financial-reports/raw-imports/', formData);
      setSuccessMessage('Import créé avec succès !');
      setTimeout(() => setSuccessMessage(''), 5000);

      // Optionnel : redirection vers le détail du nouvel import
      // Si ton API renvoie l’ID créé dans response, utilise-le :
      // if (response?.id) navigate(`/financial-reports/import/${response.id}`);
      // Sinon recharge simplement
      loadData();
      setUploadData({ name: '', data_source: '', period: '', file: null });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Erreur inconnue';
      setErrorMessage(`Erreur lors de l’import : ${msg}`);
    } finally {
      setSubmitting(false);
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
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import de données</h1>
        <p className="text-gray-600 mt-2">Chargez vos écritures comptables depuis Excel ou CSV</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-3">
          <FiCheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-3">
          <FiAlertCircle size={20} />
          {errorMessage}
        </div>
      )}

      {/* Formulaire */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">Nouvel import</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'import *
              </label>
              <input
                type="text"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Ex: Balance Janvier 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source de données *
              </label>
              <select
                value={uploadData.data_source}
                onChange={(e) => setUploadData({ ...uploadData, data_source: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Sélectionner une source...</option>
                {dataSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({source.source_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Période *
              </label>
              <select
                value={uploadData.period}
                onChange={(e) => setUploadData({ ...uploadData, period: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Sélectionner une période...</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier (Excel ou CSV) *
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                {uploadData.file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Fichier sélectionné : {uploadData.file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting || loading}
              className="flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <FiUpload size={18} />
              {submitting ? 'Import en cours...' : 'Lancer l’import'}
            </button>
          </div>
        </form>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">Historique des imports</h2>

        {imports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun import effectué pour le moment</p>
        ) : (
          <div className="space-y-4">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="flex items-center justify-between p-5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <FiFile size={28} className="text-gray-400" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{imp.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(imp.import_date).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                      imp.state === 'processed' ? 'bg-green-100 text-green-800' :
                      imp.state === 'error' ? 'bg-red-100 text-red-800' :
                      imp.state === 'validated' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {imp.state === 'processed' && <FiCheckCircle size={16} />}
                    {imp.state === 'error' && <FiAlertCircle size={16} />}
                    {imp.state === 'draft' ? 'Brouillon' :
                     imp.state === 'validated' ? 'Validé' :
                     imp.state === 'processed' ? 'Traité' : 'Erreur'}
                  </span>
                  <button 
                    onClick={() => navigate(`/financial-reports/import/${imp.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Voir détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
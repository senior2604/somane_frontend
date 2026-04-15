// src/features/financial-reports/pages/SettingsPage.jsx
import { useEffect, useState } from 'react';
import { FiSave, FiSettings, FiDatabase, FiCheckCircle } from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

export default function SettingsPage() {
  const [dataSources, setDataSources] = useState([]);
  const [validationRules, setValidationRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('data-sources');

  const [newDataSource, setNewDataSource] = useState({
    name: '',
    source_type: 'excel_8cols',
    file_encoding: 'UTF-8',
    delimiter: ',',
    header_row: 1,
    start_data_row: 2,
    skip_footer_rows: 0,
    active: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [sourcesRes, rulesRes] = await Promise.all([
        apiClient.get('financial-reports/data-sources/'),
        apiClient.get('financial-reports/validation-rules/'),
      ]);

      setDataSources(sourcesRes.results || sourcesRes || []);
      setValidationRules(rulesRes.results || rulesRes || []);
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataSource = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('financial-reports/data-sources/', {
        ...newDataSource,
        column_mapping: {}, // JSON vide par défaut
      });
      setSuccessMessage('Source de données créée avec succès !');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadSettings();
      setNewDataSource({
        name: '',
        source_type: 'excel_8cols',
        file_encoding: 'UTF-8',
        delimiter: ',',
        header_row: 1,
        start_data_row: 2,
        skip_footer_rows: 0,
        active: true,
      });
    } catch (err) {
      alert('Erreur création : ' + (err.message || 'Vérifiez les données'));
    }
  };

  const handleDeleteDataSource = async (id) => {
    if (!window.confirm('Supprimer cette source ?')) return;
    try {
      await apiClient.delete(`financial-reports/data-sources/${id}/`);
      loadSettings();
    } catch (err) {
      alert('Erreur suppression');
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
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-2">Configuration globale du module États Financiers</p>
      </div>

      {/* Message succès */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-3">
          <FiCheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Onglets */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('data-sources')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'data-sources'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiDatabase size={18} />
            Sources de données
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'validation'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiCheckCircle size={18} />
            Règles de validation
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiSettings size={18} />
            Général
          </button>
        </div>

        <div className="p-8">
          {/* Sources de données */}
          {activeTab === 'data-sources' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Sources de données configurées</h3>
                {dataSources.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune source configurée</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dataSources.map((source) => (
                      <div
                        key={source.id}
                        className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-medium text-lg text-gray-900">{source.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {source.source_type === 'excel_8cols' ? 'Excel 8 colonnes' :
                               source.source_type === 'csv_8cols' ? 'CSV 8 colonnes' : 'Largeur fixe'}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              source.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {source.active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteDataSource(source.id)}
                          className="text-sm text-red-600 hover:text-red-800 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire création */}
              <div className="border-t pt-8">
                <h3 className="text-xl font-semibold mb-6">Ajouter une nouvelle source</h3>
                <form onSubmit={handleCreateDataSource} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom de la source *
                      </label>
                      <input
                        type="text"
                        value={newDataSource.name}
                        onChange={(e) => setNewDataSource({ ...newDataSource, name: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="Ex: Excel Balance 8 colonnes"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de fichier *
                      </label>
                      <select
                        value={newDataSource.source_type}
                        onChange={(e) => setNewDataSource({ ...newDataSource, source_type: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="excel_8cols">Excel 8 colonnes</option>
                        <option value="csv_8cols">CSV 8 colonnes</option>
                        <option value="fixed_width">Largeur fixe</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Encodage
                      </label>
                      <select
                        value={newDataSource.file_encoding}
                        onChange={(e) => setNewDataSource({ ...newDataSource, file_encoding: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="UTF-8">UTF-8</option>
                        <option value="ISO-8859-1">ISO-8859-1</option>
                        <option value="Windows-1252">Windows-1252</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Délimiteur (CSV uniquement)
                      </label>
                      <input
                        type="text"
                        value={newDataSource.delimiter}
                        onChange={(e) => setNewDataSource({ ...newDataSource, delimiter: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder=", ou ;"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                    >
                      <FiSave size={18} />
                      Ajouter la source
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Règles de validation */}
          {activeTab === 'validation' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Règles de validation</h3>
              {validationRules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune règle configurée</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {validationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-lg text-gray-900">{rule.name}</h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            rule.severity === 'blocking' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {rule.severity === 'blocking' ? 'Bloquant' : 'Avertissement'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{rule.error_message}</p>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Général */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              <h3 className="text-xl font-semibold mb-6">Paramètres généraux</h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-xl">
                  <div>
                    <h4 className="font-medium text-lg text-gray-900">Validation automatique des imports</h4>
                    <p className="text-gray-600 mt-1">Valider automatiquement après chaque import</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-xl">
                  <div>
                    <h4 className="font-medium text-lg text-gray-900">Calcul automatique des rapports</h4>
                    <p className="text-gray-600 mt-1">Recalculer tous les rapports après import</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 border border-gray-200 rounded-xl">
                  <div>
                    <h4 className="font-medium text-lg text-gray-900">Archivage automatique</h4>
                    <p className="text-gray-600 mt-1">Archiver les périodes après 12 mois d'inactivité</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button className="flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
                  <FiSave size={18} />
                  Enregistrer les paramètres
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
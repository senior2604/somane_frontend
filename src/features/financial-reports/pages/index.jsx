import { useEffect, useState } from 'react';
import { FiEdit2, FiEye, FiFilter, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';

export default function FinancialReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('financial-reports/financial-reports/');
      const data = Array.isArray(response) ? response : response.results || response.data || [];
      setReports(data);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement rapports:', err);
      setError('Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return;
    
    try {
      await apiClient.delete(`financial-reports/financial-reports/${id}/`);
      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.report_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">États Financiers</h1>
          <p className="text-gray-600 mt-1">Gérez tous vos rapports financiers</p>
        </div>
        <Link
          to="/financial-reports/new"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <FiPlus size={20} />
          Nouveau rapport
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" size={20} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="balance_sheet">Bilan</option>
              <option value="profit_loss">Compte de résultat</option>
              <option value="cash_flow">Flux de trésorerie</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des rapports */}
      {filteredReports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">Aucun rapport trouvé</p>
          <Link
            to="/financial-reports/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <FiPlus size={20} />
            Créer le premier rapport
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono">{report.code}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {report.active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    report.report_type === 'profit_loss'
                      ? 'bg-green-100 text-green-800'
                      : report.report_type === 'balance_sheet'
                      ? 'bg-blue-100 text-blue-800'
                      : report.report_type === 'cash_flow'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {report.report_type === 'profit_loss'
                    ? 'Compte de résultat'
                    : report.report_type === 'balance_sheet'
                    ? 'Bilan'
                    : report.report_type === 'cash_flow'
                    ? 'Flux de trésorerie'
                    : 'Personnalisé'}
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/financial-reports/${report.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FiEye size={16} />
                  Voir
                </Link>
                <Link
                  to={`/financial-reports/${report.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <FiEdit2 size={16} />
                  Modifier
                </Link>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistiques */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-violet-600">{reports.length}</p>
            <p className="text-sm text-gray-600">Total rapports</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {reports.filter(r => r.report_type === 'balance_sheet').length}
            </p>
            <p className="text-sm text-gray-600">Bilans</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {reports.filter(r => r.report_type === 'profit_loss').length}
            </p>
            <p className="text-sm text-gray-600">Comptes de résultat</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {reports.filter(r => r.report_type === 'cash_flow').length}
            </p>
            <p className="text-sm text-gray-600">Flux de trésorerie</p>
          </div>
        </div>
      </div>
    </div>
  );
}
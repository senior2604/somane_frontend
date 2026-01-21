// src/features/financial-reports/pages/[id]/page.jsx
import { useEffect, useState } from 'react';
import { FiChevronRight, FiDownload, FiEdit2, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient'; // ← 4 niveaux au lieu de 3

// ... reste du code identique

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [lines, setLines] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReportDetails();
  }, [id]);

  const loadReportDetails = async () => {
    try {
      setLoading(true);
      
      // Charger le rapport
      const reportData = await apiClient.get(`financial-reports/financial-reports/${id}/`);
      setReport(reportData);
      
      // Charger les lignes
      const linesData = await apiClient.get(`financial-reports/lines/?report=${id}`);
      setLines(Array.isArray(linesData) ? linesData : linesData.results || []);
      
      // Charger les colonnes
      const columnsData = await apiClient.get(`financial-reports/columns/?report=${id}`);
      setColumns(Array.isArray(columnsData) ? columnsData : columnsData.results || []);
      
      setError(null);
    } catch (err) {
      console.error('Erreur chargement détails:', err);
      setError('Impossible de charger les détails du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return;
    
    try {
      await apiClient.delete(`financial-reports/financial-reports/${id}/`);
      navigate('/financial-reports');
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        Rapport non trouvé
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{report.name}</h1>
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
            <p className="text-gray-600 font-mono">{report.code}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiPrinter size={18} />
              Imprimer
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
              <FiDownload size={18} />
              Exporter
            </button>
            <Link
              to={`/financial-reports/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              <FiEdit2 size={18} />
              Modifier
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <FiTrash2 size={18} />
              Supprimer
            </button>
          </div>
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">Type de rapport</p>
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
          <div>
            <p className="text-sm text-gray-600 mb-1">Séquence</p>
            <p className="text-lg font-semibold">{report.sequence}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Entreprise</p>
            <p className="text-lg font-semibold">{report.company || 'Toutes'}</p>
          </div>
        </div>
      </div>

      {/* Colonnes du rapport */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Colonnes du rapport</h2>
        {columns.length === 0 ? (
          <p className="text-gray-500">Aucune colonne définie</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Label</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Monétaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {columns.map((col) => (
                  <tr key={col.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{col.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{col.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {col.column_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{col.expression_label}</td>
                    <td className="px-4 py-3 text-center">
                      {col.is_monetary ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lignes du rapport */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Lignes du rapport</h2>
          <span className="text-sm text-gray-600">{lines.length} ligne(s)</span>
        </div>
        
        {lines.length === 0 ? (
          <p className="text-gray-500">Aucune ligne définie</p>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-shrink-0 w-8 text-center text-sm text-gray-500">
                  {line.sequence}
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      line.line_type === 'header'
                        ? 'bg-purple-100 text-purple-700'
                        : line.line_type === 'account'
                        ? 'bg-blue-100 text-blue-700'
                        : line.line_type === 'formula'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {line.line_type}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{line.name}</p>
                  <p className="text-sm font-mono text-gray-500">{line.code}</p>
                </div>
                <div className="flex-shrink-0">
                  {line.sign === 1 ? (
                    <span className="text-green-600 font-semibold">+</span>
                  ) : (
                    <span className="text-red-600 font-semibold">−</span>
                  )}
                </div>
                <FiChevronRight className="text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
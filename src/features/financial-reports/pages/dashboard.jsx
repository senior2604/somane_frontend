import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';

export default function FinancialReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    bilanCount: 0,
    crCount: 0,
    latestReport: null,
  });

  useEffect(() => {
    const loadReports = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError("Vous n'êtes pas connecté.");
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Chargement des rapports financiers...');
        console.log('apiClient:', apiClient); // Debug
        
        const response = await apiClient.get('financial-reports/financial-reports/');
        
        console.log('📦 Réponse complète:', response);
        
        // Extraire les rapports selon différentes structures possibles
        let realReports = [];
        
        if (Array.isArray(response)) {
          realReports = response;
        } else if (response?.results) {
          realReports = response.results;
        } else if (response?.data) {
          realReports = response.data;
        }
        
        console.log('✅ Rapports extraits:', realReports);
        
        setReports(realReports);
        
        // Calculer les statistiques
        const totalReports = realReports.length;
        const bilanCount = realReports.filter(r => r.report_type === 'balance_sheet').length;
        const crCount = realReports.filter(r => r.report_type === 'profit_loss').length;
        const latestReport = realReports.length > 0 ? realReports[0] : null;
        
        setStats({
          totalReports,
          bilanCount,
          crCount,
          latestReport
        });
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur lors du chargement:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des rapports');
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="text-2xl mb-4">Erreur</p>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Tableau de bord États Financiers</h1>

      {/* KPI réels calculés à partir des données */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Nombre total de rapports</h3>
          <p className="text-4xl font-bold text-violet-700 mt-2">{stats.totalReports}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Bilans créés</h3>
          <p className="text-4xl font-bold text-blue-700 mt-2">{stats.bilanCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Comptes de résultat</h3>
          <p className="text-4xl font-bold text-green-700 mt-2">{stats.crCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Dernier rapport</h3>
          <p className="text-xl font-semibold mt-2">
            {stats.latestReport 
              ? stats.latestReport.name 
              : "Aucun rapport"}
          </p>
          {stats.latestReport && (
            <p className="text-sm text-gray-500">
              {new Date(stats.latestReport.updated_at || stats.latestReport.created_at).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      {/* Derniers rapports réels */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Derniers rapports créés</h2>
          <Link 
            to="/financial-reports/new" 
            className="btn btn-primary px-6 py-2"
          >
            + Nouveau rapport
          </Link>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xl text-gray-600 mb-4">
              Aucun rapport financier créé pour le moment
            </p>
            <Link 
              to="/financial-reports/new" 
              className="btn btn-outline btn-primary"
            >
              Créer mon premier rapport
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="table w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-4 px-6 text-left">Nom</th>
                  <th className="py-4 px-6 text-left">Code</th>
                  <th className="py-4 px-6 text-left">Type</th>
                  <th className="py-4 px-6 text-left">Créé le</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.slice(0, 5).map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium">{report.name}</td>
                    <td className="py-4 px-6 font-mono text-gray-600">{report.code}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        report.report_type === 'profit_loss' 
                          ? 'bg-green-100 text-green-800' 
                          : report.report_type === 'balance_sheet'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}>
                        {report.report_type === 'profit_loss' ? 'Compte de résultat' :
                         report.report_type === 'balance_sheet' ? 'Bilan' :
                         report.report_type === 'cash_flow' ? 'Flux de trésorerie' : 'Personnalisé'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(report.created_at || report.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link 
                        to={`/financial-reports/${report.id}`}
                        className="btn btn-sm btn-info mr-2"
                      >
                        Voir
                      </Link>
                      <Link 
                        to={`/financial-reports/${report.id}/edit`}
                        className="btn btn-sm btn-outline btn-warning"
                      >
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-4">
        <Link 
          to="/financial-reports/new"
          className="btn btn-primary px-8 py-3"
        >
          Créer un nouveau rapport
        </Link>
        <button className="btn btn-outline btn-success px-8 py-3">
          Calculer tous les rapports
        </button>
        <button className="btn btn-outline btn-info px-8 py-3">
          Importer données comptables
        </button>
      </div>
    </div>
  );
}
// C:\python\django\somane_fronten\somane_frontend\src\features\financial-reports\pages\dashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiFileText,
  FiFilter,
  FiGrid,
  FiPieChart,
  FiPlus,
  FiRefreshCcw,
  FiSearch,
  FiTrendingUp,
  FiX
} from 'react-icons/fi';
import { apiClient } from '../../../services/apiClient';

const COLORS = ['#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#0f766e', '#db2777', '#334155'];

const REPORT_TYPE_META = {
  balance_sheet: { label: 'Bilan', badge: 'bg-blue-100 text-blue-800', accent: '#2563eb' },
  profit_loss: { label: 'Compte de resultat', badge: 'bg-green-100 text-green-800', accent: '#10b981' },
  cash_flow: { label: 'Flux de tresorerie', badge: 'bg-teal-100 text-teal-800', accent: '#0f766e' },
  custom: { label: 'Personnalise', badge: 'bg-purple-100 text-purple-800', accent: '#7c3aed' }
};

const getTypeMeta = (type) => REPORT_TYPE_META[type] || REPORT_TYPE_META.custom;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const isRecent = (report) => {
  const date = new Date(report.updated_at || report.created_at || 0);
  if (Number.isNaN(date.getTime())) return false;
  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return days <= 7;
};

const PieChartView = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = -90;
  const polarToCartesian = (cx, cy, radius, angle) => {
    const radians = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  };
  const arc = (cx, cy, radius, start, end) => {
    const startPoint = polarToCartesian(cx, cy, radius, end);
    const endPoint = polarToCartesian(cx, cy, radius, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y} Z`;
  };

  if (total === 0) {
    return <div className="h-44 flex items-center justify-center text-sm text-gray-500">Aucune donnee a afficher.</div>;
  }

  return (
    <div className="h-44 grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
      <svg viewBox="0 0 220 220" className="w-full h-40">
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const endAngle = startAngle + angle;
          const path = arc(110, 110, 94, startAngle, endAngle);
          startAngle = endAngle;
          return <path key={item.name} d={path} fill={item.color || COLORS[index % COLORS.length]} />;
        })}
        <circle cx="110" cy="110" r="54" fill="white" />
        <text x="110" y="106" textAnchor="middle" className="fill-gray-500 text-xs">Total</text>
        <text x="110" y="126" textAnchor="middle" className="fill-gray-900 text-sm font-semibold">{total}</text>
      </svg>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
              <span className="text-gray-600 truncate">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChartView = ({ data }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="h-44 flex items-end gap-4 px-3 pt-5 pb-3">
      {data.map((item, index) => (
        <div key={item.name} className="h-full flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
          <div className="text-xs font-semibold text-gray-900">{item.value}</div>
          <div className="w-full h-full flex items-end justify-center">
            <div
              className="w-full max-w-16 rounded-t"
              style={{ height: `${Math.max((item.value / max) * 100, 4)}%`, backgroundColor: item.color || COLORS[index % COLORS.length] }}
            />
          </div>
          <div className="text-xs text-gray-600 text-center truncate w-full">{item.name}</div>
        </div>
      ))}
    </div>
  );
};

const MonthlyTrendChart = ({ data }) => {
  const width = 760;
  const height = 180;
  const padding = 36;
  const max = Math.max(...data.map((item) => item.value), 1);
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => ({
    ...item,
    x: padding + index * step,
    y: height - padding - (item.value / max) * (height - padding * 2)
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;

  if (!data.some((item) => item.value > 0)) {
    return <div className="h-44 flex items-center justify-center text-sm text-gray-500">Aucune donnee a afficher.</div>;
  }

  return (
    <div className="h-44">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + line * ((height - padding * 2) / 3);
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />;
        })}
        <path d={areaPath} fill="#7c3aed" opacity="0.12" />
        <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.name}>
            <circle cx={point.x} cy={point.y} r="5" fill="#7c3aed" />
            <text x={point.x} y={height - 10} textAnchor="middle" className="fill-gray-500 text-xs">{point.name}</text>
            <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-gray-900 text-xs font-semibold">{point.value}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ChartTypeButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-8 px-3 border rounded text-xs font-medium flex items-center gap-2 transition-colors ${
      active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const KpiCard = ({ label, value, detail, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group bg-purple-700 text-white px-4 py-4 text-left shadow-sm transition-all hover:bg-purple-800 hover:-translate-y-0.5 w-full"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-purple-100">{label}</p>
        <p className="mt-1 text-2xl font-bold truncate">{value}</p>
        <p className="mt-1 text-xs text-purple-100 truncate">{detail}</p>
      </div>
      <Icon size={22} className="text-purple-100 transition-transform group-hover:scale-110 shrink-0" />
    </div>
  </button>
);

export default function FinancialReportsDashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [chartType, setChartType] = useState('pie');
  const [reportsPerPage, setReportsPerPage] = useState(6);
  const [page, setPage] = useState(1);

  const loadReports = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError("Vous n'etes pas connecte.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('financial-reports/financial-reports/');
      const realReports = unwrapList(response);
      setReports(realReports);
    } catch (err) {
      console.error('Erreur lors du chargement des rapports financiers:', err);
      setError(err?.message || 'Une erreur est survenue lors du chargement des rapports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (typeFilter !== 'all') {
      list = list.filter((report) => (report.report_type || 'custom') === typeFilter);
    }
    if (searchText.trim()) {
      const value = searchText.trim().toLowerCase();
      list = list.filter((report) => (
        `${report.name || ''} ${report.code || ''}`.toLowerCase().includes(value)
      ));
    }
    return list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  }, [reports, typeFilter, searchText]);

  const totalPages = Math.max(Math.ceil(filteredReports.length / reportsPerPage), 1);
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredReports.length ? (currentPage - 1) * reportsPerPage : 0;
  const endIndex = Math.min(startIndex + reportsPerPage, filteredReports.length);
  const displayedReports = filteredReports.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, searchText, reportsPerPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const totalReports = reports.length;
    const bilanCount = reports.filter((r) => r.report_type === 'balance_sheet').length;
    const crCount = reports.filter((r) => r.report_type === 'profit_loss').length;
    const cashFlowCount = reports.filter((r) => r.report_type === 'cash_flow').length;
    const recentCount = reports.filter(isRecent).length;
    const latestReport = reports.length
      ? [...reports].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0]
      : null;
    return { totalReports, bilanCount, crCount, cashFlowCount, recentCount, latestReport };
  }, [reports]);

  const typeChartData = useMemo(() => ([
    { name: 'Bilans', value: stats.bilanCount, color: REPORT_TYPE_META.balance_sheet.accent },
    { name: 'Comptes de resultat', value: stats.crCount, color: REPORT_TYPE_META.profit_loss.accent },
    { name: 'Flux de tresorerie', value: stats.cashFlowCount, color: REPORT_TYPE_META.cash_flow.accent },
    { name: 'Personnalises', value: reports.filter((r) => !r.report_type || r.report_type === 'custom').length, color: REPORT_TYPE_META.custom.accent }
  ].filter((item) => item.value > 0)), [stats, reports]);

  const monthlyTrendData = useMemo(() => {
    const buckets = {};
    reports.forEach((report) => {
      const date = new Date(report.created_at || report.updated_at || 0);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.keys(buckets)
      .sort()
      .slice(-6)
      .map((key) => {
        const [year, month] = key.split('-');
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
        return { name: label, value: buckets[key] };
      });
  }, [reports]);

  const clearFilters = () => {
    setTypeFilter('all');
    setSearchText('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2 max-w-xl mx-auto">
          <FiAlertCircle size={16} />
          {error}
        </div>
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={loadReports}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 rounded"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-800 overflow-x-hidden">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/financial-reports/new')}
                className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1 whitespace-nowrap"
              >
                <FiPlus size={12} />
                Nouveau rapport
              </button>
              <h1
                className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200 truncate"
                onClick={loadReports}
                title="Actualiser le tableau de bord"
              >
                Tableau de bord - Etats financiers
              </h1>
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center border border-gray-300 rounded bg-white min-h-[38px] px-2 gap-2">
                  <FiSearch size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Rechercher un rapport (nom, code)..."
                    className="flex-1 min-w-0 px-1 py-1 text-sm focus:outline-none"
                  />
                  {searchText && (
                    <button type="button" onClick={() => setSearchText('')} className="text-gray-400 hover:text-red-600">
                      <FiX size={14} />
                    </button>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFilterMenu((value) => !value)}
                      className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                    >
                      <FiFilter size={14} className={typeFilter !== 'all' ? 'text-purple-600' : 'text-gray-400'} />
                    </button>
                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2 px-1">Type de rapport</p>
                          {[{ key: 'all', label: 'Tous' }, ...Object.entries(REPORT_TYPE_META).map(([key, meta]) => ({ key, label: meta.label }))].map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => { setTypeFilter(option.key); setShowFilterMenu(false); }}
                              className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 ${typeFilter === option.key ? 'text-purple-700 font-medium' : 'text-gray-600'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {(typeFilter !== 'all' || searchText) && (
                          <div className="p-2 border-t border-gray-200">
                            <button type="button" onClick={clearFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">
                              Effacer les filtres
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
              <button
                type="button"
                onClick={loadReports}
                className="h-8 px-3 border border-gray-300 bg-white text-xs hover:bg-gray-50 rounded flex items-center gap-2 whitespace-nowrap"
              >
                <FiRefreshCcw size={14} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Total des rapports"
              value={stats.totalReports}
              detail={`${stats.recentCount} mis a jour cette semaine`}
              icon={FiFileText}
              onClick={() => clearFilters()}
            />
            <KpiCard
              label="Bilans"
              value={stats.bilanCount}
              detail="Etats de situation financiere"
              icon={FiGrid}
              onClick={() => setTypeFilter('balance_sheet')}
            />
            <KpiCard
              label="Comptes de resultat"
              value={stats.crCount}
              detail="Performance sur la periode"
              icon={FiTrendingUp}
              onClick={() => setTypeFilter('profit_loss')}
            />
            <KpiCard
              label="Flux de tresorerie"
              value={stats.cashFlowCount}
              detail="Mouvements de tresorerie"
              icon={FiBarChart2}
              onClick={() => setTypeFilter('cash_flow')}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
            <div className="bg-white border border-gray-200 h-full">
              <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Repartition par type</h2>
                  <p className="text-xs text-gray-500">Vue d'ensemble des rapports</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ChartTypeButton active={chartType === 'pie'} icon={FiPieChart} label="Circulaire" onClick={() => setChartType('pie')} />
                  <ChartTypeButton active={chartType === 'bar'} icon={FiBarChart2} label="Batons" onClick={() => setChartType('bar')} />
                </div>
              </div>
              <div className="px-4 py-3">
                {chartType === 'pie' ? <PieChartView data={typeChartData} /> : <BarChartView data={typeChartData} />}
              </div>
            </div>

            <div className="bg-white border border-gray-200 h-full">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Tendance mensuelle</h2>
                <p className="text-xs text-gray-500">Rapports crees par mois (6 derniers mois)</p>
              </div>
              <div className="px-4 py-3">
                <MonthlyTrendChart data={monthlyTrendData} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">Derniers rapports</h2>
                <p className="text-xs text-gray-500">{filteredReports.length} rapport(s) au total</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 px-2 border border-gray-300 bg-white rounded flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Afficher</span>
                  <input
                    type="number"
                    min="1"
                    value={reportsPerPage}
                    onChange={(event) => setReportsPerPage(Math.max(1, Number(event.target.value) || 1))}
                    className="w-12 text-xs text-gray-800 text-center focus:outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {filteredReports.length ? `${startIndex + 1}-${endIndex}` : '0'} / {filteredReports.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <FiChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>

            {displayedReports.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-gray-500 mb-4">Aucun rapport financier ne correspond a votre recherche.</p>
                <button
                  type="button"
                  onClick={() => navigate('/financial-reports/new')}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 rounded inline-flex items-center gap-2"
                >
                  <FiPlus size={12} />
                  Creer mon premier rapport
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Nom</th>
                      <th className="py-3 px-4 text-left font-medium">Code</th>
                      <th className="py-3 px-4 text-left font-medium">Type</th>
                      <th className="py-3 px-4 text-left font-medium">Cree le</th>
                      <th className="py-3 px-4 text-left font-medium">Mis a jour</th>
                      <th className="py-3 px-4 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedReports.map((report) => {
                      const meta = getTypeMeta(report.report_type);
                      return (
                        <tr key={report.id} className="hover:bg-purple-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.accent }} />
                              <span className="font-medium text-gray-900 truncate">{report.name || '-'}</span>
                              {isRecent(report) && (
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                  <FiClock size={9} /> recent
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-600">{report.code || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600">{formatDate(report.created_at)}</td>
                          <td className="py-3 px-4 text-xs text-gray-600">{formatDateTime(report.updated_at || report.created_at)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/financial-reports/${report.id}`)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                title="Voir"
                              >
                                <FiEye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/financial-reports/${report.id}/edit`)}
                                className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-amber-600 hover:bg-amber-50"
                                title="Modifier"
                              >
                                <FiEdit2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Actions rapides</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/financial-reports/new')}
                className="h-9 px-4 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 rounded flex items-center gap-2"
              >
                <FiPlus size={13} />
                Creer un nouveau rapport
              </button>
              <button
                type="button"
                className="h-9 px-4 border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 rounded flex items-center gap-2"
              >
                <FiCheckCircle size={13} />
                Calculer tous les rapports
              </button>
              <button
                type="button"
                className="h-9 px-4 border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 rounded flex items-center gap-2"
              >
                <FiFileText size={13} />
                Importer donnees comptables
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
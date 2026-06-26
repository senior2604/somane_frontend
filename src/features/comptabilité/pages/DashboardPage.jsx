import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiActivity,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiFilter,
  FiGrid,
  FiMoreVertical,
  FiPieChart,
  FiPlus,
  FiRefreshCcw,
  FiSettings,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiX
} from 'react-icons/fi';
import { useEntity } from '../../../context/EntityContext';
import { dashboardService, journauxService } from '../services';

const COLORS = ['#7c3aed', '#14b8a6', '#2563eb', '#f59e0b', '#ef4444', '#0f766e', '#334155', '#db2777', '#10b981', '#8b5cf6'];

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
        </div>
      )}
    </div>
  );
};

const formatAmount = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return '0';
  return Math.round(number).toLocaleString('fr-FR');
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
};

const compactLabel = (value) => {
  if (!value) return '-';
  return String(value).length > 20 ? `${String(value).slice(0, 20)}...` : String(value);
};

const getJournalAccent = (journal) => COLORS[Number(journal?.color || 0) % COLORS.length];

const getJournalActionRoute = (journal) => {
  if (journal?.type === 'sale' || journal?.type === 'purchase' || journal?.type === 'misc') {
    return '/comptabilite/pieces/create';
  }
  return '/comptabilite/paiements/create';
};

const getJournalViewRoute = (journal, item) => {
  const label = String(item || '').toLowerCase();
  if (label.includes('transaction')) return '/comptabilite/paiements';
  if (label.includes('releve')) return '/comptabilite/releves';
  return '/comptabilite/pieces';
};

const getJournalNewRoute = (journal, item) => {
  const label = String(item || '').toLowerCase();
  if (label.includes('transaction')) return '/comptabilite/paiements/create';
  if (label.includes('releve') || label.includes('importer')) return '/comptabilite/releves/create';
  return '/comptabilite/pieces/create';
};

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const getJournalTypeLabel = (journal) => {
  const type = journal?.type;
  if (typeof type === 'object') return type.name || type.code || '';
  return journal?.type_name || journal?.type_code || type || '';
};

const getJournalTypeKey = (journal) => {
  const raw = `${journal?.code || ''} ${journal?.name || ''} ${getJournalTypeLabel(journal)}`.toLowerCase();
  if (raw.includes('achat') || raw.includes('purchase') || raw.includes('ach')) return 'purchase';
  if (raw.includes('vente') || raw.includes('sale') || raw.includes('ven')) return 'sale';
  if (raw.includes('caisse') || raw.includes('cash') || raw.includes('cai') || raw.includes('banque') || raw.includes('bank') || raw.includes('ban')) return 'treasury';
  return 'misc';
};

const buildJournalCardsFromList = (journals = []) => journals.map((journal, index) => {
  const type = getJournalTypeKey(journal);
  const isTreasury = type === 'treasury';
  return {
    id: journal.id,
    code: journal.code,
    name: journal.name,
    type,
    color: journal.color ?? index,
    action_label: type === 'purchase' ? 'Telecharger' : isTreasury ? 'Nouvelle transaction' : 'Nouvelle entree',
    menu: {
      view: type === 'treasury' ? ['Transactions', 'Pieces'] : ['Factures', 'Avoirs'],
      new: type === 'purchase'
        ? ['Facture fournisseur', 'Avoir fournisseur', 'Charger des factures']
        : type === 'sale'
          ? ['Facture', 'Avoir', 'Charger des factures']
          : isTreasury
            ? ['Nouvelle transaction', 'Importer releves']
            : ['Nouvelle entree'],
      analysis: [type === 'treasury' ? 'Solde du journal' : 'Analyse des ecritures']
    },
    draft_count: 0,
    posted_count: Number(journal.entries_count || 0),
    total_count: Math.max(Number(journal.entries_count || 0), 1),
    amount_to_process: 0,
    unpaid_amount: 0,
    debit: 0,
    credit: 0,
    balance: 0,
    show_on_dashboard: journal.show_on_dashboard !== false,
    has_sequence: Boolean(journal.sequence || journal.sequence_id),
    has_default_account: Boolean(journal.default_account || journal.default_account_id || journal.suspense_account || journal.suspense_account_id),
    is_treasury: isTreasury,
    series: [
      { label: 'Du', value: 0 },
      { label: '15-21', value: 0 },
      { label: 'Cette sem.', value: Math.max(Number(journal.entries_count || 0), 1) },
      { label: '29-05', value: 0 },
      { label: 'Pas du', value: 0 }
    ]
  };
});

const getStateLabel = (state) => {
  const labels = {
    draft: 'Brouillon',
    posted: 'Comptabilise',
    cancel: 'Annule',
    cancelled: 'Annule'
  };
  return labels[state] || state || '-';
};

const MiniBars = ({ data = [], color = '#14b8a6' }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);
  return (
    <div className="h-16 flex items-end gap-2 border-l border-gray-100 pl-2">
      {data.map((item, index) => {
        const height = `${Math.max((Number(item.value || 0) / max) * 100, 8)}%`;
        return (
          <div key={`${item.label}-${index}`} className="flex-1 min-w-0 h-full flex flex-col justify-end">
            <div
              className="relative w-full bg-gray-100 rounded-t overflow-visible h-full flex items-end"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && (
                <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-40 px-2 py-1 bg-gray-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap">
                  <div className="font-medium">{item.label}</div>
                  <div>{formatAmount(item.value)} CFA</div>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                </div>
              )}
              <div
                className="w-full rounded-t cursor-pointer transition-opacity hover:opacity-100"
                style={{ height, backgroundColor: color, opacity: hoveredIndex === index ? 1 : 0.22 + index * 0.12 }}
              />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 truncate -rotate-12 origin-left">{item.label}</div>
          </div>
        );
      })}
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

const MainChart = ({ data, chartType, colors = COLORS }) => {
  const normalized = data.map((item) => ({ ...item, value: Number(item.value || 0) }));
  const hasData = normalized.some((item) => item.value !== 0);
  const max = Math.max(...normalized.map((item) => Math.abs(item.value)), 1);
  const getColor = (index) => colors[index % colors.length] || COLORS[index % COLORS.length];

  if (!hasData) {
    return <div className="h-40 flex items-center justify-center text-sm text-gray-500">Aucune donnee a afficher.</div>;
  }

  if (chartType === 'pie') {
    const total = normalized.reduce((sum, item) => sum + Math.abs(item.value), 0);
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

    return (
      <div className="h-40 grid grid-cols-1 md:grid-cols-[160px_1fr] items-center gap-4">
        <svg viewBox="0 0 220 220" className="w-full h-36">
          {normalized.map((item, index) => {
            const angle = total > 0 ? (Math.abs(item.value) / total) * 360 : 0;
            const endAngle = startAngle + angle;
            const path = arc(110, 110, 94, startAngle, endAngle);
            startAngle = endAngle;
            return <path key={`${item.name}-${index}`} d={path} fill={getColor(index)} />;
          })}
          <circle cx="110" cy="110" r="54" fill="white" />
          <text x="110" y="106" textAnchor="middle" className="fill-gray-500 text-xs">Total</text>
          <text x="110" y="126" textAnchor="middle" className="fill-gray-900 text-sm font-semibold">{formatAmount(total)}</text>
        </svg>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {normalized.map((item, index) => (
            <div key={`${item.name}-legend-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: getColor(index) }} />
                <span className="text-gray-600 truncate">{item.name}</span>
              </div>
              <span className="font-semibold text-gray-900 whitespace-nowrap">{formatAmount(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === 'horizontal') {
    return (
      <div className="h-40 flex flex-col justify-center gap-2 px-3 overflow-y-auto">
        {normalized.map((item, index) => (
          <div key={`${item.name}-${index}`} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_100px] items-center gap-2 sm:gap-3">
            <div className="text-xs text-gray-600 truncate">{item.name}</div>
            <div className="h-6 bg-gray-100 rounded">
              <div
                className="h-6 rounded"
                style={{ width: `${Math.max((Math.abs(item.value) / max) * 100, 3)}%`, backgroundColor: getColor(index) }}
              />
            </div>
            <div className="text-xs font-semibold text-gray-900 text-right">{formatAmount(item.value)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (chartType === 'line' || chartType === 'area') {
    const width = 760;
    const height = 170;
    const padding = 36;
    const step = normalized.length > 1 ? (width - padding * 2) / (normalized.length - 1) : 0;
    const points = normalized.map((item, index) => ({
      ...item,
      x: padding + index * step,
      y: height - padding - (Math.abs(item.value) / max) * (height - padding * 2)
    }));
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;
    const lineColor = getColor(0);

    return (
      <div className="h-40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + line * ((height - padding * 2) / 3);
            return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />;
          })}
          {chartType === 'area' && <path d={areaPath} fill={lineColor} opacity="0.14" />}
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={`${point.name}-${index}`}>
              <circle cx={point.x} cy={point.y} r="5" fill={lineColor} />
              <text x={point.x} y={height - 10} textAnchor="middle" className="fill-gray-500 text-xs">{compactLabel(point.name)}</text>
              <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-gray-900 text-xs font-semibold">{formatAmount(point.value)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="h-40 flex items-end gap-4 px-3 pt-5 pb-3">
      {normalized.map((item, index) => (
        <div key={`${item.name}-${index}`} className="h-full flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
          <div className="text-xs font-semibold text-gray-900">{formatAmount(item.value)}</div>
          <div className="w-full h-full flex items-end justify-center">
            <div
              className="w-full max-w-20 rounded-t"
              style={{ height: `${Math.max((Math.abs(item.value) / max) * 100, 4)}%`, backgroundColor: getColor(index) }}
            />
          </div>
          <div className="h-8 text-xs text-gray-600 text-center truncate w-full">{item.name}</div>
        </div>
      ))}
    </div>
  );
};

const HealthPanel = ({ health, selectedKey, onSelect }) => {
  const score = Number(health?.score ?? 100);
  const items = health?.items || [];
  const selectedItem = items.find((item) => item.key === selectedKey) || items.find((item) => item.count > 0) || items[0];
  const scoreColor = score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-rose-700 bg-rose-50 border-rose-100';

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-start justify-between gap-3">
        <div className={`px-3 py-2 border rounded ${scoreColor}`}>
          <div className="text-xs font-medium">Score</div>
          <div className="text-xl font-bold">{score}/100</div>
        </div>
        {selectedItem && (
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs text-gray-500">Focus</div>
            <div className="text-sm font-semibold text-gray-900 truncate">{selectedItem.label}</div>
            <div className="text-xs text-gray-500 truncate">{selectedItem.message}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {items.length === 0 ? (
          <div className="col-span-2 text-sm text-gray-500 text-center py-4">Aucun indicateur disponible.</div>
        ) : items.map((item) => {
          const selected = selectedItem?.key === item.key;
          const color = item.severity === 'danger'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : item.severity === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700';
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`relative group border px-3 py-2 rounded text-left transition-all hover:shadow-sm ${color} ${selected ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium truncate">{item.label}</p>
                <p className="text-base font-bold">{item.count}</p>
              </div>
              <div className="pointer-events-none absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1">Nombre : {item.count}</div>
                <div className="mt-1 text-gray-200">{item.message}</div>
                {item.details?.length > 0 && (
                  <div className="mt-2 border-t border-gray-700 pt-2 space-y-1">
                    {item.details.slice(0, 6).map((detail) => (
                      <div key={`${item.key}-${detail.id}-${detail.name}`} className="truncate">
                        {detail.name}{detail.journal ? ` - ${detail.journal}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FinancialFlowPanel = ({ flows, selectedKey, onSelect }) => {
  const items = flows?.items?.length ? flows.items : [
    { key: 'inbound', label: 'Encaissements', amount: flows?.inbound_amount || 0, count: flows?.inbound_count || 0, message: 'Paiements entrants comptabilises.' },
    { key: 'outbound', label: 'Decaissements', amount: flows?.outbound_amount || 0, count: flows?.outbound_count || 0, message: 'Paiements sortants comptabilises.' },
    { key: 'net', label: 'Solde net', amount: flows?.net_amount || 0, count: flows?.posted_count || 0, message: 'Encaissements moins decaissements.' },
    { key: 'draft', label: 'A valider', amount: flows?.draft_amount || 0, count: flows?.draft_count || 0, message: 'Paiements encore en brouillon.' }
  ];
  const selectedItem = items.find((item) => item.key === selectedKey) || items.find((item) => Number(item.amount || 0) !== 0 || item.count > 0) || items[0];
  const net = Number(flows?.net_amount || 0);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Flux financiers</p>
          <p className={`text-lg font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatAmount(net)} CFA</p>
        </div>
        {selectedItem && (
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs text-gray-500">Focus</div>
            <div className="text-sm font-semibold text-gray-900 truncate">{selectedItem.label}</div>
            <div className="text-xs text-gray-500 truncate">{selectedItem.message}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {items.map((item) => {
          const selected = selectedItem?.key === item.key;
          const positive = item.key === 'inbound' || (item.key === 'net' && Number(item.amount || 0) >= 0);
          const color = positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : item.key === 'draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';
          const Icon = positive ? FiArrowDown : item.key === 'draft' ? FiCalendar : FiArrowUp;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`relative group border px-3 py-2 rounded text-left transition-all hover:shadow-sm ${color} ${selected ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </span>
                <span className="text-xs font-bold">{item.count || 0}</span>
              </div>
              <div className="mt-1 text-sm font-bold truncate">{formatAmount(item.amount)} CFA</div>
              <div className="pointer-events-none absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1">Montant : {formatAmount(item.amount)} CFA</div>
                <div className="mt-1">Nombre : {item.count || 0}</div>
                <div className="mt-1 text-gray-200">{item.message}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ActivityPanel = ({ items, onOpen }) => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const filteredItems = useMemo(() => items.filter((item) => {
    const typeMatches = typeFilter === 'all' || item.type === typeFilter;
    const stateMatches = stateFilter === 'all' || item.state === stateFilter;
    return typeMatches && stateMatches;
  }), [items, typeFilter, stateFilter]);

  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Activite & actions recentes</h2>
          <p className="text-xs text-gray-500">Pieces et paiements regroupes au meme endroit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-8 px-2 border border-gray-300 bg-white text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">Tous</option>
            <option value="move">Pieces</option>
            <option value="payment">Paiements</option>
          </select>
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="h-8 px-2 border border-gray-300 bg-white text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">Tous les etats</option>
            <option value="draft">Brouillon</option>
            <option value="posted">Comptabilise / valide</option>
            <option value="cancel">Annule</option>
          </select>
          <FiActivity size={18} className="text-purple-600 shrink-0" />
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-500 text-center">Aucune activite pour ce filtre.</div>
        ) : filteredItems.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onOpen(item)}
            className="relative group w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name || item.label || '-'}</p>
                <p className="text-xs text-gray-500 truncate">{formatDate(item.date || item.payment_date)} - {item.journal || '-'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatAmount(item.amount || item.amount_total)} CFA</p>
                <p className="text-[11px] text-purple-700">{item.label || getStateLabel(item.state)}</p>
              </div>
            </div>
            <div className="pointer-events-none absolute right-3 top-full mt-1 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
              <div className="font-semibold">{item.type === 'payment' ? 'Paiement' : 'Piece comptable'} : {item.name || '-'}</div>
              <div className="mt-1">Partenaire : {item.partner || '-'}</div>
              <div className="mt-1">Journal : {item.journal || '-'}</div>
              <div className="mt-1">Montant : {formatAmount(item.amount || item.amount_total)} CFA</div>
              <div className="mt-1">Etat : {getStateLabel(item.state)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const PartnerHighlightsPanel = ({ partners, onOpen }) => (
  <div className="bg-white border border-gray-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900">Partenaires a suivre</h2>
        <p className="text-xs text-gray-500">Volume, paiements et reste detectes</p>
      </div>
      <FiUsers size={18} className="text-purple-600 shrink-0" />
    </div>
    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
      {partners.length === 0 ? (
        <div className="px-4 py-8 text-sm text-gray-500 text-center">Aucun partenaire a afficher.</div>
      ) : partners.map((partner) => (
        <button
          key={partner.id || partner.name}
          type="button"
          onClick={() => onOpen(partner)}
          className="relative group w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{partner.name || '-'}</p>
              <p className="text-xs text-gray-500 truncate">{partner.moves_count || 0} piece(s) - {partner.payments_count || 0} paiement(s)</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900">{formatAmount(partner.amount)} CFA</p>
              <p className={`text-[11px] ${Number(partner.residual || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                Reste {formatAmount(partner.residual)} CFA
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 top-full mt-1 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
            <div className="font-semibold">{partner.name || '-'}</div>
            <div className="mt-1">Volume pieces : {formatAmount(partner.amount)} CFA</div>
            <div className="mt-1">Paiements : {formatAmount(partner.payments_amount)} CFA</div>
            <div className="mt-1">Reste a suivre : {formatAmount(partner.residual)} CFA</div>
            <div className="mt-1">Derniere date : {formatDate(partner.last_date)}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const KpiStrip = ({ summary, amounts, onNavigate }) => {
  const kpis = [
    { label: 'Pieces', value: summary.moves_total || 0, detail: `${summary.moves_posted || 0} comptabilisees`, icon: FiFileText, route: '/comptabilite/pieces' },
    { label: 'Paiements', value: summary.payments_total || 0, detail: `${summary.payments_posted || 0} valides`, icon: FiCreditCard, route: '/comptabilite/paiements' },
    { label: 'Debit', value: `${formatAmount(amounts.posted_debit)} CFA`, detail: 'Lignes comptabilisees', icon: FiArrowDown },
    { label: 'Credit', value: `${formatAmount(amounts.posted_credit)} CFA`, detail: 'Lignes comptabilisees', icon: FiArrowUp }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <button
            key={kpi.label}
            type="button"
            onClick={() => kpi.route && onNavigate(kpi.route)}
            className="group bg-purple-700 text-white px-4 py-4 text-left shadow-sm transition-all hover:bg-purple-800 hover:-translate-y-0.5 disabled:cursor-default"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-purple-100">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold truncate">{kpi.value}</p>
                <p className="mt-1 text-xs text-purple-100 truncate">{kpi.detail}</p>
              </div>
              <Icon size={22} className="text-purple-100 transition-transform group-hover:scale-110 shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const InsightPanel = ({ activeTab, setActiveTab, health, financialFlows, selectedHealthKey, setSelectedHealthKey, selectedFlowKey, setSelectedFlowKey }) => (
  <div className="bg-white border border-gray-200 overflow-visible h-full">
    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Controle comptable</h2>
        <p className="text-xs text-gray-500">Sante ou flux financiers</p>
      </div>
      <div className="flex items-center border border-gray-300 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`h-8 px-3 text-xs ${activeTab === 'health' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Sante
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`h-8 px-3 text-xs border-l border-gray-300 ${activeTab === 'flows' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Flux
        </button>
      </div>
    </div>
    <div className="p-4 min-h-[176px]">
      {activeTab === 'health' ? (
        <HealthPanel health={health} selectedKey={selectedHealthKey} onSelect={setSelectedHealthKey} />
      ) : (
        <FinancialFlowPanel flows={financialFlows} selectedKey={selectedFlowKey} onSelect={setSelectedFlowKey} />
      )}
    </div>
  </div>
);

const JournalMenu = ({ journal, onView, onNew, onAnalyze, onColor, onFavorite, onConfigure }) => (
  <div className="mx-4 mb-4 bg-white border border-gray-200 shadow-lg max-h-[420px] overflow-y-auto">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8 px-5 py-5">
      <div>
        <div className="font-semibold text-gray-800 mb-3">Vue</div>
        {(journal.menu?.view || ['Pieces']).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onView(journal, item)}
            className="block w-full text-left text-sm text-gray-600 py-1 hover:text-purple-700"
          >
            {item}
          </button>
        ))}
      </div>
      <div>
        <div className="font-semibold text-gray-800 mb-3">Nouveau</div>
        {(journal.menu?.new || ['Nouvelle entree']).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onNew(journal, item)}
            className="block w-full text-left text-sm text-gray-600 py-1 hover:text-purple-700"
          >
            {item}
          </button>
        ))}
      </div>
      <div>
        <div className="font-semibold text-gray-800 mb-3">Analyse</div>
        {(journal.menu?.analysis || ['Analyse']).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onAnalyze(journal, item)}
            className="block w-full text-left text-sm text-gray-600 py-1 hover:text-purple-700"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
    <div className="border-t border-gray-200 px-5 py-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => onColor(journal, 0)} className="w-6 h-6 border border-gray-300 bg-white relative">
        <span className="absolute left-0 top-1/2 w-full h-px bg-rose-500 -rotate-45" />
      </button>
      {COLORS.map((color, index) => (
        <button
          key={color}
          type="button"
          onClick={() => onColor(journal, index)}
          className="w-6 h-6 border border-gray-300"
          style={{ backgroundColor: color }}
          aria-label={`Couleur ${index + 1}`}
        />
      ))}
    </div>
    <div className="border-t border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => onFavorite(journal)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-700">
        <FiStar className="text-yellow-400" size={16} />
        {journal.show_on_dashboard === false ? 'Ajouter aux favoris' : 'Supprimer des favoris'}
      </button>
      <button type="button" onClick={() => onConfigure(journal)} className="text-sm text-gray-600 hover:text-purple-700">
        Configuration
      </button>
    </div>
  </div>
);

const JournalCard = ({ journal, openMenuId, setOpenMenuId, onAction, onView, onNew, onAnalyze, onColor, onFavorite, onConfigure }) => {
  const accent = getJournalAccent(journal);
  const isOpen = openMenuId === journal.id;
  const title = `${journal.code || ''}${journal.code ? ' ' : ''}${journal.name || 'Journal'}`.toUpperCase();

  return (
    <div className="relative bg-white border border-gray-200 min-h-[172px] min-w-0" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate" style={{ color: accent }}>{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpenMenuId(isOpen ? null : journal.id)}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
        >
          <FiMoreVertical size={16} />
        </button>
      </div>

      <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-[135px_1fr] gap-4">
        <div>
          <button
            type="button"
            onClick={() => onAction(journal)}
            className="px-3 py-2 text-xs font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            {journal.action_label || 'Nouvelle entree'}
          </button>
          {journal.type === 'purchase' && (
            <button type="button" className="block mt-2 text-xs text-gray-500 hover:text-gray-800">
              Creer Manuellement
            </button>
          )}
          {journal.type === 'treasury' && (
            <button type="button" className="block mt-2 text-xs text-gray-500 hover:text-gray-800">
              Creer ou Importer Releves
            </button>
          )}
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
            <div className="text-teal-700 truncate">{journal.draft_count || 0} Pieces a valider</div>
            <div className="text-gray-700 text-right whitespace-nowrap">{formatAmount(journal.amount_to_process)} CFA</div>
            <div className="text-teal-700 truncate">{journal.posted_count || 0} Pieces comptabilisees</div>
            <div className="text-gray-700 text-right whitespace-nowrap">{formatAmount(journal.unpaid_amount || journal.posted_amount || Math.abs(journal.balance || 0))} CFA</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <MiniBars data={journal.series || []} color={accent} />
      </div>

      {isOpen && (
        <JournalMenu
          journal={journal}
          onView={onView}
          onNew={onNew}
          onAnalyze={onAnalyze}
          onColor={onColor}
          onFavorite={onFavorite}
          onConfigure={onConfigure}
        />
      )}
    </div>
  );
};

export default function ComptaDashboard() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const today = useMemo(() => new Date(), []);
  const defaultDateFrom = useMemo(() => `${today.getFullYear()}-01-01`, [today]);
  const defaultDateTo = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [dashboard, setDashboard] = useState(null);
  const [fallbackJournalCards, setFallbackJournalCards] = useState([]);
  const latestDashboardRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showFavoritesMenu, setShowFavoritesMenu] = useState(false);
  const [groupBy, setGroupBy] = useState('none');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [journalsPerPage, setJournalsPerPage] = useState(6);
  const [journalPage, setJournalPage] = useState(1);
  const [chartType, setChartType] = useState('bar');
  const [analysis, setAnalysis] = useState('journals');
  const [chartColors, setChartColors] = useState(COLORS);
  const [insightTab, setInsightTab] = useState('health');
  const [selectedHealthKey, setSelectedHealthKey] = useState(null);
  const [selectedFlowKey, setSelectedFlowKey] = useState(null);

  const summary = dashboard?.summary || {};
  const amounts = dashboard?.amounts || {};
  const journalCards = (dashboard?.journal_cards?.length ? dashboard.journal_cards : fallbackJournalCards);
  const accountingHealth = dashboard?.accounting_health || { score: 100, items: [] };
  const recentMoves = dashboard?.recent_moves || [];
  const recentPayments = dashboard?.recent_payments || [];
  const financialFlows = dashboard?.financial_flows || {};
  const partnerHighlights = dashboard?.partner_highlights || [];

  const loadDashboard = useCallback(async () => {
    if (!activeEntity?.id) {
      setLoading(false);
      setDashboard(null);
      setFallbackJournalCards([]);
      return;
    }

    setLoading(true);
    setError('');
    const requestId = latestDashboardRequest.current + 1;
    latestDashboardRequest.current = requestId;
    const filters = {
      date_from: dateFrom,
      date_to: dateTo
    };

    try {
      const [data, journalsResponse] = await Promise.all([
        dashboardService.getSummary(activeEntity.id, filters),
        journauxService.getAll(activeEntity.id)
      ]);
      const fallbackCards = buildJournalCardsFromList(unwrapList(journalsResponse));
      console.log('Dashboard entity:', activeEntity);
      console.log('Dashboard filters:', filters);
      console.log('Dashboard response:', data);
      console.log('Dashboard journals fallback:', fallbackCards);
      if (requestId !== latestDashboardRequest.current) return;
      setDashboard(data);
      setFallbackJournalCards(fallbackCards);
    } catch (err) {
      if (requestId !== latestDashboardRequest.current) return;
      console.error('Erreur chargement dashboard compta:', err);
      setError(err?.response?.data?.detail || err?.message || 'Erreur de chargement du tableau de bord.');
    } finally {
      if (requestId === latestDashboardRequest.current) {
        setLoading(false);
      }
    }
  }, [activeEntity, dateFrom, dateTo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const addSearchAsFilter = () => {
    const value = searchText.trim();
    if (!value) return;
    setActiveFilters((filters) => [...filters, { field: 'recherche', value }]);
    setSearchText('');
  };

  const addFilter = (field, value) => {
    setActiveFilters((filters) => {
      const exists = filters.some((filter) => filter.field === field && filter.value === value);
      return exists ? filters : [...filters, { field, value }];
    });
    setShowFilterMenu(false);
  };

  const removeFilter = (index) => {
    setActiveFilters((filters) => filters.filter((_, filterIndex) => filterIndex !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
    setFavoriteOnly(false);
  };

  const getFilterDisplay = (filter) => {
    if (filter.field === 'recherche') return { text: filter.value, color: 'bg-blue-100 text-blue-700' };
    if (filter.field === 'type') {
      const labels = { sale: 'Ventes', purchase: 'Achats', treasury: 'Tresorerie', misc: 'Operations diverses' };
      return { text: `Type: ${labels[filter.value] || filter.value}`, color: 'bg-purple-100 text-purple-700' };
    }
    if (filter.field === 'status') {
      const labels = { todo: 'A traiter', configured: 'Configure', alert: 'A verifier' };
      return { text: labels[filter.value] || filter.value, color: 'bg-amber-100 text-amber-700' };
    }
    return { text: `${filter.field}: ${filter.value}`, color: 'bg-gray-100 text-gray-700' };
  };

  const filteredJournals = useMemo(() => {
    let journals = [...journalCards];

    if (favoriteOnly) {
      journals = journals.filter((journal) => journal.show_on_dashboard !== false);
    }

    activeFilters.forEach((filter) => {
      if (filter.field === 'recherche') {
        const value = String(filter.value || '').toLowerCase();
        journals = journals.filter((journal) => (
          `${journal.code || ''} ${journal.name || ''} ${journal.type || ''}`.toLowerCase().includes(value)
        ));
      }

      if (filter.field === 'type') {
        journals = journals.filter((journal) => journal.type === filter.value);
      }

      if (filter.field === 'status') {
        if (filter.value === 'todo') {
          journals = journals.filter((journal) => Number(journal.draft_count || 0) > 0 || Number(journal.amount_to_process || 0) > 0);
        }
        if (filter.value === 'configured') {
          journals = journals.filter((journal) => journal.has_sequence && journal.has_default_account);
        }
        if (filter.value === 'alert') {
          journals = journals.filter((journal) => !journal.has_sequence || !journal.has_default_account);
        }
      }
    });

    if (groupBy === 'type') {
      journals.sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')));
    }
    if (groupBy === 'name') {
      journals.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    if (groupBy === 'balance') {
      journals.sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)));
    }

    return journals;
  }, [journalCards, activeFilters, favoriteOnly, groupBy]);

  const totalJournalPages = Math.max(Math.ceil(filteredJournals.length / journalsPerPage), 1);
  const currentJournalPage = Math.min(journalPage, totalJournalPages);
  const journalStartIndex = filteredJournals.length ? (currentJournalPage - 1) * journalsPerPage : 0;
  const journalEndIndex = Math.min(journalStartIndex + journalsPerPage, filteredJournals.length);
  const displayedJournals = filteredJournals.slice(journalStartIndex, journalEndIndex);

  useEffect(() => {
    setJournalPage(1);
  }, [activeFilters, favoriteOnly, groupBy, journalsPerPage]);

  useEffect(() => {
    if (journalPage > totalJournalPages) {
      setJournalPage(totalJournalPages);
    }
  }, [journalPage, totalJournalPages]);

  const handleJournalsPerPageChange = (event) => {
    const rawValue = Number(event.target.value || 1);
    const nextValue = Number.isFinite(rawValue) ? Math.max(1, rawValue) : 1;
    setJournalsPerPage(nextValue);
  };

  const analysisData = useMemo(() => {
    if (analysis === 'states') {
      return [
        { name: 'Brouillons', value: summary.moves_draft || 0 },
        { name: 'Comptabilisees', value: summary.moves_posted || 0 },
        { name: 'Annulees', value: summary.moves_cancelled || 0 }
      ];
    }
    if (analysis === 'payments') {
      return [
        { name: 'Encaissements', value: amounts.payments_inbound || 0 },
        { name: 'Decaissements', value: amounts.payments_outbound || 0 }
      ];
    }
    if (analysis === 'balance') {
      return [
        { name: 'Debit', value: amounts.posted_debit || 0 },
        { name: 'Credit', value: amounts.posted_credit || 0 }
      ];
    }
    return filteredJournals.map((journal) => {
      const amountValue = Math.abs(Number(journal.balance || journal.unpaid_amount || journal.amount_to_process || 0));
      const countValue = Number(journal.total_count || journal.posted_count || journal.draft_count || 0);
      return {
        name: compactLabel(journal.code || journal.name),
        value: amountValue > 0 ? amountValue : countValue
      };
    });
  }, [analysis, summary, amounts, filteredJournals]);

  const activityItems = useMemo(() => {
    if (dashboard?.activity_items?.length) return dashboard.activity_items;
    const movesActivity = recentMoves.map((move) => ({
      ...move,
      type: 'move',
      date: move.date,
      amount: move.amount_total,
      label: move.state === 'posted' ? 'Piece comptabilisee' : move.state === 'draft' ? 'Piece brouillon' : getStateLabel(move.state)
    }));
    const paymentsActivity = recentPayments.map((payment) => ({
      ...payment,
      type: 'payment',
      date: payment.payment_date,
      amount: payment.amount,
      label: payment.state === 'posted' ? 'Paiement valide' : payment.state === 'draft' ? 'Paiement brouillon' : getStateLabel(payment.state)
    }));
    return [...movesActivity, ...paymentsActivity]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 10);
  }, [dashboard, recentMoves, recentPayments]);

  const displayPartnerHighlights = useMemo(() => {
    if (partnerHighlights.length) return partnerHighlights;
    const grouped = {};
    [...recentMoves, ...recentPayments].forEach((item) => {
      const name = item.partner;
      if (!name) return;
      grouped[name] = grouped[name] || {
        id: item.partner_id,
        name,
        moves_count: 0,
        payments_count: 0,
        amount: 0,
        payments_amount: 0,
        residual: 0,
        last_date: item.date || item.payment_date
      };
      if (item.payment_date) {
        grouped[name].payments_count += 1;
        grouped[name].payments_amount += Number(item.amount || 0);
      } else {
        grouped[name].moves_count += 1;
        grouped[name].amount += Number(item.amount_total || 0);
        grouped[name].residual += Number(item.amount_residual || 0);
      }
      const itemDate = item.date || item.payment_date;
      if (itemDate && (!grouped[name].last_date || new Date(itemDate) > new Date(grouped[name].last_date))) {
        grouped[name].last_date = itemDate;
      }
    });
    return Object.values(grouped).slice(0, 8);
  }, [partnerHighlights, recentMoves, recentPayments]);

  const handleJournalAction = (journal) => {
    navigate(getJournalActionRoute(journal), { state: { journalId: journal.id } });
  };

  const updateJournalCard = (journalId, updater) => {
    setFallbackJournalCards((cards) => cards.map((card) => (
      card.id === journalId ? updater(card) : card
    )));
    setDashboard((current) => {
      if (!current?.journal_cards?.length) return current;
      return {
        ...current,
        journal_cards: current.journal_cards.map((card) => (
          card.id === journalId ? updater(card) : card
        ))
      };
    });
  };

  const closeJournalMenu = () => setOpenMenuId(null);

  const handleJournalView = (journal, item) => {
    closeJournalMenu();
    navigate(getJournalViewRoute(journal, item), {
      state: {
        journalId: journal.id,
        journalCode: journal.code,
        source: 'dashboard'
      }
    });
  };

  const handleJournalNew = (journal, item) => {
    closeJournalMenu();
    navigate(getJournalNewRoute(journal, item), {
      state: {
        journalId: journal.id,
        journalCode: journal.code,
        source: 'dashboard'
      }
    });
  };

  const handleJournalAnalyze = (journal) => {
    closeJournalMenu();
    setAnalysis('journals');
    setChartType('bar');
    setActiveFilters((filters) => {
      const withoutJournalSearch = filters.filter((filter) => !(filter.field === 'recherche' && filter.value === journal.code));
      return [...withoutJournalSearch, { field: 'recherche', value: journal.code || journal.name }];
    });
  };

  const handleJournalColor = (journal, colorIndex) => {
    updateJournalCard(journal.id, (card) => ({ ...card, color: colorIndex }));
  };

  const handleJournalFavorite = (journal) => {
    updateJournalCard(journal.id, (card) => ({
      ...card,
      show_on_dashboard: card.show_on_dashboard === false
    }));
    closeJournalMenu();
  };

  const handleJournalConfigure = (journal) => {
    closeJournalMenu();
    navigate(`/comptabilite/journaux/${journal.id}`);
  };

  const updateChartColor = (index, color) => {
    setChartColors((colors) => {
      const nextColors = [...colors];
      nextColors[index] = color;
      return nextColors;
    });
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-gray-200 p-6 text-sm text-gray-600">
          Vous devez selectionner une entite.
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
              <Tooltip text="Creer une nouvelle piece">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/pieces/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1 whitespace-nowrap"
                >
                  <FiPlus size={12} />
                  Nouveau
                </button>
              </Tooltip>
              <Tooltip text="Actualiser le tableau de bord">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200 truncate"
                  onClick={loadDashboard}
                >
                  Tableau de bord
                </h1>
              </Tooltip>
              <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[180px]">
                {activeEntity?.raison_sociale || activeEntity?.nom || activeEntity?.name || 'Entite'}
              </span>

              <div className="relative">
                <Tooltip text="Menu des actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu((value) => !value)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/pieces/create'); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiPlus size={12} /> Nouvelle piece
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/journaux'); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiGrid size={12} /> Voir les journaux
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); loadDashboard(); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiRefreshCcw size={12} /> Actualiser
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    const display = getFilterDisplay(filter);
                    return (
                      <span key={`${filter.field}-${filter.value}-${index}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${display.color} m-0.5`}>
                        {display.text}
                        <button type="button" onClick={() => removeFilter(index)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addSearchAsFilter();
                    }}
                    placeholder="Rechercher..."
                    className="flex-1 min-w-0 px-2 py-1 text-sm focus:outline-none"
                  />
                  <div className="relative">
                    <Tooltip text="Ajouter un filtre">
                      <button
                        type="button"
                        onClick={() => setShowFilterMenu((value) => !value)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-72 max-w-[calc(100vw-2rem)] bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Type de journal</p>
                          <div className="grid grid-cols-2 gap-1">
                            <button type="button" onClick={() => addFilter('type', 'sale')} className="text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">Ventes</button>
                            <button type="button" onClick={() => addFilter('type', 'purchase')} className="text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">Achats</button>
                            <button type="button" onClick={() => addFilter('type', 'treasury')} className="text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">Tresorerie</button>
                            <button type="button" onClick={() => addFilter('type', 'misc')} className="text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">Divers</button>
                          </div>
                        </div>
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Statut</p>
                          <button type="button" onClick={() => addFilter('status', 'todo')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">A traiter</button>
                          <button type="button" onClick={() => addFilter('status', 'configured')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">Journaux configures</button>
                          <button type="button" onClick={() => addFilter('status', 'alert')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded">A verifier</button>
                        </div>
                        {(activeFilters.length > 0 || favoriteOnly) && (
                          <div className="p-2">
                            <button type="button" onClick={clearAllFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">
                              Effacer tous les filtres
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGroupMenu((value) => !value)}
                  className="h-8 px-3 border border-gray-300 bg-white text-xs hover:bg-gray-50 rounded flex items-center gap-2 whitespace-nowrap"
                >
                  <FiGrid size={14} />
                  Regrouper par
                </button>
                {showGroupMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button type="button" onClick={() => { setGroupBy('none'); setShowGroupMenu(false); }} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50">Aucun</button>
                    <button type="button" onClick={() => { setGroupBy('type'); setShowGroupMenu(false); }} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50">Type</button>
                    <button type="button" onClick={() => { setGroupBy('name'); setShowGroupMenu(false); }} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50">Nom</button>
                    <button type="button" onClick={() => { setGroupBy('balance'); setShowGroupMenu(false); }} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50">Solde</button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFavoritesMenu((value) => !value)}
                  className={`h-8 px-3 border border-gray-300 bg-white text-xs hover:bg-gray-50 rounded flex items-center gap-2 whitespace-nowrap ${favoriteOnly ? 'text-purple-700' : ''}`}
                >
                  <FiStar size={14} />
                  Favoris
                </button>
                {showFavoritesMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button
                      type="button"
                      onClick={() => { setFavoriteOnly((value) => !value); setShowFavoritesMenu(false); }}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50"
                    >
                      {favoriteOnly ? 'Afficher tout' : 'Favoris uniquement'}
                    </button>
                  </div>
                )}
              </div>
              <div className="h-8 px-2 border border-gray-300 bg-white rounded flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Afficher</span>
                <input
                  type="number"
                  min="1"
                  value={journalsPerPage}
                  onChange={handleJournalsPerPageChange}
                  className="w-14 text-xs text-gray-800 text-center focus:outline-none"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">journaux</span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {filteredJournals.length ? `${journalStartIndex + 1}-${journalEndIndex}` : '0'} / {filteredJournals.length}
                <span className="hidden sm:inline"> - page {currentJournalPage}/{totalJournalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setJournalPage((page) => Math.max(page - 1, 1))}
                disabled={currentJournalPage <= 1}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setJournalPage((page) => Math.min(page + 1, totalJournalPages))}
                disabled={currentJournalPage >= totalJournalPages}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

      <div className="px-4 py-4 space-y-4 min-w-0">
        <div className="bg-white border border-gray-200 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date debut</label>
                <div className="relative">
                  <FiCalendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                <div className="relative">
                  <FiCalendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              {dashboard?.period && (
                <div className="pb-2 text-xs text-gray-500">
                  Periode : {formatDate(dashboard.period.date_from)} - {formatDate(dashboard.period.date_to)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              disabled={loading}
            >
              <FiRefreshCcw size={15} />
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 p-8 text-center text-sm text-gray-500">
            Chargement...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredJournals.length === 0 ? (
                <div className="lg:col-span-2 xl:col-span-3 bg-white border border-gray-200 p-8 text-center text-sm text-gray-500">
                  Aucun journal a afficher.
                </div>
              ) : displayedJournals.map((journal) => (
                <JournalCard
                  key={journal.id}
                  journal={journal}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onAction={handleJournalAction}
                  onView={handleJournalView}
                  onNew={handleJournalNew}
                  onAnalyze={handleJournalAnalyze}
                  onColor={handleJournalColor}
                  onFavorite={handleJournalFavorite}
                  onConfigure={handleJournalConfigure}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
              <div className="bg-white border border-gray-200 h-full">
                <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Analyse visuelle</h2>
                    <p className="text-xs text-gray-500">Vue compacte des indicateurs</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={analysis}
                      onChange={(event) => setAnalysis(event.target.value)}
                      className="h-8 px-2 border border-gray-300 bg-white text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="journals">Journaux</option>
                      <option value="states">Etat des pieces</option>
                      <option value="payments">Paiements</option>
                      <option value="balance">Debit / Credit</option>
                    </select>
                    <ChartTypeButton active={chartType === 'pie'} icon={FiPieChart} label="Circulaire" onClick={() => setChartType('pie')} />
                    <ChartTypeButton active={chartType === 'bar'} icon={FiBarChart2} label="Batons" onClick={() => setChartType('bar')} />
                    <ChartTypeButton active={chartType === 'horizontal'} icon={FiGrid} label="Bandes" onClick={() => setChartType('horizontal')} />
                    <ChartTypeButton active={chartType === 'line'} icon={FiTrendingUp} label="Courbe" onClick={() => setChartType('line')} />
                    <ChartTypeButton active={chartType === 'area'} icon={FiTrendingUp} label="Aire" onClick={() => setChartType('area')} />
                  </div>
                </div>
                <div className="px-4 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Couleurs</span>
                    {analysisData.slice(0, Math.min(analysisData.length, 8)).map((item, index) => (
                      <label key={`${item.name}-${index}-color`} className="relative group w-7 h-7 border border-gray-300 rounded overflow-hidden cursor-pointer" title={item.name}>
                        <input
                          type="color"
                          value={chartColors[index % chartColors.length] || COLORS[index % COLORS.length]}
                          onChange={(event) => updateChartColor(index, event.target.value)}
                          className="absolute inset-0 w-10 h-10 -m-1 cursor-pointer"
                        />
                        <span className="sr-only">Couleur {item.name}</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => setChartColors(COLORS)}
                      className="h-7 px-2 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 rounded"
                    >
                      Reinitialiser
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <MainChart data={analysisData} chartType={chartType} colors={chartColors} />
                </div>
              </div>

              <InsightPanel
                activeTab={insightTab}
                setActiveTab={setInsightTab}
                health={accountingHealth}
                selectedHealthKey={selectedHealthKey}
                setSelectedHealthKey={setSelectedHealthKey}
                financialFlows={financialFlows}
                selectedFlowKey={selectedFlowKey}
                setSelectedFlowKey={setSelectedFlowKey}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ActivityPanel
                items={activityItems}
                onOpen={(item) => navigate(item.type === 'payment' ? `/comptabilite/paiements/${item.id}` : `/comptabilite/pieces/${item.id}`)}
              />
              <PartnerHighlightsPanel
                partners={displayPartnerHighlights}
                onOpen={(partner) => partner.id && navigate('/comptabilite/pieces', { state: { partnerId: partner.id } })}
              />
            </div>

            <KpiStrip summary={summary} amounts={amounts} onNavigate={navigate} />
          </>
        )}
      </div>
    </div>
    </div>
  );
}

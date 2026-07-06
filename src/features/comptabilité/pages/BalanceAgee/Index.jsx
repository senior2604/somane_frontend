import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiFileText,
  FiFilter,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

const todayIso = () => new Date().toISOString().slice(0, 10);
const getYearStart = () => `${new Date().getFullYear()}-01-01`;

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
  return [];
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const formatAmount = (value) => Math.round(toNumber(value)).toLocaleString('fr-FR');

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const daysBetween = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.floor((to - from) / 86400000);
};

const getLineAmount = (line, mode) => {
  const debit = toNumber(line.debit);
  const credit = toNumber(line.credit);
  if (mode === 'suppliers') return Math.max(credit - debit, 0);
  if (mode === 'customers') return Math.max(debit - credit, 0);
  return Math.abs(debit - credit);
};

const getBucketKey = (dueDate, asOfDate) => {
  const delay = daysBetween(dueDate || asOfDate, asOfDate);
  if (delay <= 0) return 'not_due';
  if (delay <= 30) return 'd0_30';
  if (delay <= 60) return 'd31_60';
  if (delay <= 90) return 'd61_90';
  return 'd90_plus';
};

const bucketLabels = {
  not_due: 'Non echu',
  d0_30: '0-30',
  d31_60: '31-60',
  d61_90: '61-90',
  d90_plus: '+90',
};

const emptyBuckets = () => ({
  not_due: 0,
  d0_30: 0,
  d31_60: 0,
  d61_90: 0,
  d90_plus: 0,
});

const AmountCell = ({ value, strong = false, danger = false }) => {
  const amount = toNumber(value);
  return (
    <span className={`${amount === 0 ? 'text-gray-300' : danger ? 'text-red-600' : 'text-gray-900'} ${strong ? 'font-semibold' : ''}`}>
      {formatAmount(amount)}
    </span>
  );
};

export default function BalanceAgee() {
  const { activeEntity } = useEntity();

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    as_of_date: todayIso(),
    type: 'customers',
    partner: '',
    state: 'all',
    hide_zero: true,
    show_details: false,
  });
  const [partners, setPartners] = useState([]);
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [expandedPartners, setExpandedPartners] = useState({});
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const accountCode = useMemo(() => {
    if (filters.type === 'customers') return '411';
    if (filters.type === 'suppliers') return '401';
    return '';
  }, [filters.type]);

  const loadPartnerOptions = useCallback(async () => {
    if (!activeEntity?.id) return;
    try {
      setLoadingRefs(true);
      const response = await apiClient.get('partenaires/', {
        params: { company: activeEntity.id },
      });
      setPartnerOptions(normalizeList(response?.data || response));
    } catch (err) {
      console.error('Erreur chargement partenaires:', err);
      setPartnerOptions([]);
    } finally {
      setLoadingRefs(false);
    }
  }, [activeEntity]);

  const loadBalanceAgee = useCallback(async () => {
    if (!activeEntity?.id) {
      setError('Veuillez selectionner une entite.');
      setPartners([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {
        company: activeEntity.id,
        date_from: filters.date_from,
        date_to: filters.as_of_date,
        state: filters.state,
      };
      if (filters.partner) params.partner = filters.partner;
      if (accountCode) params.account_code = accountCode;

      const response = await apiClient.get('/compta/move-lines/grand-livre-partenaires/', { params });
      const data = response?.data || response;
      const results = normalizeList(data?.results || data)
        .map((partner) => {
          const buckets = emptyBuckets();
          const detailLines = normalizeList(partner.lines)
            .map((line) => {
              const amount = getLineAmount(line, filters.type);
              const dueDate = line.date_maturity || line.invoice_date || line.date;
              const bucket = getBucketKey(dueDate, filters.as_of_date);
              const delay = Math.max(daysBetween(dueDate, filters.as_of_date), 0);

              buckets[bucket] += amount;

              return {
                ...line,
                due_date: dueDate,
                aging_bucket: bucket,
                aging_label: bucketLabels[bucket],
                delay,
                aging_amount: amount,
              };
            })
            .filter((line) => line.aging_amount !== 0);

          const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);

          return {
            id: partner.partner_id || partner.id || partner.partner_name || 'no_partner',
            partner_id: partner.partner_id || partner.id || null,
            partner_name: partner.partner_name || partner.name || 'Sans partenaire',
            ...buckets,
            total,
            line_count: detailLines.length,
            lines: detailLines,
          };
        })
        .filter((partner) => !filters.hide_zero || partner.total !== 0)
        .sort((a, b) => String(a.partner_name).localeCompare(String(b.partner_name), 'fr'));

      const nextExpanded = {};
      results.forEach((partner) => {
        nextExpanded[partner.id] = filters.show_details && partner.lines.length > 0;
      });

      setPartners(results);
      setExpandedPartners(nextExpanded);
    } catch (err) {
      console.error('Erreur chargement balance agee:', err);
      setError('Impossible de charger la balance agee.');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [accountCode, activeEntity, filters]);

  useEffect(() => {
    loadPartnerOptions();
  }, [loadPartnerOptions]);

  useEffect(() => {
    loadBalanceAgee();
  }, [loadBalanceAgee]);

  const filteredPartners = useMemo(() => {
    const query = normalizeText(searchText);
    if (!query) return partners;

    return partners
      .map((partner) => {
        const partnerText = normalizeText(partner.partner_name);
        const lines = partnerText.includes(query)
          ? partner.lines
          : partner.lines.filter((line) => normalizeText([
              line.date,
              line.due_date,
              line.move_name,
              line.journal_code,
              line.account_code,
              line.label,
              line.matching_number,
            ].filter(Boolean).join(' ')).includes(query));

        if (partnerText.includes(query) || lines.length) return { ...partner, lines };
        return null;
      })
      .filter(Boolean);
  }, [partners, searchText]);

  const totals = useMemo(() => filteredPartners.reduce(
    (acc, partner) => ({
      not_due: acc.not_due + partner.not_due,
      d0_30: acc.d0_30 + partner.d0_30,
      d31_60: acc.d31_60 + partner.d31_60,
      d61_90: acc.d61_90 + partner.d61_90,
      d90_plus: acc.d90_plus + partner.d90_plus,
      total: acc.total + partner.total,
      line_count: acc.line_count + partner.line_count,
    }),
    { ...emptyBuckets(), total: 0, line_count: 0 }
  ), [filteredPartners]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      date_from: getYearStart(),
      as_of_date: todayIso(),
      type: 'customers',
      partner: '',
      state: 'all',
      hide_zero: true,
      show_details: false,
    });
    setSearchText('');
  };

  const togglePartner = (partnerId) => {
    setExpandedPartners((prev) => ({ ...prev, [partnerId]: !prev[partnerId] }));
  };

  const expandAll = () => {
    const nextExpanded = {};
    filteredPartners.forEach((partner) => {
      nextExpanded[partner.id] = true;
    });
    setExpandedPartners(nextExpanded);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredPartners.forEach((partner) => {
      nextExpanded[partner.id] = false;
    });
    setExpandedPartners(nextExpanded);
  };

  const exportCsv = (withDetails = false) => {
    const rows = [
      ['Partenaire', 'Non echu', '0-30', '31-60', '61-90', '+90', 'Total', 'Nb lignes'],
      ...filteredPartners.map((partner) => [
        partner.partner_name,
        partner.not_due,
        partner.d0_30,
        partner.d31_60,
        partner.d61_90,
        partner.d90_plus,
        partner.total,
        partner.line_count,
      ]),
      ['TOTAUX', totals.not_due, totals.d0_30, totals.d31_60, totals.d61_90, totals.d90_plus, totals.total, totals.line_count],
    ];

    if (withDetails) {
      rows.push([]);
      rows.push(['Details']);
      rows.push(['Partenaire', 'Date', 'Echeance', 'Retard', 'Tranche', 'Piece', 'Journal', 'Compte', 'Lettrage', 'Libelle', 'Montant']);
      filteredPartners.forEach((partner) => {
        partner.lines.forEach((line) => {
          rows.push([
            partner.partner_name,
            line.date || '',
            line.due_date || '',
            line.delay,
            line.aging_label,
            line.move_name || '',
            line.journal_code || '',
            line.account_code || '',
            line.matching_number || '',
            line.label || line.name || '',
            line.aging_amount,
          ]);
        });
      });
    }

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-agee-${filters.type}-${filters.as_of_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <FiCalendar className="mx-auto mb-3 text-gray-400" size={34} />
          <h1 className="text-lg font-bold text-gray-900">Balance agee</h1>
          <p className="mt-2 text-sm text-gray-600">Veuillez selectionner une entite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <FiCalendar className="text-purple-600" />
                Balance agee
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Analyse au {formatDate(filters.as_of_date)} par anciennete des echeances
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setShowFilters((value) => !value)} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FiFilter size={15} />
                Filtres
              </button>
              <button type="button" onClick={loadBalanceAgee} disabled={loading} className="h-10 border border-purple-200 px-3 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-60 flex items-center gap-2">
                <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button type="button" onClick={() => exportCsv(false)} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FiDownload size={15} />
                Export
              </button>
              <button type="button" onClick={() => exportCsv(true)} className="h-10 bg-purple-600 px-3 text-sm text-white hover:bg-purple-700 flex items-center gap-2">
                <FiDownload size={15} />
                Export detaille
              </button>
              <button type="button" onClick={() => window.print()} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50" title="Imprimer">
                <FiPrinter size={15} />
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="border-b border-gray-300 bg-gray-50 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-6">
              <label className="text-xs font-medium text-gray-700">
                Depuis
                <input type="date" value={filters.date_from} onChange={(event) => handleFilterChange('date_from', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Date d'analyse
                <input type="date" value={filters.as_of_date} onChange={(event) => handleFilterChange('as_of_date', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Type
                <select value={filters.type} onChange={(event) => handleFilterChange('type', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm">
                  <option value="customers">Clients</option>
                  <option value="suppliers">Fournisseurs</option>
                  <option value="all">Tous</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Partenaire
                <select value={filters.partner} onChange={(event) => handleFilterChange('partner', event.target.value)} disabled={loadingRefs} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm">
                  <option value="">Tous</option>
                  {partnerOptions.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.raison_sociale || partner.display_name || partner.name || partner.nom || `Partenaire ${partner.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Etat
                <select value={filters.state} onChange={(event) => handleFilterChange('state', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm">
                  <option value="all">Tous</option>
                  <option value="posted">Validees</option>
                  <option value="draft">Brouillons</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={filters.hide_zero} onChange={(event) => handleFilterChange('hide_zero', event.target.checked)} />
                  Masquer zero
                </label>
                <button type="button" onClick={resetFilters} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-white" title="Reinitialiser">
                  <FiX size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-b border-gray-300 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative w-full max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Rechercher partenaire, piece, compte..." className="h-10 w-full border border-gray-300 pl-10 pr-3 text-sm" />
            </label>
            <div className="flex flex-wrap gap-5 text-sm">
              <span>Non echu <strong>{formatAmount(totals.not_due)}</strong></span>
              <span>0-30 <strong>{formatAmount(totals.d0_30)}</strong></span>
              <span>31-60 <strong>{formatAmount(totals.d31_60)}</strong></span>
              <span>61-90 <strong>{formatAmount(totals.d61_90)}</strong></span>
              <span>+90 <strong className="text-red-600">{formatAmount(totals.d90_plus)}</strong></span>
              <span>Total <strong>{formatAmount(totals.total)}</strong></span>
            </div>
          </div>
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-sm text-gray-700">
                <th className="border-r border-gray-300 px-3 py-2 text-left font-semibold">Partenaire</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">Non echu</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">0-30</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">31-60</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">61-90</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">+90</th>
                <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">Total</th>
                <th className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Lignes</th>
                <th className="px-3 py-2 text-center font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-500">Chargement de la balance agee...</td></tr>
              ) : filteredPartners.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-500">Aucune donnee pour ces criteres.</td></tr>
              ) : (
                filteredPartners.map((partner) => {
                  const isExpanded = expandedPartners[partner.id] === true;
                  return (
                    <React.Fragment key={partner.id}>
                      <tr className="border-b border-gray-200 hover:bg-purple-50">
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900">{partner.partner_name}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.not_due} /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d0_30} /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d31_60} /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d61_90} /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d90_plus} danger /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.total} strong /></td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-sm text-gray-700">{partner.line_count}</td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => togglePartner(partner.id)} className="inline-flex h-8 w-8 items-center justify-center text-gray-600 hover:text-purple-700" title="Voir les lignes">
                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan="9" className="px-6 py-3">
                            {partner.lines.length === 0 ? (
                              <div className="text-sm text-gray-500">Aucune ligne detaillee.</div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 bg-white">
                                <table className="w-full min-w-[980px] border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2 text-left font-medium">Date</th>
                                      <th className="px-3 py-2 text-left font-medium">Echeance</th>
                                      <th className="px-3 py-2 text-right font-medium">Retard</th>
                                      <th className="px-3 py-2 text-left font-medium">Tranche</th>
                                      <th className="px-3 py-2 text-left font-medium">Piece</th>
                                      <th className="px-3 py-2 text-left font-medium">Journal</th>
                                      <th className="px-3 py-2 text-left font-medium">Compte</th>
                                      <th className="px-3 py-2 text-left font-medium">Lettrage</th>
                                      <th className="px-3 py-2 text-left font-medium">Libelle</th>
                                      <th className="px-3 py-2 text-right font-medium">Montant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partner.lines.map((line, index) => (
                                      <tr key={line.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.date)}</td>
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.due_date)}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{line.delay}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.aging_label}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{line.move_name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.journal_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.account_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.matching_number || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.label || line.name || '-'}</td>
                                        <td className="px-3 py-2 text-right"><AmountCell value={line.aging_amount} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {filteredPartners.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-300 bg-gray-100 text-sm font-bold text-gray-900">
                  <td className="border-r border-gray-300 px-3 py-3">TOTAUX</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.not_due)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d0_30)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d31_60)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d61_90)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right text-red-600">{formatAmount(totals.d90_plus)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.total)}</td>
                  <td className="border-r border-gray-300 px-3 py-3 text-center">{totals.line_count}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-300 bg-gray-50 px-5 py-3 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <FiFileText size={15} />
            {filteredPartners.length} partenaires affiches, {totals.line_count} lignes
          </span>
          <span className="flex items-center gap-2">
            <FiCalendar size={15} />
            Analyse au {formatDate(filters.as_of_date)}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={expandAll} className="text-purple-700 hover:text-purple-900">Ouvrir tous les details</button>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={collapseAll} className="text-purple-700 hover:text-purple-900">Fermer</button>
          </span>
        </div>
      </div>
    </div>
  );
}

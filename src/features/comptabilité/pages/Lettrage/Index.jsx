// src/features/comptabilite/pages/Lettrage/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiChevronDown,
  FiChevronRight,
  FiStar,
} from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../services';

const API = {
  moveLines: 'compta/move-lines/',
};

const classNames = (...values) => values.filter(Boolean).join(' ');

const getMoveLinesParams = (entityId) => ({
  company: entityId || undefined,
  company_id: entityId || undefined,
  move__state: 'posted',
  account__reconcile: true,
  page_size: 2000,
  ordering: '-date,move__name,sequence,id',
  _refresh: Date.now(),
});

const DEFAULT_FILTERS = [];

const DEFAULT_GROUPS = ['account', 'partner'];

const LETTRAGE_MEMORY_KEY = 'comptabilite:lettrage:index:v3';

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'date',
  'journal',
  'move',
  'label',
  'debit',
  'credit',
  'balance',
  'matching',
  'residual',
];

const GROUP_LABELS = {
  move: 'Écriture comptable',
  account: 'Compte',
  partner: 'Partenaire',
  journal: 'Journal',
  date: 'Date comptable',
  invoiceDate: 'Date de facturation',
};

const COLUMN_DEFINITIONS = [
  { id: 'invoiceDate', label: 'Date de facturation', defaultVisible: false },
  { id: 'company', label: 'Société', defaultVisible: false },
  { id: 'date', label: 'Date comptable', defaultVisible: true },
  { id: 'journal', label: 'Journal', defaultVisible: true },
  { id: 'move', label: 'Écriture comptable', defaultVisible: true },
  { id: 'account', label: 'Compte', defaultVisible: false },
  { id: 'partner', label: 'Partenaire', defaultVisible: false },
  { id: 'reference', label: 'Référence', defaultVisible: false },
  { id: 'product', label: 'Produit', defaultVisible: false },
  { id: 'label', label: 'Libellé', defaultVisible: true },
  { id: 'taxes', label: 'Taxes', defaultVisible: false },
  { id: 'taxGrid', label: 'Grilles fiscales', defaultVisible: false },
  { id: 'discountDate', label: 'Date de la remise', defaultVisible: false },
  { id: 'discountAmount', label: 'Montant de la remise', defaultVisible: false },
  { id: 'withholding', label: 'Taxe à la source', defaultVisible: false },
  { id: 'dueDate', label: 'Échéance', defaultVisible: false },
  { id: 'debit', label: 'Débit', defaultVisible: true, numeric: true },
  { id: 'credit', label: 'Crédit', defaultVisible: true, numeric: true },
  { id: 'balance', label: 'Solde', defaultVisible: true, numeric: true },
  { id: 'matching', label: 'Correspondant', defaultVisible: true },
  { id: 'residual', label: 'Résiduel', defaultVisible: true, numeric: true },
];

const DATE_COLUMN_MIN_WIDTH = 98;
const ACCOUNT_COLUMN_MIN_WIDTH = 130;
const MATCHING_COLUMN_WIDTH = 82;

const MATCHING_COLORS = [
  'border-blue-200 bg-blue-50 text-blue-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-orange-200 bg-orange-50 text-orange-700',
  'border-purple-200 bg-purple-50 text-purple-700',
  'border-pink-200 bg-pink-50 text-pink-700',
  'border-cyan-200 bg-cyan-50 text-cyan-700',
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-indigo-200 bg-indigo-50 text-indigo-700',
];

const DATE_FILTER_TYPES = [
  { id: 'accounting', label: 'Date comptable', menuLabel: 'Date comptable' },
  { id: 'invoice', label: 'Date de facturation', menuLabel: 'Date de facturation' },
];

const DATE_PERIOD_OPTIONS = [
  { id: 'year', label: 'Année' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'month', label: 'Mois' },
  { id: 'week', label: 'Semaine' },
  { id: 'day', label: 'Jour' },
  { id: 'custom', label: 'Entre deux dates' },
];

const createEmptyDateFilter = () => ({
  mode: '',
  date: '',
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
  quarter: String(Math.floor(new Date().getMonth() / 3) + 1),
  week: '',
  year: String(new Date().getFullYear()),
  start: '',
  end: '',
});

const createDefaultDateFilters = () => ({
  accounting: createEmptyDateFilter(),
  invoice: createEmptyDateFilter(),
});

const getAutoGroupsStorageKey = (entityId) => `compta-lettrage-auto-groups-${entityId || 'global'}`;

const readAutoGroups = (entityId) => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getAutoGroupsStorageKey(entityId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
};

const writeAutoGroups = (entityId, groups) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getAutoGroupsStorageKey(entityId), JSON.stringify([...new Set(groups.filter(Boolean))]));
  } catch (error) {
    // L'affichage reste fonctionnel même si le navigateur bloque localStorage.
  }
};

const removeAutoGroups = (entityId, groupsToRemove) => {
  const removeSet = new Set(groupsToRemove.map(normalizeMatchingGroup).filter(Boolean));
  if (!removeSet.size) return;
  const remaining = readAutoGroups(entityId).filter((group) => !removeSet.has(normalizeMatchingGroup(group)));
  writeAutoGroups(entityId, remaining);
};

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const asNumber = (value) => {
  const normalized = typeof value === 'string'
    ? value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    : value;
  const number = Number(normalized || 0);
  return Number.isNaN(number) ? 0 : number;
};

const formatDate = (value) => {
  if (!value || value === '0' || value === 0) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (value, currencyCode = '') => {
  const number = Math.round(asNumber(value));
  const normalizedCurrency = String(currencyCode || '').trim().toUpperCase();
  return `${number.toLocaleString('fr-FR')}${normalizedCurrency ? ` ${normalizedCurrency}` : ''}`;
};

const getLineId = (line) => line?.id || `${line?.move || 'move'}-${line?.account || 'account'}-${line?.date || ''}-${line?.name || ''}`;

const getAccountCode = (line) => line?.account_code || line?.account?.code || '';
const getAccountName = (line) => line?.account_name || line?.account?.name || '';
const getJournalCode = (line) => line?.journal_code || line?.journal?.code || '';
const getLineCurrencyCode = (line) => String(
  line?.currency_code ||
  line?.currency?.code ||
  line?.move_currency_code ||
  line?.company_currency_code ||
  ''
).trim().toUpperCase();
const getJournalName = (line) => line?.journal_name || line?.journal?.name || '';
const getMoveName = (line) => line?.move_name || line?.move?.name || '';
const getMoveId = (line) => line?.move?.id || line?.move_id || line?.move || null;
const getPartnerId = (line) => line?.partner || line?.partner_id || line?.partner?.id || '';
const getPartnerName = (line) => (
  line?.partner_name ||
  line?.partner?.raison_sociale ||
  line?.partner?.nom ||
  line?.partner?.name ||
  ''
);
const getPartnerType = (line) => normalizeText(line?.partner_type || line?.partner?.type_partenaire || '');

const getLineDate = (line) => (
  line?.date ||
  line?.move_date ||
  line?.accounting_date ||
  line?.move?.date ||
  line?.move?.accounting_date ||
  line?.create_date ||
  line?.created_at ||
  ''
);

const getLineInvoiceDate = (line) => (
  line?.invoice_date ||
  line?.move_invoice_date ||
  line?.move?.invoice_date ||
  line?.move?.move_invoice_date ||
  ''
);

const getObjectLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return '';
  return (
    value.name ||
    value.label ||
    value.display_name ||
    value.displayName ||
    value.code ||
    ''
  );
};

const inferTaxFromLineLabel = (line) => {
  const label = String(line?.name || '').trim();
  const normalized = normalizeText(label);

  if (line?.withholding_tax_name) return line.withholding_tax_name;
  if (asNumber(line?.withholding_amount)) return 'Retenue';
  if (normalized.includes('retenue')) return label;
  if (normalized.includes('tva')) return label;

  return '';
};

const getTaxes = (line) => {
  const names = [
    ...(Array.isArray(line?.tax_names) ? line.tax_names.map(getObjectLabel) : []),
    ...(Array.isArray(line?.tax_ids) ? line.tax_ids.map(getObjectLabel) : []),
    line?.tax_line_name,
    getObjectLabel(line?.tax_line),
    line?.tax_group_name,
    getObjectLabel(line?.tax_group),
    line?.withholding_tax_name,
    inferTaxFromLineLabel(line),
  ].filter(Boolean);
  return [...new Set(names)].join(', ');
};

const getTaxGrid = (line) => {
  const names = Array.isArray(line?.tax_tag_names) ? line.tax_tag_names : [];
  return names.filter(Boolean).join(', ');
};

const getReference = (line) => line?.move_ref || line?.invoice_origin || line?.reference || '';

const getMatching = (line) => {
  if (line?.matching_number) return line.matching_number;
  if (line?.full_reconcile_name) return line.full_reconcile_name;
  if ((line?.matched_credit_ids || []).length || (line?.matched_debit_ids || []).length) return 'Partiel';
  return '';
};

const isAutoReconcileLine = (line) => Boolean(
  line?.is_auto_reconcile ||
  line?.auto_reconcile ||
  String(line?.reconcile_origin || '').toLowerCase() === 'automatic' ||
  String(line?.matching_origin || '').toLowerCase() === 'automatic' ||
  String(line?.reconcile_group_origin || '').toLowerCase() === 'automatic' ||
  line?.metadata?.is_auto_reconcile ||
  line?.metadata?.auto_reconcile ||
  String(line?.metadata?.reconcile_origin || '').toLowerCase() === 'automatic'
);

const normalizeMatchingGroup = (value) => String(value || '').replace(/^Ⓐ\s*/u, '').trim();

const normalizeMatchingGroups = (groups) => [
  ...new Set(
    groups
      .map(normalizeMatchingGroup)
      .filter(Boolean)
      .filter((group) => !['0', 'false', 'true', 'null', 'undefined'].includes(group.toLowerCase()))
  ),
];

const extractMatchingGroupsFromValue = (value) => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(extractMatchingGroupsFromValue);
  if (typeof value !== 'object') return [];

  return [
    value.matching_number,
    value.matching_numbers,
    value.matching_name,
    value.matching_names,
    value.matching_group,
    value.matching_groups,
    value.created_matching_numbers,
    value.created_groups,
    value.auto_groups,
    value.automatic_groups,
    value.reconcile_group,
    value.reconcile_groups,
    value.full_reconcile_name,
    value.full_reconcile_names,
    value.lines,
    value.results,
    value.data,
  ].flatMap(extractMatchingGroupsFromValue);
};

const getMatchingDisplay = (line) => {
  const matching = normalizeMatchingGroup(getMatching(line));
  if (!matching) return '';
  return isAutoReconcileLine(line) ? `Ⓐ ${matching}` : matching;
};

const markAutomaticGroups = (rawLines, entityId) => {
  const autoGroups = new Set(readAutoGroups(entityId).map(normalizeMatchingGroup));
  if (!autoGroups.size) return rawLines;
  return rawLines.map((line) => {
    const group = normalizeMatchingGroup(getMatching(line));
    if (!group || !autoGroups.has(group)) return line;
    return { ...line, is_auto_reconcile: true, reconcile_origin: 'automatic' };
  });
};

const getMatchingColorClass = (value) => {
  const group = normalizeMatchingGroup(value);
  if (!group) return 'border-gray-200 bg-gray-50 text-gray-400';
  const hash = Array.from(group).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return MATCHING_COLORS[hash % MATCHING_COLORS.length];
};

const getMoveState = (line) => normalizeText(line?.move_state || line?.move?.state || line?.state || '');

const isPosted = (line) => ['posted', 'post', 'valid', 'valide', 'comptabilise', 'comptabilisee'].includes(getMoveState(line));
const isFullyReconciled = (line) => Boolean(line?.full_reconcile_id || line?.full_reconcile_name);
const isLettableAccount = (line) => Boolean(
  line?.account_reconcile ||
  line?.is_account_reconcile ||
  line?.account?.reconcile
);
const isMatched = (line) => Boolean(
  isFullyReconciled(line) ||
  line?.reconciled ||
  line?.matching_number ||
  (line?.matched_credit_ids || []).length ||
  (line?.matched_debit_ids || []).length
);
const isPartiallyReconciled = (line) => Boolean(
  !isFullyReconciled(line) &&
  (
    line?.matching_number ||
    (line?.matched_credit_ids || []).length ||
    (line?.matched_debit_ids || []).length
  )
);
const isWithResidualFilterLine = (line) => !isFullyReconciled(line) && (!isMatched(line) || isPartiallyReconciled(line));

const getCompanyKey = (line) => line?.company || line?.company_id || line?.company?.id || line?.company_name || '';
const getAccountKey = (line) => line?.account || line?.account_id || line?.account?.id || getAccountCode(line);
const getPartnerKey = (line) => getPartnerId(line) || getPartnerName(line) || 'Sans partenaire';
const isOpenForMatching = (line) => !isFullyReconciled(line) && getLineResidual(line) > 0;

const getLineBalance = (line) => {
  const debit = asNumber(line?.debit);
  const credit = asNumber(line?.credit);
  const storedBalance = asNumber(line?.balance);

  if (storedBalance !== 0 || (!debit && !credit)) return storedBalance;
  return debit - credit;
};

const getLineResidual = (line) => {
  const storedResidual = asNumber(line?.amount_residual);
  if (isFullyReconciled(line)) return 0;
  if (storedResidual) return Math.abs(storedResidual);
  if (line?.reconciled) return 0;
  return Math.abs(getLineBalance(line));
};

const nearlyZero = (value) => Math.abs(asNumber(value)) < 0.01;

const getSelectionIssue = (selection) => {
  if (selection.length < 2) return 'Sélectionnez au moins deux lignes à lettrer.';
  if (!selection.every(isPosted)) return 'Seules les écritures comptabilisées peuvent être lettrées.';
  if (!selection.every(isLettableAccount)) return 'Le compte sélectionné n’est pas marqué comme lettrable.';
  if (!selection.every(isOpenForMatching)) return 'La sélection contient une ligne déjà lettrée ou sans résiduel.';

  const companyKeys = new Set(selection.map(getCompanyKey).filter(Boolean));
  const accountKeys = new Set(selection.map(getAccountKey).filter(Boolean));
  const partnerKeys = new Set(selection.map(getPartnerKey).filter(Boolean));
  const currencyCodes = new Set(selection.map(getLineCurrencyCode).filter(Boolean));
  if (companyKeys.size > 1) return 'Les lignes doivent appartenir à la même société.';
  if (accountKeys.size !== 1) return 'Les lignes doivent utiliser le même compte.';
  if (partnerKeys.size !== 1) return 'Les lignes doivent concerner le même partenaire.';
  if (currencyCodes.size > 1) {
    return `Le lettrage doit se faire dans une seule devise. Devises détectées : ${Array.from(currencyCodes).join(' / ')}.`;
  }

  const totalDebit = selection.reduce((sum, line) => sum + asNumber(line?.debit), 0);
  const totalCredit = selection.reduce((sum, line) => sum + asNumber(line?.credit), 0);
  if (!totalDebit || !totalCredit) return 'La sélection doit contenir au moins un débit et un crédit.';

  return '';
};

const getSelectionMode = (selection) => {
  if (getSelectionIssue(selection)) return null;
  const totalDebit = selection.reduce((sum, line) => sum + asNumber(line?.debit), 0);
  const totalCredit = selection.reduce((sum, line) => sum + asNumber(line?.credit), 0);
  if (nearlyZero(totalDebit - totalCredit)) return 'full';
  if (Math.max(totalDebit, totalCredit) >= Math.min(totalDebit, totalCredit)) return 'partial';
  return null;
};

const getSearchText = (line) => [
  formatDate(getLineDate(line)),
  formatDate(getLineInvoiceDate(line)),
  getJournalCode(line),
  getJournalName(line),
  getMoveName(line),
  getReference(line),
  getAccountCode(line),
  getAccountName(line),
  getPartnerName(line),
  line?.name,
  getTaxes(line),
  getTaxGrid(line),
  getMatchingDisplay(line),
].filter(Boolean).join(' ');

const getColumnValue = (line, columnId) => {
  if (columnId === 'invoiceDate') return formatDate(getLineInvoiceDate(line));
  if (columnId === 'company') return line?.company_name || '';
  if (columnId === 'date') return formatDate(getLineDate(line));
  if (columnId === 'journal') return getJournalCode(line);
  if (columnId === 'move') return getMoveName(line);
  if (columnId === 'account') return [getAccountCode(line), getAccountName(line)].filter(Boolean).join(' ');
  if (columnId === 'partner') return getPartnerName(line);
  if (columnId === 'reference') return getReference(line);
  if (columnId === 'product') return line?.product_name || '';
  if (columnId === 'label') return line?.name || '';
  if (columnId === 'taxes') return getTaxes(line);
  if (columnId === 'taxGrid') return getTaxGrid(line);
  if (columnId === 'discountDate') return formatDate(line?.discount_date);
  if (columnId === 'discountAmount') return asNumber(line?.discount_amount_currency || line?.discount_balance || 0);
  if (columnId === 'withholding') return line?.withholding_tax_name || (asNumber(line?.withholding_amount) ? formatAmount(line?.withholding_amount, line?.currency_code) : '');
  if (columnId === 'dueDate') return formatDate(line?.date_maturity || line?.move_invoice_date_due);
  if (columnId === 'debit') return asNumber(line?.debit);
  if (columnId === 'credit') return asNumber(line?.credit);
  if (columnId === 'balance') return getLineBalance(line);
  if (columnId === 'matching') return getMatchingDisplay(line);
  if (columnId === 'residual') return getLineResidual(line);
  return '';
};

const getDateFilterSource = (line, type) => (
  type === 'invoice' ? getLineInvoiceDate(line) : getLineDate(line)
);

const parseLocalDate = (value) => {
  if (!value || value === '0' || value === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sameLocalDay = (left, right) => (
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()
);

const getWeekRange = (weekValue) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekValue || '');
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!year || !week) return null;

  const firstWeekDate = new Date(year, 0, 4);
  const firstWeekDay = firstWeekDate.getDay() || 7;
  const start = new Date(firstWeekDate);
  start.setDate(firstWeekDate.getDate() - firstWeekDay + 1 + ((week - 1) * 7));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const isLineInSingleDateFilter = (line, type, dateFilter) => {
  if (!dateFilter.mode) return true;
  const lineDate = parseLocalDate(getDateFilterSource(line, type));
  if (!lineDate) return false;

  if (dateFilter.mode === 'day') {
    const expected = parseLocalDate(dateFilter.date);
    return expected ? sameLocalDay(lineDate, expected) : true;
  }
  if (dateFilter.mode === 'month') {
    const month = Number(dateFilter.month);
    const year = Number(dateFilter.year);
    return month && year ? lineDate.getMonth() + 1 === month && lineDate.getFullYear() === year : true;
  }
  if (dateFilter.mode === 'quarter') {
    const quarter = Number(dateFilter.quarter);
    const year = Number(dateFilter.year);
    const lineQuarter = Math.floor(lineDate.getMonth() / 3) + 1;
    return quarter && year ? lineQuarter === quarter && lineDate.getFullYear() === year : true;
  }
  if (dateFilter.mode === 'week') {
    const range = getWeekRange(dateFilter.week);
    return range ? lineDate >= range.start && lineDate <= range.end : true;
  }
  if (dateFilter.mode === 'year') {
    const year = Number(dateFilter.year);
    return year ? lineDate.getFullYear() === year : true;
  }
  if (dateFilter.mode === 'custom') {
    const start = parseLocalDate(dateFilter.start);
    const end = parseLocalDate(dateFilter.end);
    if (start && lineDate < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (lineDate > endOfDay) return false;
    }
  }
  return true;
};

const isLineInDateFilters = (line, dateFilters) => (
  DATE_FILTER_TYPES.every((type) => isLineInSingleDateFilter(line, type.id, dateFilters[type.id] || createEmptyDateFilter()))
);

const hasActiveDateFilters = (dateFilters) => (
  DATE_FILTER_TYPES.some((type) => Boolean(dateFilters[type.id]?.mode))
);

const formatDateFilterSummary = (type, dateFilter) => {
  if (!dateFilter.mode) return '';
  const typeLabel = DATE_FILTER_TYPES.find((item) => item.id === type)?.label || 'Date';
  if (dateFilter.mode === 'day') return `${typeLabel} • ${formatDate(dateFilter.date) || 'Jour'}`;
  if (dateFilter.mode === 'month') return `${typeLabel} • ${dateFilter.month || '--'}/${dateFilter.year || '----'}`;
  if (dateFilter.mode === 'quarter') return `${typeLabel} • T${dateFilter.quarter || '-'} ${dateFilter.year || '----'}`;
  if (dateFilter.mode === 'week') return `${typeLabel} • ${dateFilter.week || 'Semaine'}`;
  if (dateFilter.mode === 'year') return `${typeLabel} • Année ${dateFilter.year || '----'}`;
  if (dateFilter.mode === 'custom') {
    return `${typeLabel} • Du ${formatDate(dateFilter.start) || '--'} au ${formatDate(dateFilter.end) || '--'}`;
  }
  return typeLabel;
};

const getDateFilterSummaries = (dateFilters) => (
  DATE_FILTER_TYPES
    .map((type) => ({ id: type.id, label: formatDateFilterSummary(type.id, dateFilters[type.id] || createEmptyDateFilter()) }))
    .filter((item) => item.label)
);

const buildGroupKey = (line, groupId) => {
  if (groupId === 'account') {
    const code = getAccountCode(line) || 'Sans compte';
    const name = getAccountName(line);
    return {
      key: `account-${code}`,
      label: [code, name].filter(Boolean).join(' '),
      shortLabel: code,
      emptyLabel: 'Sans compte',
    };
  }
  if (groupId === 'partner') {
    const name = getPartnerName(line) || 'Sans partenaire';
    return { key: `partner-${name}`, label: name, shortLabel: name, emptyLabel: 'Sans partenaire' };
  }
  if (groupId === 'journal') {
    const code = getJournalCode(line) || 'Sans journal';
    const name = getJournalName(line);
    return { key: `journal-${code}`, label: [code, name].filter(Boolean).join(' '), shortLabel: code, emptyLabel: 'Sans journal' };
  }
  if (groupId === 'move') {
    const name = getMoveName(line) || 'Sans écriture';
    return { key: `move-${name}`, label: name, emptyLabel: 'Sans écriture' };
  }
  if (groupId === 'date') {
    const date = formatDate(getLineDate(line)) || 'Sans date comptable';
    return { key: `date-${date}`, label: date, shortLabel: date, emptyLabel: 'Sans date comptable' };
  }
  if (groupId === 'invoiceDate') {
    const date = formatDate(getLineInvoiceDate(line)) || 'Sans date de facturation';
    return { key: `invoice-date-${date}`, label: date, shortLabel: date, emptyLabel: 'Sans date de facturation' };
  }
  return { key: 'all', label: 'Toutes les ecritures', shortLabel: 'Toutes les ecritures', emptyLabel: 'Toutes les ecritures' };
};

const summarizeLines = (lines) => ({
  debit: lines.reduce((sum, line) => sum + asNumber(line?.debit), 0),
  credit: lines.reduce((sum, line) => sum + asNumber(line?.credit), 0),
  balance: lines.reduce((sum, line) => sum + getLineBalance(line), 0),
  residual: lines.reduce((sum, line) => sum + getLineResidual(line), 0),
});

const sortLinesForDisplay = (lines) => [...lines].sort((a, b) => {
  const dateCompare = String(b?.date || '').localeCompare(String(a?.date || ''));
  if (dateCompare) return dateCompare;

  const moveCompare = getMoveName(a).localeCompare(getMoveName(b), 'fr', { numeric: true });
  if (moveCompare) return moveCompare;

  const accountCompare = getAccountCode(a).localeCompare(getAccountCode(b), 'fr', { numeric: true });
  if (accountCompare) return accountCompare;

  const partnerCompare = getPartnerName(a).localeCompare(getPartnerName(b), 'fr', { numeric: true });
  if (partnerCompare) return partnerCompare;

  const sequenceCompare = asNumber(a?.sequence) - asNumber(b?.sequence);
  if (sequenceCompare) return sequenceCompare;

  return asNumber(a?.id) - asNumber(b?.id);
});

const createGroupTree = (lines, groupBy, depth = 0, parentKey = 'root') => {
  if (depth >= groupBy.length) return lines;
  const groupId = groupBy[depth];
  const map = new Map();

  lines.forEach((line) => {
    const group = buildGroupKey(line, groupId);
    const treeKey = `${parentKey}::${group.key}`;
    if (!map.has(treeKey)) {
      map.set(treeKey, {
        ...group,
        key: treeKey,
        rawKey: group.key,
        groupId,
        depth,
        lines: [],
      });
    }
    map.get(treeKey).lines.push(line);
  });

  return Array.from(map.values())
    .sort((a, b) => String(a.shortLabel || a.label || '').localeCompare(String(b.shortLabel || b.label || ''), 'fr', { numeric: true }))
    .map((group) => ({
      ...group,
      summary: summarizeLines(group.lines),
      children: createGroupTree(group.lines, groupBy, depth + 1, group.key),
    }));
};

function LettrageIndex() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeEntity } = useEntity();
  const unifiedMemoryApiRef = useRef(null);
  const skipPageResetRef = useRef(false);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [autoReconciling, setAutoReconciling] = useState(false);
  const [unreconciling, setUnreconciling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUPS);
  const [openGroups, setOpenGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAutoDialog, setShowAutoDialog] = useState(false);
  const [autoMode, setAutoMode] = useState('reference');
  const [autoScopeLines, setAutoScopeLines] = useState(null);
  const [openDateFilters, setOpenDateFilters] = useState(() => ({ accounting: false, invoice: false }));
  const [dateFilters, setDateFilters] = useState(() => createDefaultDateFilters());
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(() => (
    COLUMN_DEFINITIONS.reduce((acc, column) => ({
      ...acc,
      [column.id]: DEFAULT_VISIBLE_COLUMN_IDS.includes(column.id),
    }), {})
  ));

  const restoreLettrageMemory = useCallback((saved) => {
    if (!saved || typeof saved !== 'object') return;
    skipPageResetRef.current = true;

    if (typeof saved.search === 'string') setSearch(saved.search);
    if (Array.isArray(saved.activeFilters)) setActiveFilters(saved.activeFilters);
    if (Array.isArray(saved.groupBy)) setGroupBy(saved.groupBy);
    if (saved.openGroups && typeof saved.openGroups === 'object') setOpenGroups(saved.openGroups);
    if (Array.isArray(saved.selectedIds)) setSelectedIds(saved.selectedIds);
    setOpenDateFilters({ accounting: false, invoice: false });
    if (saved.dateFilters && typeof saved.dateFilters === 'object') setDateFilters(saved.dateFilters);
    if (saved.itemsPerPage) setItemsPerPage(Number(saved.itemsPerPage) || 50);
    if (saved.currentPage) setCurrentPage(Number(saved.currentPage) || 1);
    if (saved.columnWidths && typeof saved.columnWidths === 'object') setColumnWidths(saved.columnWidths);
    if (saved.visibleColumns && typeof saved.visibleColumns === 'object') {
      setVisibleColumns((prev) => ({ ...prev, ...saved.visibleColumns }));
    }

  }, []);

  const fetchLines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const response = await apiClient.get(API.moveLines, {
        params: getMoveLinesParams(entityId),
      });
      const rawLines = normalizeApiList(response?.data ?? response);
      setLines(markAutomaticGroups(rawLines, entityId));
    } catch (err) {
      setLines([]);
      setError('Impossible de charger le lettrage.');
      console.error('Erreur chargement lettrage', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [search, activeFilters, groupBy, itemsPerPage, dateFilters]);

  const hasFilter = (id) => activeFilters.some((filter) => filter.id === id);

  const toggleFilter = (filter) => {
    setActiveFilters((prev) => (
      prev.some((item) => item.id === filter.id)
        ? prev.filter((item) => item.id !== filter.id)
        : [...prev, filter]
    ));
  };

  const updateDateFilter = (type, patch) => {
    setDateFilters((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || createEmptyDateFilter()),
        ...patch,
      },
    }));
  };

  const clearDateFilter = (type) => {
    setDateFilters((prev) => ({
      ...prev,
      [type]: createEmptyDateFilter(),
    }));
  };

  const toggleGroup = (groupId) => {
    setGroupBy((prev) => (
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    ));
  };

  const filteredLines = useMemo(() => {
    const statusFilterIds = ['unreconciled', 'partialReconciled', 'withResidual', 'completeReconciled'];
    const selectedStatusFilters = activeFilters.filter((filter) => statusFilterIds.includes(filter.id));
    let next = lines.filter((line) => isPosted(line) && isLettableAccount(line));

    if (!selectedStatusFilters.length) {
      next = next.filter(isWithResidualFilterLine);
    } else {
      next = next.filter((line) => selectedStatusFilters.some((filter) => {
        if (filter.id === 'unreconciled') return !isMatched(line);
        if (filter.id === 'partialReconciled') return isPartiallyReconciled(line);
        if (filter.id === 'withResidual') return isWithResidualFilterLine(line);
        if (filter.id === 'completeReconciled') return isFullyReconciled(line);
        return false;
      }));
    }

    next = next.filter((line) => isLineInDateFilters(line, dateFilters));

    if (search.trim()) {
      const value = normalizeText(search);
      next = next.filter((line) => normalizeText(getSearchText(line)).includes(value));
    }

    activeFilters.forEach((filter) => {
      if (filter.id === 'supplier') next = next.filter((line) => getPartnerType(line).includes('fournisseur') || getAccountCode(line).startsWith('401'));
      if (filter.id === 'customer') next = next.filter((line) => getPartnerType(line).includes('client') || getAccountCode(line).startsWith('411'));
      if (filter.id === 'posted') next = next.filter(isPosted);
    });

    return next;
  }, [activeFilters, dateFilters, lines, search]);

  const sortedLines = useMemo(() => sortLinesForDisplay(filteredLines), [filteredLines]);
  const activeVisibleColumns = COLUMN_DEFINITIONS.filter((column) => visibleColumns[column.id]);
  const selectedLineIds = useMemo(() => (
    sortedLines
      .filter((line) => selectedIds.includes(getLineId(line)))
      .map((line) => line.id)
      .filter(Boolean)
  ), [selectedIds, sortedLines]);
  const selectedLines = useMemo(() => (
    sortedLines.filter((line) => selectedIds.includes(getLineId(line)))
  ), [selectedIds, sortedLines]);
  const dateFilterSummaries = useMemo(() => getDateFilterSummaries(dateFilters), [dateFilters]);
  const selectedSummary = useMemo(() => summarizeLines(selectedLines), [selectedLines]);
  const selectedCurrencyCodes = useMemo(() => (
    Array.from(new Set(selectedLines.map(getLineCurrencyCode).filter(Boolean)))
  ), [selectedLines]);
  const selectedCurrencyCode = selectedCurrencyCodes.length === 1 ? selectedCurrencyCodes[0] : '';
  const selectionIssue = useMemo(() => getSelectionIssue(selectedLines), [selectedLines]);
  const selectionMode = useMemo(() => getSelectionMode(selectedLines), [selectedLines]);
  const canReconcileSelection = Boolean(selectionMode);
  const canUnreconcileSelection = selectedLines.some(isMatched);
  const getColumnWidthStyle = (columnId) => (
    columnWidths[columnId]
      ? { width: columnWidths[columnId], maxWidth: columnWidths[columnId] }
      : columnId === 'date'
        ? { minWidth: DATE_COLUMN_MIN_WIDTH }
        : columnId === 'account'
          ? { minWidth: ACCOUNT_COLUMN_MIN_WIDTH }
          : columnId === 'matching'
            ? { width: MATCHING_COLUMN_WIDTH, maxWidth: MATCHING_COLUMN_WIDTH }
            : undefined
  );

  const toggleOpenGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const toggleLineSelection = (id) => {
    const line = sortedLines.find((item) => getLineId(item) === id);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);

      const currentSelection = sortedLines.filter((item) => prev.includes(getLineId(item)));
      if (currentSelection.length && line) {
        const first = currentSelection[0];
        const sameContext = (
          getCompanyKey(first) === getCompanyKey(line) &&
          getAccountKey(first) === getAccountKey(line) &&
          getPartnerKey(first) === getPartnerKey(line)
        );
        if (!sameContext) {
          setError('Sélection impossible : choisissez des lignes de la même société, du même compte et du même partenaire.');
          setSuccess('');
          return prev;
        }
      }

      setError('');
      return [...prev, id];
    });
  };

  const handleReconcileSelected = async () => {
    if (!canReconcileSelection) {
      setError(selectionIssue || 'La sélection ne respecte pas les règles de lettrage.');
      setSuccess('');
      return;
    }

    setReconciling(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('compta/move-lines/reconcile/', {
        line_ids: selectedLineIds,
      });
      const data = response?.data ?? response ?? {};
      setSuccess(data?.detail || `${selectionMode === 'partial' ? 'Lettrage partiel' : 'Lettrage'} effectué${data?.matching_number ? ` (${data.matching_number})` : ''}.`);
      setSelectedIds([]);
      await fetchLines();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Échec du lettrage.';
      setError(detail);
      console.error('Erreur lettrage', err);
    } finally {
      setReconciling(false);
    }
  };

  const handleAutoReconcile = async (mode = 'amount', scopeLines = null) => {
    setAutoReconciling(true);
    setError('');
    setSuccess('');
    try {
      const entityId = activeEntity?.id;
      const groupsBefore = new Set(lines.map(getMatching).map(normalizeMatchingGroup).filter(Boolean));
      const payload = { mode };
      const scopedLineIds = Array.isArray(scopeLines)
        ? scopeLines.map((line) => line?.id).filter(Boolean)
        : [];
      if (scopedLineIds.length) payload.line_ids = scopedLineIds;

      const response = await apiClient.post('compta/move-lines/auto-reconcile/', payload);
      const data = response?.data ?? response ?? {};

      const refreshedResponse = await apiClient.get(API.moveLines, {
        params: getMoveLinesParams(entityId),
      });
      const rawLines = normalizeApiList(refreshedResponse?.data ?? refreshedResponse);
      const newGroups = rawLines
        .map(getMatching)
        .map(normalizeMatchingGroup)
        .filter(Boolean)
        .filter((group) => !groupsBefore.has(group));
      const automaticGroups = normalizeMatchingGroups([
        ...extractMatchingGroupsFromValue(data),
        ...newGroups,
      ]);

      if (automaticGroups.length) {
        writeAutoGroups(entityId, [...readAutoGroups(entityId), ...automaticGroups]);
      }
      setLines(markAutomaticGroups(rawLines, entityId));
      setSuccess(data?.detail || 'Lettrage automatique terminé.');
      setSelectedIds([]);
      setOpenGroups({});
      setCurrentPage(1);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Échec du lettrage automatique.';
      setError(detail);
      console.error('Erreur lettrage automatique', err);
    } finally {
      setAutoReconciling(false);
    }
  };

  const handleUnreconcileSelected = async () => {
    if (!canUnreconcileSelection) {
      setError('Sélectionnez au moins une ligne lettrée ou partiellement lettrée à délettrer.');
      setSuccess('');
      return;
    }

    setUnreconciling(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('compta/move-lines/unreconcile/', {
        line_ids: selectedLineIds,
      });
      const data = response?.data ?? response ?? {};
      removeAutoGroups(activeEntity?.id, selectedLines.map(getMatching));
      setSuccess(data?.detail || 'Délettrage effectué.');
      setSelectedIds([]);
      await fetchLines();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Échec du délettrage.';
      setError(detail);
      console.error('Erreur delettrage', err);
    } finally {
      setUnreconciling(false);
    }
  };

  const renderAmount = (columnId, value, line) => {
    if (!['debit', 'credit', 'balance', 'residual', 'discountAmount'].includes(columnId)) return value || '';
    return <span className="whitespace-nowrap tabular-nums">{formatAmount(value, getLineCurrencyCode(line))}</span>;
  };

  const renderCell = (line, column) => {
    const value = getColumnValue(line, column.id);
    if (column.id === 'move') {
      const moveId = getMoveId(line);
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (moveId) {
              unifiedMemoryApiRef.current?.saveNow?.();
              navigate(`/comptabilite/pieces/${moveId}`, {
                state: {
                  returnTo: `${location.pathname}${location.search || ''}`,
                  returnContext: {
                    returnTo: `${location.pathname}${location.search || ''}`,
                    memoryKey: LETTRAGE_MEMORY_KEY,
                    source: 'lettrage',
                  },
                },
              });
            }
          }}
          className="block w-full truncate text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
        >
          {value || '-'}
        </button>
      );
    }
    if (column.id === 'matching') {
      if (!value) return <span className="text-gray-400">Non lettré</span>;
      return (
        <span
          className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none ${getMatchingColorClass(value)}`}
          title={value}
        >
          <span className="truncate">{value}</span>
        </span>
      );
    }
    if (column.id === 'account') {
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900">{getAccountCode(line) || '-'}</div>
          {getAccountName(line) && <div className="truncate text-[11px] text-gray-500">{getAccountName(line)}</div>}
        </div>
      );
    }
    if (column.id === 'taxes' || column.id === 'taxGrid') {
      return value || <span className="text-gray-400">-</span>;
    }
    if (column.numeric) return renderAmount(column.id, value, line);
    return value || '';
  };

  const getCellTitle = (line, column) => {
    const value = getColumnValue(line, column.id);
    if (column.id === 'account') return [getAccountCode(line), getAccountName(line)].filter(Boolean).join(' ');
    if (column.numeric) return formatAmount(value, getLineCurrencyCode(line));
    return String(value || '');
  };

  const renderGroupRows = (nodes, depth = 0, stripeState = { index: 0 }, getStripeClassName) => nodes.flatMap((node) => {
    if (Array.isArray(node)) return node.map((line) => {
      const stripeIndex = stripeState.index;
      stripeState.index += 1;
      return renderLineRow(line, depth, stripeIndex, getStripeClassName);
    });
    if (!node || !Array.isArray(node.lines) || !Array.isArray(node.children)) {
      const stripeIndex = stripeState.index;
      stripeState.index += 1;
      return renderLineRow(node, depth, stripeIndex, getStripeClassName);
    }

    const open = openGroups[node.key] ?? true;
    const summary = node.summary || summarizeLines(node.lines);
    const groupLabel = GROUP_LABELS[node.groupId] || node.groupId || 'Groupe';
    const groupIndent = depth * 22;
    const summaryColumnIds = ['debit', 'credit', 'balance', 'residual'];
    const firstSummaryIndex = activeVisibleColumns.findIndex((column) => summaryColumnIds.includes(column.id));
    const labelColSpan = firstSummaryIndex > 0 ? firstSummaryIndex : activeVisibleColumns.length;
    const summaryColumns = activeVisibleColumns.slice(labelColSpan);
    const getSummaryValue = (columnId) => {
      if (columnId === 'debit') return summary.debit;
      if (columnId === 'credit') return summary.credit;
      if (columnId === 'balance') return summary.balance;
      if (columnId === 'residual') return summary.residual;
      return null;
    };
    const rows = [
      <tr key={node.key} className={depth === 0 ? 'bg-gray-50' : 'bg-white'}>
        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
        <td colSpan={Math.max(1, labelColSpan)} className="border-r border-gray-100 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toggleOpenGroup(node.key)}
              className="flex min-w-0 items-center gap-2 text-left"
              style={{ paddingLeft: groupIndent }}
            >
              {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${depth === 0 ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                {groupLabel}
              </span>
              <span className={`font-semibold ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {node.label || node.emptyLabel}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoScopeLines(node.lines || null);
                setShowAutoDialog(true);
              }}
              disabled={autoReconciling}
              className="ml-2 shrink-0 text-xs font-medium text-teal-700 hover:text-purple-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Lettrage automatique
            </button>
            <span className="shrink-0 text-xs font-semibold text-gray-700">({node.lines.length})</span>
          </div>
        </td>
        {summaryColumns.map((column) => {
          const summaryValue = getSummaryValue(column.id);
          return (
            <td
              key={`${node.key}-${column.id}`}
              className={`px-2 py-1.5 text-xs font-semibold text-gray-700 ${summaryValue === null ? 'text-left' : 'whitespace-nowrap text-right tabular-nums'}`}
            >
              {summaryValue === null ? '' : formatAmount(summaryValue)}
            </td>
          );
        })}
        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
      </tr>,
    ];
    if (open) rows.push(...renderGroupRows(node.children || [], depth + 1, stripeState, getStripeClassName));
    return rows;
  });

  const renderLineRow = (line, lineDepth = 0, stripeIndex = 0, getStripeClassName = () => 'bg-white') => {
    if (!line) return null;
    const id = getLineId(line);
    const selected = selectedIds.includes(id);
    return (
      <tr
        key={id}
        onClick={() => toggleLineSelection(id)}
        className={`cursor-pointer border-b border-gray-200 transition-colors duration-150 ${selected ? 'bg-purple-50' : `${getStripeClassName(stripeIndex)} hover:bg-purple-50/40`}`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleLineSelection(id)}
            className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
          />
        </td>
        {activeVisibleColumns.map((column, index) => (
          <td
            key={`${id}-${column.id}`}
            title={getCellTitle(line, column)}
            className={`border-r border-gray-100 px-2 py-1.5 text-xs text-gray-700 ${
              column.numeric
                ? 'w-max whitespace-nowrap text-right tabular-nums'
                : column.id === 'date' || column.id === 'invoiceDate'
                  ? 'whitespace-nowrap text-left'
                  : 'max-w-0 text-left'
            }`}
            style={{
              ...(getColumnWidthStyle(column.id) || {}),
              ...(index === 0 && lineDepth > 0 ? { paddingLeft: 12 + (lineDepth * 18) } : {}),
            }}
          >
            <div className={`block min-w-0 ${
              column.id === 'account' || column.id === 'date' || column.id === 'invoiceDate' ? '' : 'truncate'
            } ${column.numeric ? 'w-max whitespace-nowrap text-right tabular-nums' : 'text-left'}`}>
              {renderCell(line, column)}
            </div>
          </td>
        ))}
        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
      </tr>
    );
  };

  const visibleColumnIds = COLUMN_DEFINITIONS
    .filter((column) => visibleColumns[column.id])
    .map((column) => column.id);

  const unifiedColumns = COLUMN_DEFINITIONS.map((column) => ({
    ...column,
    sortType: ['invoiceDate', 'date', 'discountDate', 'dueDate'].includes(column.id) ? 'date' : column.sortType,
    sortValue: (line) => {
      if (column.id === 'invoiceDate') return getLineInvoiceDate(line);
      if (column.id === 'date') return getLineDate(line);
      if (column.id === 'discountDate') return line?.discount_date;
      if (column.id === 'dueDate') return line?.date_maturity || line?.move_invoice_date_due;
      return getColumnValue(line, column.id);
    },
    minWidth: column.id === 'date'
      ? DATE_COLUMN_MIN_WIDTH
      : column.id === 'account'
        ? ACCOUNT_COLUMN_MIN_WIDTH
        : undefined,
    width: column.id === 'matching' ? MATCHING_COLUMN_WIDTH : undefined,
  }));

  const filterChips = [
    ...groupBy.map((id, index) => ({
      id: `group:${id}`,
      label: `${index > 0 ? '> ' : ''}${GROUP_LABELS[id] || id}`,
      kind: 'group',
      value: id,
    })),
    ...activeFilters.map((filter) => ({
      id: `filter:${filter.id}`,
      label: filter.label,
      kind: 'filter',
      value: filter,
    })),
    ...dateFilterSummaries.map((filter) => ({
      id: `date:${filter.id}`,
      label: filter.label,
      kind: 'date',
      value: filter.id,
    })),
  ];

  const handleRemoveFilterChip = (chip) => {
    if (chip.kind === 'group') toggleGroup(chip.value);
    if (chip.kind === 'filter') toggleFilter(chip.value);
    if (chip.kind === 'date') clearDateFilter(chip.value);
  };

  const renderLettrageFilters = ({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.4fr)]">
      <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r">
        <p className="mb-2 font-semibold text-gray-800">Ajouter un filtre</p>
        <div className="space-y-1">
          {[
            { id: 'unreconciled', label: 'Non lettré' },
            { id: 'partialReconciled', label: 'Lettrages partiels' },
            { id: 'withResidual', label: 'Avec résidus' },
            { id: 'completeReconciled', label: 'Lettrages complets' },
            { id: 'supplier', label: 'Fournisseur' },
            { id: 'customer', label: 'Client' },
            { id: 'posted', label: 'Comptabilisé' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggleFilter({ ...filter, type: 'filter' })}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 font-semibold text-purple-600">{hasFilter(filter.id) ? '✓' : ''}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Regrouper par</p>
        <div className="space-y-1">
          {[
            { id: 'move', label: 'Écriture comptable' },
            { id: 'account', label: 'Compte' },
            { id: 'partner', label: 'Partenaire' },
            { id: 'journal', label: 'Journal' },
          ].map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 font-semibold text-purple-600">{groupBy.includes(group.id) ? '✓' : ''}</span>
              <span>{group.label}</span>
            </button>
          ))}

          {DATE_FILTER_TYPES.map((type) => {
            const current = dateFilters[type.id] || createEmptyDateFilter();
            const isOpen = openDateFilters[type.id] ?? false;
            return (
              <div key={type.id} className="rounded border border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenDateFilters((previous) => ({ ...previous, [type.id]: !isOpen }))}
                  className="flex w-full items-center justify-between px-2 py-2 text-left hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4 font-semibold text-purple-600">{current.mode ? '✓' : ''}</span>
                    <span>{type.menuLabel || type.label}</span>
                  </span>
                  {isOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-gray-200 p-2">
                    <div className="border-l border-gray-200 py-1">
                      {DATE_PERIOD_OPTIONS.map((option) => {
                        const selected = current.mode === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateDateFilter(type.id, { mode: selected ? '' : option.id })}
                            className={classNames(
                              'flex w-full items-center justify-between px-4 py-1.5 text-left text-sm',
                              selected ? 'bg-gray-100 font-medium text-purple-700' : 'hover:bg-gray-50',
                            )}
                          >
                            <span>{option.label}</span>
                            <span className="text-purple-600">{selected ? '✓' : ''}</span>
                          </button>
                        );
                      })}
                    </div>

                    {current.mode === 'day' && (
                      <input type="date" value={current.date} onChange={(event) => updateDateFilter(type.id, { date: event.target.value })} className="h-8 w-full rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                    )}
                    {current.mode === 'week' && (
                      <input type="week" value={current.week} onChange={(event) => updateDateFilter(type.id, { week: event.target.value })} className="h-8 w-full rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                    )}
                    {current.mode === 'month' && (
                      <input
                        type="month"
                        value={`${current.year || new Date().getFullYear()}-${current.month || '01'}`}
                        onChange={(event) => {
                          const [year, month] = event.target.value.split('-');
                          updateDateFilter(type.id, { year, month });
                        }}
                        className="h-8 w-full rounded border border-gray-300 px-2 outline-none focus:border-purple-500"
                      />
                    )}
                    {current.mode === 'quarter' && (
                      <div className="grid grid-cols-2 gap-2">
                        <select value={current.quarter} onChange={(event) => updateDateFilter(type.id, { quarter: event.target.value })} className="h-8 rounded border border-gray-300 px-2 outline-none focus:border-purple-500">
                          <option value="1">T1</option><option value="2">T2</option><option value="3">T3</option><option value="4">T4</option>
                        </select>
                        <input type="number" value={current.year} onChange={(event) => updateDateFilter(type.id, { year: event.target.value })} placeholder="Année" className="h-8 rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                      </div>
                    )}
                    {current.mode === 'year' && (
                      <input type="number" value={current.year} onChange={(event) => updateDateFilter(type.id, { year: event.target.value })} placeholder="Année" className="h-8 w-full rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                    )}
                    {current.mode === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={current.start} onChange={(event) => updateDateFilter(type.id, { start: event.target.value })} className="h-8 rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                        <input type="date" value={current.end} onChange={(event) => updateDateFilter(type.id, { end: event.target.value })} className="h-8 rounded border border-gray-300 px-2 outline-none focus:border-purple-500" />
                      </div>
                    )}
                    {current.mode && (
                      <button type="button" onClick={() => clearDateFilter(type.id)} className="w-full rounded px-2 py-1 text-left text-red-600 hover:bg-red-50">Effacer ce filtre</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(activeFilters.length > 0 || search.trim() || hasActiveDateFilters(dateFilters) || groupBy.join('|') !== DEFAULT_GROUPS.join('|')) && (
        <div className="border-t border-gray-200 p-3 md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setActiveFilters([]);
              setGroupBy(DEFAULT_GROUPS);
              setSearch('');
              setDateFilters(createDefaultDateFilters());
              setOpenDateFilters({ accounting: false, invoice: false });
              close();
            }}
            className="w-full rounded py-1.5 text-center text-red-600 hover:bg-red-50"
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  );

  const selectionActions = [
    ...(canReconcileSelection ? [{
      id: 'reconcile',
      label: reconciling ? 'Lettrage...' : (selectionMode === 'partial' ? 'Lettrage partiel' : 'Lettrer'),
      variant: 'success',
      disabled: reconciling,
      onClick: handleReconcileSelected,
    }] : []),
    ...(canUnreconcileSelection ? [{
      id: 'unreconcile',
      label: unreconciling ? 'Délettrage...' : 'Délettrer',
      variant: 'danger',
      disabled: unreconciling,
      onClick: handleUnreconcileSelected,
    }] : []),
  ];

  const restoreUnifiedMemory = useCallback((custom, saved) => {
    restoreLettrageMemory({
      ...(custom || {}),
      search: saved?.search,
      selectedIds: saved?.selectedRowKeys,
      itemsPerPage: saved?.pageSize,
      currentPage: saved?.page,
      columnWidths: saved?.columnWidths,
      visibleColumns: Array.isArray(saved?.visibleColumnIds)
        ? COLUMN_DEFINITIONS.reduce((result, column) => ({
          ...result,
          [column.id]: saved.visibleColumnIds.includes(column.id),
        }), {})
        : undefined,
    });
  }, [restoreLettrageMemory]);

  return (
    <>
      <UnifiedIndexPage
        title="Lettrage des comptes"
        memoryKey={LETTRAGE_MEMORY_KEY}
        memoryState={{ activeFilters, groupBy, openGroups, dateFilters }}
        onRestoreMemoryState={restoreUnifiedMemory}
        onMemoryReady={(api) => { unifiedMemoryApiRef.current = api; }}
        rows={sortedLines}
        rowKey={getLineId}
        columns={unifiedColumns}
        loading={loading}
        error={error}
        success={success}
        messageDuration={30000}
        onDismissError={() => setError('')}
        onDismissSuccess={() => setSuccess('')}
        emptyText="Aucune ligne à lettrer"
        searchValue={search}
        onSearchChange={setSearch}
        filterChips={filterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        renderFilters={renderLettrageFilters}
        onFiltersOpen={() => setOpenDateFilters({ accounting: false, invoice: false })}
        filterPanelWidth={720}
        primaryAction={{
          label: autoReconciling ? 'Lettrage automatique...' : 'Lettrage automatique',
          icon: <FiStar size={14} />,
          disabled: autoReconciling,
          onClick: () => {
            setAutoScopeLines(null);
            setShowAutoDialog(true);
          },
        }}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys)}
        selectionActions={selectionActions}
        renderSelectionSummary={() => (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="whitespace-nowrap">Débit {formatAmount(selectedSummary.debit, selectedCurrencyCode)}</span>
            <span className="whitespace-nowrap">Crédit {formatAmount(selectedSummary.credit, selectedCurrencyCode)}</span>
            <span className="whitespace-nowrap">Solde {formatAmount(selectedSummary.balance, selectedCurrencyCode)}</span>
            <span className="whitespace-nowrap">Résiduel {formatAmount(selectedSummary.residual, selectedCurrencyCode)}</span>
            {selectedCurrencyCodes.length > 1 && (
              <span className="whitespace-nowrap rounded bg-red-50 px-2 py-0.5 font-medium text-red-700">
                Devises {selectedCurrencyCodes.join(' / ')}
              </span>
            )}
            {selectionIssue && !canReconcileSelection && (
              <span className="truncate text-amber-700" title={selectionIssue}>{selectionIssue}</span>
            )}
          </div>
        )}
        page={currentPage}
        onPageChange={setCurrentPage}
        pageSize={itemsPerPage}
        onPageSizeChange={setItemsPerPage}
        pageSizeOptions={[25, 50, 100, 200]}
        visibleColumnIds={visibleColumnIds}
        onVisibleColumnsChange={(ids) => setVisibleColumns(
          COLUMN_DEFINITIONS.reduce((result, column) => ({ ...result, [column.id]: ids.includes(column.id) }), {}),
        )}
        columnWidths={columnWidths}
        onColumnWidthsChange={setColumnWidths}
        renderBody={({ rows: pageRows, getStripeClassName }) => (
          groupBy.length
            ? renderGroupRows(createGroupTree(pageRows, groupBy), 0, { index: 0 }, getStripeClassName)
            : pageRows.map((line, index) => renderLineRow(line, 0, index, getStripeClassName))
        )}
      />

      {showAutoDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-md rounded border border-gray-300 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Lettrage automatique</h3>
              <p className="mt-1 text-xs text-gray-500">Choisissez la méthode à utiliser pour rapprocher les écritures ouvertes.</p>
            </div>
            <div className="space-y-2 p-4">
              {[
                { id: 'reference', label: 'Par référence', description: 'Utilise en priorité les références communes entre les factures et les paiements.' },
                { id: 'amount', label: 'Par montant', description: 'Rapproche uniquement des débits et crédits équilibrés sur le même compte, partenaire et devise.' },
              ].map((mode) => (
                <label key={mode.id} className={classNames('flex cursor-pointer gap-3 rounded border p-3 text-sm', autoMode === mode.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <input type="radio" name="auto-reconcile-mode" checked={autoMode === mode.id} onChange={() => setAutoMode(mode.id)} className="mt-1 accent-purple-600" />
                  <span>
                    <span className="block font-medium text-gray-900">{mode.label}</span>
                    <span className="mt-1 block text-xs text-gray-500">{mode.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button type="button" onClick={() => { setShowAutoDialog(false); setAutoScopeLines(null); }} className="h-8 rounded border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50">Annuler</button>
              <button
                type="button"
                onClick={() => {
                  setShowAutoDialog(false);
                  handleAutoReconcile(autoMode, autoScopeLines);
                  setAutoScopeLines(null);
                }}
                className="h-8 rounded bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



export default LettrageIndex;

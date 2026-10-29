import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiDownload, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiUploadCloud, FiX } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useLanguage } from '../../context/LanguageContext';
import { useUi } from '../../context/UiContext';
import { ENGLISH_TRANSLATIONS } from '../../i18n/catalogs';
import { CHINESE_TRANSLATIONS } from '../../i18n/chinese';

const BUILTIN_LANGUAGE_OPTIONS = [
  { value: 'fr_FR', label: 'Français' }, { value: 'en_US', label: 'English' },
  { value: 'ar_001', label: 'العربية' }, { value: 'de_DE', label: 'Deutsch' },
  { value: 'es_ES', label: 'Español' }, { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'it_IT', label: 'Italiano' }, { value: 'nl_NL', label: 'Nederlands' },
  { value: 'ru_RU', label: 'Русский' }, { value: 'zh_CN', label: '中文（简体）', builtIn: true },
  { value: 'zh_TW', label: '中文（繁體）' }, { value: 'ja_JP', label: '日本語' },
  { value: 'ko_KR', label: '한국어' }, { value: 'hi_IN', label: 'हिन्दी' },
  { value: 'ur_PK', label: 'اردو' }, { value: 'fa_IR', label: 'فارسی' },
  { value: 'he_IL', label: 'עברית' }, { value: 'tr_TR', label: 'Türkçe' },
  { value: 'id_ID', label: 'Bahasa Indonesia' }, { value: 'vi_VN', label: 'Tiếng Việt' },
  { value: 'th_TH', label: 'ไทย' }, { value: 'sw_TZ', label: 'Kiswahili' },
  { value: 'ha_NG', label: 'Hausa' }, { value: 'yo_NG', label: 'Yorùbá' },
  { value: 'ig_NG', label: 'Asụsụ Igbo' }, { value: 'am_ET', label: 'አማርኛ' },
  { value: 'bn_BD', label: 'বাংলা' }, { value: 'pl_PL', label: 'Polski' },
  { value: 'wo_SN', label: 'Wolof' }, { value: 'ee_TG', label: 'Eʋegbe' },
];

const TYPE_OPTIONS = [
  ['view', 'Vue'], ['model', 'Modèle'], ['field', 'Libellé de champ'], ['help', 'Aide de champ'],
  ['selection', 'Option de liste'], ['report', 'Rapport'], ['code', 'Code'],
  ['constraint', 'Message de validation'], ['sql_constraint', 'Contrainte SQL'],
];

const STATE_OPTIONS = [
  ['translated', 'Traduit'], ['to_translate', 'À traduire'], ['obsolete', 'Obsolète'],
];

function rowsFrom(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

function decodePoString(value) {
  try { return JSON.parse(value); }
  catch { throw new Error('Une chaîne du fichier .po est mal formée.'); }
}

function parseGettextPo(contents) {
  const entries = [];
  let entry = {};
  let activeKey = '';
  let fuzzy = false;
  const finishEntry = () => {
    if (entry.msgid === undefined) { entry = {}; activeKey = ''; fuzzy = false; return; }
    if (entry.msgid === '' && entry.msgstr) {
      entries.headers = `${entries.headers || ''}${entry.msgstr}`;
    } else if (entry.msgid && !fuzzy) {
      if (entry.msgid_plural !== undefined || Object.keys(entry).some((key) => key.startsWith('msgstr['))) {
        throw new Error('Ce catalogue contient des formes plurielles. Elles ne peuvent pas encore être stockées dans IrTranslation.');
      }
      entries.push({ context: entry.msgctxt || '', src: entry.msgid, value: entry.msgstr || '' });
    }
    entry = {}; activeKey = ''; fuzzy = false;
  };
  String(contents || '').split(/\r?\n/).forEach((line) => {
    if (!line.trim()) { finishEntry(); return; }
    if (line.startsWith('#,')) { fuzzy = fuzzy || /\bfuzzy\b/.test(line); return; }
    if (line.startsWith('#')) return;
    const field = line.match(/^(msgctxt|msgid_plural|msgid|msgstr(?:\[\d+\])?)\s+(".*")\s*$/);
    if (field) {
      activeKey = field[1];
      entry[activeKey] = decodePoString(field[2]);
      return;
    }
    const continuation = line.match(/^(".*")\s*$/);
    if (continuation && activeKey) {
      entry[activeKey] = `${entry[activeKey] || ''}${decodePoString(continuation[1])}`;
    }
  });
  finishEntry();
  const headers = entries.headers || '';
  return { entries, headers };
}

function localeFromPoHeader(headers, fallback, options) {
  const rawCode = headers.match(/^Language:\s*([^\r\n]+)/im)?.[1]?.trim();
  if (!rawCode) return fallback;
  const normalized = rawCode.replace('-', '_');
  const exact = options.find((option) => option.value.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact.value;
  const base = normalized.split(/[_@.]/)[0].toLowerCase();
  return options.find((option) => option.value.split('_')[0].toLowerCase() === base)?.value || fallback;
}

function quotePo(value) {
  return JSON.stringify(String(value ?? ''));
}

async function fetchAllTranslations(filters) {
  const rows = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const payload = await apiClient.get('/translations/', { params: { ...filters, page } });
    rows.push(...rowsFrom(payload));
    hasNext = Boolean(payload?.next);
    page += 1;
  }
  return rows;
}

const blankForm = (lang) => ({
  name: '', lang, type: 'view', src: '', value: '', module: 'core', state: 'translated', comments: '',
});

export default function TranslationsPage() {
  const { language: activeLanguage, t } = useLanguage();
  const { security, reload: reloadUi } = useUi();
  const canEdit = Boolean(security?.user?.is_superuser);
  const [language, setLanguage] = useState(activeLanguage);
  const [languageRecords, setLanguageRecords] = useState([]);
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(() => blankForm(activeLanguage));
  const packInputRef = useRef(null);

  const languageOptions = useMemo(() => {
    const options = BUILTIN_LANGUAGE_OPTIONS.map((option) => {
      const record = languageRecords.find((item) => item.code === option.value);
      return {
        ...option,
        label: `${option.label} (${option.value})${option.builtIn ? ` — ${t('Pack intégré')}` : record?.pack_installe ? '' : ` — ${t('Pack à installer')}`}`,
      };
    });
    languageRecords.forEach((record) => {
      const code = record.code;
      if (!code || options.some((option) => option.value === code)) return;
      options.push({
        value: code,
        label: `${record.nom} (${code})${record.pack_installe ? '' : ` — ${t('Pack non installé')}`}`,
      });
    });
    return options;
  }, [languageRecords, t]);

  const loadLanguageRecords = useCallback(async () => {
    try {
      const payload = await apiClient.get('/langues/');
      setLanguageRecords(rowsFrom(payload));
    } catch {
      setLanguageRecords([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = { lang: language };
      if (stateFilter) filters.state = stateFilter;
      const result = await fetchAllTranslations(filters);
      const locale = language.replace('_', '-');
      setRows(result.sort((left, right) => (left.src || '').localeCompare(right.src || '', locale)));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de charger les traductions.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [language, stateFilter, t]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { loadLanguageRecords(); }, [loadLanguageRecords]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm(language));
    setFormOpen(true);
    setError('');
    setNotice('');
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
    setForm({
      name: row.name || '', lang: row.lang || language, type: row.type || 'view',
      src: row.src || '', value: row.value || '', module: row.module || '',
      state: row.state || 'to_translate', comments: row.comments || '',
    });
    setError('');
    setNotice('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        name: form.name.trim() || form.src.trim(),
        src: form.src.trim(),
        value: form.value.trim(),
        module: form.module.trim(),
        comments: form.comments.trim(),
      };
      if (!payload.name || !payload.src) {
        setError(t('Le texte source et la clé de traduction sont obligatoires.'));
        return;
      }
      if (editing && !editing.localOnly) await apiClient.patch(`/translations/${editing.id}/`, payload);
      else await apiClient.post('/translations/', payload);
      setEditing(null);
      setFormOpen(false);
      setNotice(t('Traduction enregistrée.'));
      await loadRows();
      await reloadUi();
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible d’enregistrer la traduction.'));
    } finally {
      setSaving(false);
    }
  };

  const downloadPack = async (template = false) => {
    setError('');
    setNotice('');
    try {
      const storedRows = await fetchAllTranslations({ lang: language });
      const rowsBySource = new Map();
      storedRows.forEach((row) => {
        if (row.src && row.value) rowsBySource.set(`${row.name || ''}\u0000${row.src}`, row);
      });
      const translations = [];
      const knownSources = new Set();
      Object.entries(ENGLISH_TRANSLATIONS).forEach(([src, englishValue]) => {
        const stored = rowsBySource.get(`${src}\u0000${src}`)
          || storedRows.find((row) => row.src === src);
        const fallback = language === 'en_US'
          ? englishValue
          : language === 'zh_CN' ? CHINESE_TRANSLATIONS[src] || '' : language === 'fr_FR' ? src : '';
        const value = template ? '' : stored?.value || fallback;
        if (template || value) {
          translations.push({
            name: stored?.name || src,
            type: stored?.type || 'view',
            src,
            value,
            module: stored?.module || 'frontend',
            state: template ? 'to_translate' : value ? 'translated' : 'to_translate',
          });
        }
        knownSources.add(src);
      });
      storedRows.forEach((row) => {
        if (!row.src || knownSources.has(row.src) || (!template && !row.value)) return;
        translations.push({
          name: row.name || row.src,
          type: row.type || 'view',
          src: row.src,
          value: template ? '' : row.value || '',
          module: row.module || 'frontend',
          state: template ? 'to_translate' : row.state || (row.value ? 'translated' : 'to_translate'),
          comments: row.comments || '',
        });
      });
      if (!template && translations.length === 0) {
        setError(t('Aucune traduction à exporter. Téléchargez plutôt le modèle vierge.'));
        return;
      }
      const record = languageRecords.find((item) => item.code === language);
      const pack = {
        format: 'somane-language-pack',
        version: 1,
        language: {
          code: language,
          name: record?.nom || BUILTIN_LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || language,
          direction: record?.sens_ecriture || 'LTR',
        },
        exported_at: new Date().toISOString(),
        translations,
      };
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `somane-${language}-${template ? 'template' : 'language-pack'}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(t(template ? 'Modèle de pack téléchargé.' : 'Pack de langue téléchargé.'));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de télécharger le pack.'));
    }
  };

  const downloadGettextCatalog = async (template = true) => {
    setError('');
    setNotice('');
    try {
      const storedRows = await fetchAllTranslations({ lang: language });
      const translatableRows = storedRows.filter((row) => row.src && row.type === 'view' && row.module === 'frontend');
      const rowsBySource = new Map();
      translatableRows.forEach((row) => {
        const current = rowsBySource.get(row.src) || [];
        current.push(row);
        rowsBySource.set(row.src, current);
      });
      const sources = new Set(Object.keys(ENGLISH_TRANSLATIONS));
      translatableRows.forEach((row) => sources.add(row.src));
      const languageName = languageRecords.find((record) => record.code === language)?.nom
        || BUILTIN_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label
        || language;
      const header = [
        'Content-Type: text/plain; charset=UTF-8\\n',
        'Content-Transfer-Encoding: 8bit\\n',
        `Language: ${language}\\n`,
        `X-Somane-Language-Name: ${languageName}\\n`,
      ].join('');
      const entries = Array.from(sources).sort((a, b) => a.localeCompare(b, 'fr')).flatMap((src) => {
        const matchingRows = rowsBySource.get(src) || [];
        const candidates = matchingRows.length ? matchingRows : [{ src, name: src }];
        return candidates.map((row) => {
          const fallback = language === 'en_US'
            ? ENGLISH_TRANSLATIONS[src] || ''
            : language === 'zh_CN' ? CHINESE_TRANSLATIONS[src] || '' : language === 'fr_FR' ? src : '';
          const value = template ? '' : row.value || fallback;
          if (!template && !value) return null;
          return [
            '#: somane',
            ...(row.name && row.name !== src ? [`msgctxt ${quotePo(row.name)}`] : []),
            `msgid ${quotePo(src)}`,
            `msgstr ${quotePo(value)}`,
            '',
          ].join('\n');
        }).filter(Boolean);
      });
      if (!template && !entries.length) {
        setError(t('Aucune traduction à exporter. Téléchargez plutôt le modèle gettext.'));
        return;
      }
      const lines = [
        'msgid ""', 'msgstr ""', quotePo(header), '',
        ...entries,
      ];
      const content = `${lines.join('\n')}\n`;
      const blob = new Blob([content], { type: 'text/x-gettext-translation;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `somane-${language}.${template ? 'pot' : 'po'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(t(template ? 'Modèle gettext téléchargé.' : 'Catalogue gettext téléchargé.'));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de télécharger le catalogue gettext.'));
    }
  };

  const importPack = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    if (file.size > 5 * 1024 * 1024) {
      setError(t('Le fichier dépasse la taille maximale de 5 Mo.'));
      return;
    }
    setSaving(true);
    try {
      const fileContents = await file.text();
      let pack;
      if (file.name.toLowerCase().endsWith('.po')) {
        const { entries, headers } = parseGettextPo(fileContents);
        const targetLanguage = localeFromPoHeader(headers, language, languageOptions);
        const translations = entries.filter((entry) => entry.value.trim()).map((entry) => ({
          name: entry.context || entry.src,
          type: 'view',
          src: entry.src,
          value: entry.value,
          module: 'frontend',
          state: 'translated',
        }));
        if (!translations.length) throw new Error(t('Aucune traduction renseignée dans le catalogue .po.'));
        pack = {
          format: 'somane-language-pack',
          version: 1,
          language: {
            code: targetLanguage,
            name: headers.match(/^X-Somane-Language-Name:\s*([^\r\n]+)/im)?.[1]?.trim()
              || BUILTIN_LANGUAGE_OPTIONS.find((option) => option.value === targetLanguage)?.label
              || targetLanguage,
            direction: ['ar', 'fa', 'he', 'ur'].includes(targetLanguage.split('_')[0]) ? 'RTL' : 'LTR',
          },
          translations,
        };
      } else {
        pack = JSON.parse(fileContents);
      }
      if (pack?.format !== 'somane-language-pack' || pack?.version !== 1 || !Array.isArray(pack?.translations)) {
        throw new Error(t('Fichier invalide. Utilise un pack Somane JSON ou un catalogue gettext .po.'));
      }
      const result = await apiClient.post('/translations/import-pack/', pack);
      const code = result?.language?.code || pack.language?.code;
      setLanguage(code);
      await loadLanguageRecords();
      setNotice(t('Pack installé : {name} — {count} traduction(s).')
        .replace('{name}', result?.language?.name || pack.language?.name || code)
        .replace('{count}', result?.total ?? pack.translations.length));
      if (activeLanguage === code) await reloadUi();
    } catch (exception) {
      const detail = exception?.data?.detail
        || Object.values(exception?.data || {}).flat().join(' ')
        || exception?.message;
      setError(detail || t('Impossible d’installer ce pack.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguagePack = async () => {
    const record = languageRecords.find((item) => item.code === language);
    if (!record || !canEdit) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!record.pack_installe) {
        const translatedRows = await fetchAllTranslations({ lang: language, state: 'translated' });
        if (!translatedRows.some((row) => String(row.value || '').trim())) {
          setError(t('Cette langue ne contient aucune traduction. Installez un pack avant de l’activer.'));
          return;
        }
      }
      await apiClient.patch(`/langues/${record.id}/`, { pack_installe: !record.pack_installe });
      await loadLanguageRecords();
      setNotice(t(record.pack_installe ? 'Langue retirée des choix utilisateur.' : 'Langue activée pour les utilisateurs.'));
    } catch (exception) {
      setError(exception?.data?.detail || exception?.message || t('Impossible de modifier la disponibilité de la langue.'));
    } finally {
      setSaving(false);
    }
  };

  const mergedRows = useMemo(() => {
    if (!['en_US', 'zh_CN'].includes(language) || (stateFilter && stateFilter !== 'translated')) return rows;
    const dictionary = language === 'zh_CN' ? CHINESE_TRANSLATIONS : ENGLISH_TRANSLATIONS;
    const rowsByKey = new Map();
    rows.forEach((row) => {
      if (row.src) rowsByKey.set(row.src, row);
      if (row.name) rowsByKey.set(row.name, row);
    });
    const seen = new Set();
    const combined = Object.entries(dictionary).map(([src, value], index) => {
      const stored = rowsByKey.get(src);
      if (stored) {
        if (seen.has(stored.id)) return null;
        seen.add(stored.id);
        return stored;
      }
      return {
        id: `catalog-${language}-${index}`, localOnly: true, name: src, lang: language, type: 'view',
        src, value, module: 'frontend', state: 'translated', comments: '',
      };
    });
    rows.forEach((row) => {
      if (!seen.has(row.id)) combined.push(row);
    });
    return combined.filter(Boolean);
  }, [language, rows, stateFilter]);

  const visibleRows = useMemo(() => {
    const locale = language.replace('_', '-');
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) return mergedRows;
    return mergedRows.filter((row) => [row.src, row.value, row.name, row.module]
      .some((value) => String(value || '').toLocaleLowerCase(locale).includes(query)));
  }, [language, mergedRows, search]);
  const translatedCount = useMemo(() => visibleRows.filter((row) => row.state === 'translated' && row.value).length, [visibleRows]);

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('Traductions')}</h1>
            <p className="mt-1 text-sm text-gray-600">{t('Gère les textes traduits de l’interface selon la langue choisie par chaque utilisateur.')}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadRows} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('Actualiser')}</button>
            <button type="button" onClick={() => downloadPack(false)} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><FiDownload /> {t('Télécharger le pack')}</button>
            <button type="button" onClick={() => downloadPack(true)} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><FiDownload /> {t('Modèle JSON')}</button>
            <button type="button" onClick={() => downloadGettextCatalog(true)} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><FiDownload /> {t('Modèle gettext (.pot)')}</button>
            <button type="button" onClick={() => downloadGettextCatalog(false)} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><FiDownload /> {t('Exporter .po')}</button>
            {canEdit && <>
              <input ref={packInputRef} type="file" accept="application/json,.json,.po" className="hidden" onChange={importPack} />
              <button type="button" onClick={() => packInputRef.current?.click()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><FiUploadCloud /> {t('Installer un pack')}</button>
            </>}
            {canEdit && <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800"><FiPlus /> {t('Ajouter une traduction')}</button>}
          </div>
        </header>

        {!canEdit && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{t('Consultation seule. Seul un administrateur système peut modifier les traductions.')}</p>}
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-gray-200 p-4 md:grid-cols-[minmax(180px,0.5fr)_minmax(180px,0.5fr)_minmax(260px,1fr)] md:items-end">
            <label className="block text-sm font-medium text-gray-700">{t('Langue')}
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">{t('Statut')}
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">{t('Tous les statuts')}</option>
                {STATE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select>
            </label>
            <label className="relative block text-sm font-medium text-gray-700">{t('Rechercher une traduction')}
              <FiSearch className="pointer-events-none absolute bottom-2.5 left-3 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Texte source, traduction, module…')} className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm" />
            </label>
          </div>

          {language === 'zh_CN' && <p className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{t('Le chinois simplifié est intégré à Somane. Les traductions de base fonctionnent sans pack ; tu peux importer un pack ou modifier les traductions pour compléter le vocabulaire.')}</p>}

          {canEdit && languageRecords.some((record) => record.code === language) && !['fr_FR', 'en_US', 'zh_CN'].includes(language) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-600">{t('Disponibilité pour les choix de langue des utilisateurs')}:
                <strong className={`ml-2 ${languageRecords.find((record) => record.code === language)?.pack_installe ? 'text-green-700' : 'text-gray-500'}`}>
                  {t(languageRecords.find((record) => record.code === language)?.pack_installe ? 'Activée' : 'Désactivée')}
                </strong>
              </p>
              <button type="button" onClick={toggleLanguagePack} disabled={saving} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
                {t(languageRecords.find((record) => record.code === language)?.pack_installe ? 'Désactiver la langue' : 'Activer la langue')}
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
            <span>{t('{count} traduction(s) affichée(s)').replace('{count}', visibleRows.length)}</span>
            <span>{t('{count} traduction(s) active(s)').replace('{count}', translatedCount)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600"><tr>
                <th className="px-4 py-3">{t('Texte source')}</th><th className="px-4 py-3">{t('Traduction')}</th>
                <th className="px-4 py-3">{t('Type')}</th><th className="px-4 py-3">{t('Module')}</th>
                <th className="px-4 py-3">{t('Statut')}</th><th className="px-4 py-3">{t('Action')}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t('Chargement…')}</td></tr>}
                {!loading && visibleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-violet-50">
                    <td className="max-w-sm whitespace-pre-wrap px-4 py-3 font-medium text-gray-900">{row.src}</td>
                    <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-gray-700">{row.value || <span className="italic text-gray-400">{t('Non traduit')}</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3">{t(TYPE_OPTIONS.find(([value]) => value === row.type)?.[1] || row.type)}</td>
                    <td className="px-4 py-3">{row.module || '—'}</td>
                    <td className="px-4 py-3">{t(STATE_OPTIONS.find(([value]) => value === row.state)?.[1] || row.state)}</td>
                    <td className="px-4 py-3">{canEdit && <button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"><FiEdit2 /> {t('Modifier')}</button>}</td>
                  </tr>
                ))}
                {!loading && !visibleRows.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{t('Aucune traduction trouvée pour cette langue.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-gray-500">{t('Pour traduire un libellé du code, le texte source doit correspondre exactement à la clé utilisée par l’interface. Les entrées marquées « Traduit » sont envoyées au navigateur au chargement de l’interface.')}</p>
        <p className="text-xs leading-relaxed text-gray-500">{t('Les langues proposées ici sont des codes régionaux, pas des traductions déjà fournies. Télécharge le modèle gettext .pot pour Somane, fais traduire le catalogue dans')} <a href="https://weblate.org/" target="_blank" rel="noreferrer" className="font-medium text-violet-700 underline">Weblate</a>{' '}{t('ou un outil gettext, télécharge le .po obtenu, puis installe-le ici. La langue apparaîtra dans les préférences après import. Les fichiers contenant des formes plurielles ne sont pas encore pris en charge.')}</p>
        {language === 'en_US' && <p className="text-xs leading-relaxed text-gray-500">{t('Les termes du module « frontend » viennent du catalogue anglais intégré. Les modifier crée une surcharge dans IrTranslation, appliquée en priorité au prochain chargement.')}</p>}
      </div>

      {canEdit && formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/40 p-3 md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="translation-edit-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between border-b border-gray-200 p-5"><div><h2 id="translation-edit-title" className="text-lg font-semibold text-gray-900">{t(editing ? 'Modifier une traduction' : 'Ajouter une traduction')}</h2><p className="mt-1 text-sm text-gray-500">{t('La clé doit être exactement le texte source utilisé dans l’interface.')}</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label={t('Fermer')} className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><FiX /></button></header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">{t('Langue')}<select required value={form.lang} onChange={(event) => setForm((current) => ({ ...current, lang: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">{languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="text-sm font-medium text-gray-700">{t('Type')}<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
              </div>
              <label className="block text-sm font-medium text-gray-700">{t('Clé de traduction')}<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('Ex. Nom technique du modèle ou du champ')} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm font-normal" /><span className="mt-1 block text-xs font-normal text-gray-500">{t('Cette clé est également recherchée par l’interface, en plus du texte source.')}</span></label>
              <label className="block text-sm font-medium text-gray-700">{t('Texte source')}<textarea required rows={3} value={form.src} onChange={(event) => setForm((current) => ({ ...current, src: event.target.value, name: !current.name || current.name === current.src ? event.target.value : current.name }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="block text-sm font-medium text-gray-700">{t('Traduction')}<textarea rows={3} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">{t('Module')}<input value={form.module} onChange={(event) => setForm((current) => ({ ...current, module: event.target.value }))} placeholder="core" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
                <label className="text-sm font-medium text-gray-700">{t('Statut')}<select value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal">{STATE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
              </div>
              <label className="block text-sm font-medium text-gray-700">{t('Commentaire')}<textarea rows={2} value={form.comments} onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white p-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">{t('Annuler')}</button><button type="submit" disabled={saving} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? t('Enregistrement…') : t('Enregistrer')}</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}

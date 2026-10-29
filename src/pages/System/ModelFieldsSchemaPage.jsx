import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiCode, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

const FIELD_PURPOSES = {
  id: 'Identifiant unique de cette définition dans la base de données.',
  name: 'Nom technique utilisé par le modèle et les vues, par exemple email ou date_creation.',
  field_description: 'Libellé lisible présenté à l’utilisateur dans un formulaire ou une liste.',
  model_id: 'Modèle Django auquel appartient le champ. La paire modèle + nom doit être unique.',
  ttype: 'Type de donnée logique : texte, date, booléen, relation, montant, etc.',
  display_widget: 'Rendu visuel par défaut du champ. Une vue précise peut le remplacer.',
  state: 'Indique si le champ provient du code (Base) ou a été ajouté dans Somane (Manuel).',
  required: 'Signale que l’utilisateur doit renseigner le champ avant validation.',
  readonly: 'Empêche la modification dans le formulaire ; ne change pas la donnée enregistrée.',
  copied: 'Indique si la valeur du champ est reprise lors de la duplication d’un enregistrement.',
  store: 'Indique si la valeur est conservée en base ou calculée à la demande.',
  selectable: 'Autorise l’usage du champ dans les listes et outils de sélection.',
  index: 'Indique si la colonne physique est indexée pour accélérer les recherches.',
  translate: 'Indique si la valeur du champ doit pouvoir varier selon la langue.',
  group_expand: 'Demande d’afficher aussi les groupes vides dans les vues regroupées.',
  website_form_blacklisted: 'Exclut le champ du constructeur de formulaires accessibles sur le web.',
  tracking: 'Niveau ou ordre de suivi des changements dans le journal de l’enregistrement.',
  size: 'Longueur maximale autorisée pour un champ texte court.',
  help: 'Explication affichée près du champ pour guider la personne qui le remplit.',
  compute: 'Nom ou description de la logique qui calcule la valeur du champ.',
  depends: 'Champs dont dépend le calcul ; leur modification peut recalculer ce champ.',
  domain: 'Filtre appliqué aux choix disponibles pour un champ relationnel.',
  selection: 'Liste des choix autorisés pour un champ de type sélection.',
  relation: 'Nom technique du modèle ciblé par une relation.',
  relation_field: 'Champ inverse permettant de retrouver les enregistrements liés.',
  relation_table: 'Table intermédiaire utilisée pour une relation plusieurs-à-plusieurs.',
  column1: 'Colonne de la table de relation représentant le modèle courant.',
  column2: 'Colonne de la table de relation représentant le modèle lié.',
  related: 'Chemin d’accès utilisé pour lire une valeur à travers d’autres relations.',
  related_field_id: 'Référence interne vers la définition du champ source d’un champ lié.',
  relation_field_id: 'Référence interne vers la définition du champ relationnel inverse.',
  on_delete: 'Règle appliquée aux relations quand l’enregistrement lié est supprimé.',
  modules: 'Modules qui déclarent ou utilisent ce champ.',
  groups: 'Groupes autorisés à voir ou utiliser le champ selon les contrôles actifs.',
  create_uid: 'Utilisateur ayant créé la définition technique.',
  create_date: 'Date et heure de création de la définition.',
  write_uid: 'Dernier utilisateur ayant modifié la définition.',
  write_date: 'Date et heure de la dernière modification de la définition.',
};

const TYPE_LABELS = {
  char: 'Texte court', text: 'Texte long', integer: 'Entier', float: 'Décimal', decimal: 'Décimal',
  boolean: 'Oui / Non', date: 'Date', datetime: 'Date et heure', binary: 'Fichier', json: 'JSON',
  selection: 'Liste de choix', many2one: 'Relation simple', one2many: 'Relation en lignes',
  many2many: 'Relation multiple', reference: 'Référence', monetary: 'Monétaire', html: 'HTML',
};

const BASE_FIELDS = Object.keys(FIELD_PURPOSES);

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchAll(endpoint, params = {}) {
  const rows = [];
  let page = 1;
  let next = true;
  while (next) {
    const payload = await apiClient.get(endpoint, { params: { ...params, page } });
    rows.push(...rowsOf(payload));
    next = Boolean(payload?.next);
    page += 1;
  }
  return rows;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function ModelFieldsSchemaPage() {
  const [fields, setFields] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshSequence, setRefreshSequence] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const models = await fetchAll('/ir-models/');
        const model = models.find((item) => item.model === 'core.IrModelFields');
        if (!model) throw new Error('Le modèle core.IrModelFields n’est pas encore enregistré dans IrModel.');
        const definitions = await fetchAll('/ir-model-fields/', { model_id: model.id });
        if (mounted) setFields(definitions);
      } catch (exception) {
        if (mounted) setError(exception?.data?.detail || exception?.message || 'Impossible de lire la structure IrModelFields.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshSequence]);

  const fieldMap = useMemo(() => new Map(fields.map((field) => [field.name, field])), [fields]);
  const displayFields = useMemo(() => {
    const known = new Set(BASE_FIELDS);
    const names = [...BASE_FIELDS, ...fields.map((field) => field.name).filter((name) => !known.has(name))];
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return names.filter((name) => {
      const field = fieldMap.get(name);
      const searchable = [name, field?.field_description, FIELD_PURPOSES[name], field?.help]
        .filter(Boolean).join(' ').toLocaleLowerCase('fr');
      return !normalizedQuery || searchable.includes(normalizedQuery);
    }).map((name) => ({ name, field: fieldMap.get(name), purpose: FIELD_PURPOSES[name] || 'Champ présent dans la définition Django ; consulte les détails techniques ci-dessous.' }));
  }, [fieldMap, fields, query]);

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><FiCode size={22} /></span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Structure de IrModelFields</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">Dictionnaire de la table qui décrit les champs des modèles. Ces lignes sont des métadonnées : elles documentent les champs métier et leurs règles, sans créer à elles seules les colonnes Django.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRefreshSequence((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> Actualiser</button>
            <Link to="/model-fields" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FiArrowLeft /> Liste des champs métier</Link>
          </div>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>À quoi sert cette table ?</strong> Chaque enregistrement décrit un champ d’un modèle : son nom technique, son type, son libellé, son aide, ses contraintes, son rendu et ses relations. La page s’appuie sur le modèle Django enregistré et complète chaque propriété avec son utilité fonctionnelle.
        </section>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 p-4">
            <div><h2 className="font-semibold text-gray-900">Colonnes du registre</h2><p className="mt-1 text-xs text-gray-500">{loading ? 'Chargement…' : `${displayFields.length} champ(s) documenté(s) · ${fields.length} définition(s) actuellement enregistrée(s)`}</p></div>
            <label className="relative block w-full sm:w-80"><span className="sr-only">Rechercher un champ</span><FiSearch className="absolute left-3 top-2.5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, libellé ou utilité…" className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm" /></label>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading && <p className="col-span-full py-8 text-center text-sm text-gray-500">Lecture de core.IrModelFields…</p>}
            {!loading && displayFields.map(({ name, field, purpose }) => (
              <article key={name} className="min-w-0 rounded-md border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="break-all font-mono text-sm font-semibold text-violet-800">{name}</h3><p className="mt-1 text-sm font-medium text-gray-900">{field?.field_description || name.replaceAll('_', ' ')}</p></div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[11px] ${field ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{field ? 'Enregistré' : 'À synchroniser'}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{purpose}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-gray-100 pt-3 text-xs">
                  <dt className="text-gray-500">Type</dt><dd className="text-gray-800">{TYPE_LABELS[field?.ttype] || field?.ttype || '—'}</dd>
                  <dt className="text-gray-500">Obligatoire</dt><dd className="text-gray-800">{field ? displayValue(field.required) : '—'}</dd>
                  <dt className="text-gray-500">Lecture seule</dt><dd className="text-gray-800">{field ? displayValue(field.readonly) : '—'}</dd>
                  {field?.relation && <><dt className="text-gray-500">Relation</dt><dd className="break-all font-mono text-gray-800">{field.relation}</dd></>}
                  {field?.help && <><dt className="self-start text-gray-500">Aide enregistrée</dt><dd className="whitespace-pre-wrap text-gray-800">{field.help}</dd></>}
                </dl>
                {field && <details className="mt-3 border-t border-gray-100 pt-2"><summary className="cursor-pointer text-xs font-medium text-violet-700">Tous les détails techniques</summary><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">{Object.entries(field).filter(([key]) => !['id', 'field_description', 'model_name'].includes(key)).map(([key, value]) => <React.Fragment key={key}><dt className="break-all text-gray-500">{key}</dt><dd className="min-w-0 whitespace-pre-wrap break-words text-gray-800">{displayValue(value)}</dd></React.Fragment>)}</dl></details>}
              </article>
            ))}
            {!loading && !displayFields.length && <p className="col-span-full py-8 text-center text-sm text-gray-500">Aucun champ correspondant.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

// // src/features/financial-reports/pages/PeriodsList.jsx
// import { useEffect, useState, useMemo } from 'react';
// import {
//   FiPlus, FiEdit2, FiTrash2, FiLock, FiCheck,
//   FiBriefcase, FiLink, FiAlertTriangle, FiChevronDown,
//   FiChevronUp, FiCalendar, FiInfo,
// } from 'react-icons/fi';
// import { apiClient } from '../../../services/apiClient';
// import { useEntity } from '../../../context/EntityContext';

// // ─── Référentiels comptables (liste fixe) ────────────────────────────────────
// const FRAMEWORKS = [
//   { value: 'SYSCOHADA',  label: 'SYSCOHADA Révisé' },
//   { value: 'SYSCOHADA_2017', label: 'SYSCOHADA 2017' },
//   { value: 'OHADA',      label: 'OHADA' },
//   { value: 'PCG',        label: 'PCG (Plan Comptable Général)' },
//   { value: 'IFRS',       label: 'IFRS' },
//   { value: 'US_GAAP',    label: 'US GAAP' },
//   { value: 'OTHER',      label: 'Autre' },
// ];

// // ─── Types de période ─────────────────────────────────────────────────────────
// const PERIOD_TYPES = [
//   { value: 'ANNUAL',    label: 'Annuel'      },
//   { value: 'SEMESTER',  label: 'Semestriel'  },
//   { value: 'QUARTERLY', label: 'Trimestriel' },
//   { value: 'MONTHLY',   label: 'Mensuel'     },
//   { value: 'INTERIM',   label: 'Intérimaire' },
// ];

// // ─── Calcul automatique du statut ─────────────────────────────────────────────
// /**
//  * Le statut est calculé automatiquement :
//  *   - lock_date <= aujourd'hui       → LOCKED
//  *   - status existant (edit)         → conservé sauf si lock_date dépassée
//  *   - création                       → OPEN
//  */
// function computeStatus(lockDate, existingStatus = null) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   if (lockDate) {
//     const lock = new Date(lockDate);
//     if (lock <= today) return 'LOCKED';
//   }

//   if (existingStatus && existingStatus !== 'LOCKED') return existingStatus;
//   return 'OPEN';
// }

// // ─── Config d'affichage des statuts ──────────────────────────────────────────
// const STATUS_DISPLAY = {
//   DRAFT:       { label: 'Brouillon',   bg: '#fef9c3', color: '#a16207' },
//   OPEN:        { label: 'Ouvert',      bg: '#dcfce7', color: '#15803d' },
//   IN_PROGRESS: { label: 'En cours',    bg: '#dbeafe', color: '#1d4ed8' },
//   CLOSED:      { label: 'Clôturé',     bg: '#f3f4f6', color: '#374151' },
//   VALIDATED:   { label: 'Validé',      bg: '#ede9fe', color: '#6d28d9' },
//   LOCKED:      { label: 'Verrouillé',  bg: '#fee2e2', color: '#dc2626' },
// };

// // ─── Formulaire vide ──────────────────────────────────────────────────────────
// const EMPTY_FORM = {
//   code:                      '',
//   name:                      '',
//   period_type:               'ANNUAL',
//   fiscal_year:               '',
//   date_start:                '',
//   date_end:                  '',
//   finance_account_framework: 'SYSCOHADA',
//   previous_period:           '',
//   opening_reference_period:  '',
//   lock_date:                 '',
//   comment:                   '',
//   active:                    true,
// };

// // ═════════════════════════════════════════════════════════════════════════════
// export default function PeriodsList() {
//   const { activeEntity } = useEntity();

//   const [periods, setPeriods]             = useState([]);
//   const [imports, setImports]             = useState([]);   // pour badge N-1 importée
//   const [loading, setLoading]             = useState(true);
//   const [saving, setSaving]               = useState(false);
//   const [showModal, setShowModal]         = useState(false);
//   const [editingPeriod, setEditingPeriod] = useState(null);
//   const [formData, setFormData]           = useState(EMPTY_FORM);
//   const [error, setError]                 = useState('');
//   const [showAdvanced, setShowAdvanced]   = useState(false); // section avancée du formulaire

//   useEffect(() => {
//     loadData();
//   }, [activeEntity]);

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const [perRes, impRes] = await Promise.all([
//         apiClient.get('financial-reports/periods/'),
//         apiClient.get('financial-reports/raw-imports/'),
//       ]);
//       setPeriods(Array.isArray(perRes) ? perRes : perRes.results || []);
//       setImports(Array.isArray(impRes) ? impRes : impRes.results || []);
//     } catch (err) {
//       setError('Impossible de charger les données');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Vérifie si une période a au moins un import validé ───────────────────
//   const hasValidatedImport = (periodId) =>
//     imports.some(i => String(i.period) === String(periodId) && i.state === 'validated');

//   // ── Statut calculé automatiquement pour un formulaire ────────────────────
//   const computedStatus = useMemo(() => {
//     return computeStatus(formData.lock_date, editingPeriod?.status);
//   }, [formData.lock_date, editingPeriod?.status]);

//   // ── Ouverture du modal ────────────────────────────────────────────────────
//   const openCreate = () => {
//     if (!activeEntity) {
//       setError('Veuillez sélectionner une entité avant de créer une période');
//       return;
//     }
//     setEditingPeriod(null);
//     setFormData(EMPTY_FORM);
//     setShowAdvanced(false);
//     setError('');
//     setShowModal(true);
//   };

//   const handleEdit = (period) => {
//     setEditingPeriod(period);
//     setFormData({
//       code:                      period.code || '',
//       name:                      period.name || '',
//       period_type:               period.period_type || 'ANNUAL',
//       fiscal_year:               period.fiscal_year || '',
//       date_start:                period.date_start || '',
//       date_end:                  period.date_end || '',
//       finance_account_framework: period.finance_account_framework || 'SYSCOHADA',
//       previous_period:           period.previous_period || '',
//       opening_reference_period:  period.opening_reference_period || '',
//       lock_date:                 period.lock_date || '',
//       comment:                   period.comment || '',
//       active:                    period.active ?? true,
//     });
//     setShowAdvanced(!!period.opening_reference_period);
//     setError('');
//     setShowModal(true);
//   };

//   // ── Soumission ────────────────────────────────────────────────────────────
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setSaving(true);

//     if (!formData.code.trim())       { setError('Le code est obligatoire'); setSaving(false); return; }
//     if (!formData.name.trim())       { setError('Le nom est obligatoire'); setSaving(false); return; }
//     if (!formData.date_start)        { setError('La date de début est obligatoire'); setSaving(false); return; }
//     if (!formData.date_end)          { setError('La date de fin est obligatoire'); setSaving(false); return; }
//     if (!formData.fiscal_year)       { setError("L'exercice comptable est obligatoire"); setSaving(false); return; }
//     if (!formData.finance_account_framework) { setError("Le référentiel comptable est obligatoire"); setSaving(false); return; }
//     if (!activeEntity?.id)           { setError('Aucune entité sélectionnée'); setSaving(false); return; }

//     // Validation dates
//     if (formData.date_start >= formData.date_end) {
//       setError('La date de fin doit être après la date de début');
//       setSaving(false);
//       return;
//     }

//     const payload = {
//       ...formData,
//       company:                  activeEntity.id,
//       status:                   computedStatus,     // ← statut calculé automatiquement
//       previous_period:          formData.previous_period          || null,
//       opening_reference_period: formData.opening_reference_period || null,
//       lock_date:                formData.lock_date                || null,
//     };

//     try {
//       if (editingPeriod) {
//         await apiClient.put(`financial-reports/periods/${editingPeriod.id}/`, payload);
//       } else {
//         await apiClient.post('financial-reports/periods/', payload);
//       }
//       setShowModal(false);
//       loadData();
//     } catch (err) {
//       const backendError = err.response?.data;
//       let msg = 'Erreur lors de la sauvegarde';
//       if (backendError) {
//         if (typeof backendError === 'object') {
//           const firstKey = Object.keys(backendError)[0];
//           const firstErr = backendError[firstKey];
//           msg = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
//         } else {
//           msg = backendError.detail || String(backendError);
//         }
//       }
//       setError(msg);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm('Supprimer cette période ?')) return;
//     try {
//       await apiClient.delete(`financial-reports/periods/${id}/`);
//       loadData();
//     } catch (err) {
//       alert('Erreur lors de la suppression : ' + (err.response?.data?.detail || 'Erreur inconnue'));
//     }
//   };

//   const field = (key, value) => setFormData(f => ({ ...f, [key]: value }));

//   if (loading) return (
//     <div className="flex items-center justify-center h-64">
//       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
//     </div>
//   );

//   return (
//     <div className="space-y-6 p-6">

//       {/* ── Message d'erreur global ──────────────────────────────────── */}
//       {error && !showModal && (
//         <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
//           {error}
//         </div>
//       )}

//       {/* ── Info entité active ───────────────────────────────────────── */}
//       <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
//         <FiBriefcase size={15} />
//         <span>
//           <strong>Entité active :</strong>{' '}
//           {activeEntity?.raison_sociale || activeEntity?.nom || activeEntity?.code
//             || <span className="text-amber-600 font-medium">Aucune entité sélectionnée</span>}
//         </span>
//       </div>

//       {/* ── En-tête ──────────────────────────────────────────────────── */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Périodes financières</h1>
//           <p className="text-gray-500 mt-1 text-sm">
//             Gérez les exercices et leurs liaisons N / N-1
//           </p>
//         </div>
//         <button
//           onClick={openCreate}
//           disabled={!activeEntity}
//           className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors shadow-sm ${
//             activeEntity ? 'bg-violet-600 hover:bg-violet-700' : 'bg-gray-400 cursor-not-allowed'
//           }`}
//         >
//           <FiPlus size={16} />
//           Nouvelle période
//         </button>
//       </div>

//       {/* ── Tableau ──────────────────────────────────────────────────── */}
//       <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b border-gray-200">
//             <tr>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Nom</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Exercice</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Début → Fin</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Référentiel</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">N-1 liée</th>
//               <th className="px-4 py-3 text-left font-semibold text-gray-700">Statut</th>
//               <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {periods.length === 0 ? (
//               <tr>
//                 <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
//                   Aucune période trouvée
//                 </td>
//               </tr>
//             ) : (
//               periods.map((period) => {
//                 // Statut affiché = calculé automatiquement
//                 const displayStatus = computeStatus(period.lock_date, period.status);
//                 const statusCfg     = STATUS_DISPLAY[displayStatus] || STATUS_DISPLAY.OPEN;
//                 const isLocked      = displayStatus === 'LOCKED';

//                 // N-1 liée
//                 const n1PeriodId = period.opening_reference_period || period.previous_period;
//                 const n1Period   = n1PeriodId ? periods.find(p => String(p.id) === String(n1PeriodId)) : null;
//                 const n1Imported = n1Period ? hasValidatedImport(n1Period.id) : false;

//                 // Référentiel label
//                 const fwLabel = FRAMEWORKS.find(f => f.value === period.finance_account_framework)?.label
//                               || period.finance_account_framework || '—';

//                 return (
//                   <tr key={period.id} className="hover:bg-gray-50 transition-colors">
//                     <td className="px-4 py-3 font-mono text-gray-700 font-medium">{period.code}</td>
//                     <td className="px-4 py-3 text-gray-900 font-medium">{period.name}</td>
//                     <td className="px-4 py-3 text-gray-500 text-xs">
//                       {PERIOD_TYPES.find(t => t.value === period.period_type)?.label || period.period_type}
//                     </td>
//                     <td className="px-4 py-3 text-gray-600 font-mono text-xs">{period.fiscal_year || '—'}</td>
//                     <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
//                       {period.date_start ? new Date(period.date_start).toLocaleDateString('fr-FR') : '—'}
//                       {' → '}
//                       {period.date_end ? new Date(period.date_end).toLocaleDateString('fr-FR') : '—'}
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
//                         {fwLabel}
//                       </span>
//                     </td>

//                     {/* Colonne N-1 avec badge import */}
//                     <td className="px-4 py-3">
//                       {n1Period ? (
//                         <div className="flex items-center gap-1.5">
//                           <FiLink size={11} className="text-indigo-500 shrink-0" />
//                           <span className="font-mono text-xs text-indigo-700">{n1Period.code}</span>
//                           {n1Imported ? (
//                             <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">
//                               <FiCheck size={9} /> Importée
//                             </span>
//                           ) : (
//                             <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold">
//                               <FiAlertTriangle size={9} /> Non importée
//                             </span>
//                           )}
//                         </div>
//                       ) : (
//                         <span className="text-xs text-gray-400 italic">Première balance</span>
//                       )}
//                     </td>

//                     {/* Statut calculé automatiquement */}
//                     <td className="px-4 py-3">
//                       <span
//                         className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
//                         style={{ background: statusCfg.bg, color: statusCfg.color }}
//                       >
//                         {isLocked && <FiLock size={10} />}
//                         {statusCfg.label}
//                       </span>
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="flex justify-center gap-1">
//                         <button
//                           onClick={() => handleEdit(period)}
//                           className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                           title="Modifier"
//                         >
//                           <FiEdit2 size={14} />
//                         </button>
//                         <button
//                           onClick={() => handleDelete(period.id)}
//                           disabled={isLocked}
//                           className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
//                           title={isLocked ? 'Période verrouillée' : 'Supprimer'}
//                         >
//                           <FiTrash2 size={14} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* ══ MODAL CRÉATION / ÉDITION ══════════════════════════════════════ */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

//             {/* Header modal */}
//             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
//               <h2 className="text-lg font-bold text-gray-900">
//                 {editingPeriod ? `Modifier — ${editingPeriod.code}` : 'Nouvelle période'}
//               </h2>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

//               {/* Erreur dans le modal */}
//               {error && (
//                 <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
//                   {error}
//                 </div>
//               )}

//               {/* Entité (lecture seule) */}
//               <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 flex items-center gap-2">
//                 <FiBriefcase size={14} className="text-slate-400" />
//                 <span>
//                   <strong>Entité :</strong>{' '}
//                   {activeEntity?.raison_sociale || activeEntity?.code || '—'}
//                 </span>
//               </div>

//               {/* ── Statut calculé automatiquement (lecture seule) ──────── */}
//               <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
//                 <FiInfo size={14} className="text-gray-400 shrink-0" />
//                 <div className="flex-1 text-sm text-gray-600">
//                   <strong>Statut calculé automatiquement :</strong>{' '}
//                   <span
//                     className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ml-1"
//                     style={{
//                       background: STATUS_DISPLAY[computedStatus]?.bg,
//                       color:      STATUS_DISPLAY[computedStatus]?.color,
//                     }}
//                   >
//                     {computedStatus === 'LOCKED' && <FiLock size={9} />}
//                     {STATUS_DISPLAY[computedStatus]?.label}
//                   </span>
//                 </div>
//                 <span className="text-xs text-gray-400">
//                   {computedStatus === 'LOCKED'
//                     ? 'Date de verrouillage atteinte'
//                     : editingPeriod
//                     ? 'Statut conservé'
//                     : 'Ouvert à la création'}
//                 </span>
//               </div>

//               {/* Code + Nom */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Code <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.code}
//                     onChange={e => field('code', e.target.value)}
//                     required
//                     placeholder="Ex : FY2025, M03-2025"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Nom <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.name}
//                     onChange={e => field('name', e.target.value)}
//                     required
//                     placeholder="Ex : Exercice 2025"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                   />
//                 </div>
//               </div>

//               {/* Type + Exercice */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Type de période <span className="text-red-500">*</span>
//                   </label>
//                   <select
//                     value={formData.period_type}
//                     onChange={e => field('period_type', e.target.value)}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                   >
//                     {PERIOD_TYPES.map(opt => (
//                       <option key={opt.value} value={opt.value}>{opt.label}</option>
//                     ))}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Exercice comptable <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.fiscal_year}
//                     onChange={e => field('fiscal_year', e.target.value)}
//                     required
//                     placeholder="Ex : 2025"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                   />
//                 </div>
//               </div>

//               {/* Référentiel comptable */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   Référentiel comptable <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={formData.finance_account_framework}
//                   onChange={e => field('finance_account_framework', e.target.value)}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                 >
//                   <option value="">— Sélectionner un référentiel —</option>
//                   {FRAMEWORKS.map(fw => (
//                     <option key={fw.value} value={fw.value}>{fw.label}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Dates */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Date de début <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="date"
//                     value={formData.date_start}
//                     onChange={e => field('date_start', e.target.value)}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                     Date de fin <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     type="date"
//                     value={formData.date_end}
//                     onChange={e => field('date_end', e.target.value)}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                   />
//                 </div>
//               </div>

//               {/* ── Période N-1 ────────────────────────────────────────── */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   <FiLink size={13} className="inline mr-1 text-indigo-500" />
//                   Période N-1 (référence)
//                 </label>
//                 <select
//                   value={formData.previous_period}
//                   onChange={e => field('previous_period', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                 >
//                   <option value="">— Aucune (première balance) —</option>
//                   {periods
//                     .filter(p => !editingPeriod || p.id !== editingPeriod.id)
//                     .map(p => (
//                       <option key={p.id} value={p.id}>
//                         {p.code} — {p.name}
//                         {hasValidatedImport(p.id) ? ' ✓' : ' ⚠ non importée'}
//                       </option>
//                     ))}
//                 </select>
//                 <p className="text-xs text-gray-400 mt-1">
//                   Cette liaison détermine automatiquement la balance N-1 lors de l'import.
//                   Si vide → cette période est traitée comme première balance.
//                 </p>

//                 {/* Avertissement si N-1 choisie mais non importée */}
//                 {formData.previous_period && !hasValidatedImport(formData.previous_period) && (
//                   <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
//                     <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
//                     <span>
//                       Cette période N-1 n'a pas encore de balance validée importée.
//                       Vous pourrez créer la période, mais l'import sera bloqué jusqu'à
//                       ce que la balance N-1 soit importée et validée.
//                     </span>
//                   </div>
//                 )}
//               </div>

//               {/* ── Date de verrouillage ──────────────────────────────── */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                   <FiCalendar size={13} className="inline mr-1 text-gray-400" />
//                   Date de verrouillage
//                 </label>
//                 <input
//                   type="date"
//                   value={formData.lock_date}
//                   onChange={e => field('lock_date', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm outline-none"
//                 />
//                 <p className="text-xs text-gray-400 mt-1">
//                   Le statut passera automatiquement à <strong>Verrouillé</strong> quand cette date sera atteinte.
//                 </p>
//               </div>

//               {/* ── Section avancée (opening_reference_period) ─────────── */}
//               <div className="border border-gray-200 rounded-lg overflow-hidden">
//                 <button
//                   type="button"
//                   onClick={() => setShowAdvanced(v => !v)}
//                   className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 font-medium transition-colors"
//                 >
//                   <span>Options avancées</span>
//                   {showAdvanced ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
//                 </button>
//                 {showAdvanced && (
//                   <div className="px-4 py-4 space-y-4 bg-white">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                         Référence d'ouverture spécifique
//                       </label>
//                       <select
//                         value={formData.opening_reference_period}
//                         onChange={e => field('opening_reference_period', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm outline-none"
//                       >
//                         <option value="">— Utiliser la période N-1 par défaut —</option>
//                         {periods
//                           .filter(p => !editingPeriod || p.id !== editingPeriod.id)
//                           .map(p => (
//                             <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
//                           ))}
//                       </select>
//                       <p className="text-xs text-gray-400 mt-1">
//                         Prioritaire sur la période N-1 pour la vérification des soldes d'ouverture.
//                         À utiliser uniquement en cas de reprise de données ou de cas particulier.
//                       </p>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <input
//                         type="checkbox"
//                         id="active"
//                         checked={formData.active}
//                         onChange={e => field('active', e.target.checked)}
//                         className="h-4 w-4 text-violet-600 rounded border-gray-300"
//                       />
//                       <label htmlFor="active" className="text-sm text-gray-700">
//                         Période active
//                       </label>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1.5">
//                         Commentaire
//                       </label>
//                       <textarea
//                         value={formData.comment}
//                         onChange={e => field('comment', e.target.value)}
//                         rows={3}
//                         placeholder="Remarques ou informations complémentaires…"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm resize-none outline-none"
//                       />
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Boutons */}
//               <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   disabled={saving}
//                   className="px-5 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
//                 >
//                   Annuler
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={saving || !activeEntity}
//                   className="px-6 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
//                 >
//                   {saving && (
//                     <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
//                   )}
//                   {editingPeriod ? 'Mettre à jour' : 'Créer la période'}
//                 </button>
//               </div>

//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }










// src/pages/Entities/SelectEntitePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import {
  FiSearch,
  FiX,
  FiRefreshCw,
  FiPlus,
  FiArrowLeft,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import Header from '../../components/Header';
import EntityFormModal from '../../components/EntityFormModal';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const DEFAULT_LANGUAGES = [
  { id: 1, nom: 'Français', code: 'fr' },
  { id: 2, nom: 'English', code: 'en' },
  { id: 3, nom: 'Español', code: 'es' },
  { id: 4, nom: 'Deutsch', code: 'de' },
  { id: 5, nom: 'Italiano', code: 'it' },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/** Normalise les réponses API : tableau direct, .results, ou .data */
const extractData = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.results && Array.isArray(response.results)) return response.results;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return [];
};

/** Vérifie si une entité est active (booléen ou chaîne) */
const isActive = (entite) => entite.statut === true || entite.statut === 'true';

// ─────────────────────────────────────────────
// HOOK PERSONNALISÉ — Données des entités
// ─────────────────────────────────────────────
function useEntities() {
  const navigate = useNavigate();
  const [entites, setEntites] = useState([]);
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntite, setSelectedEntite] = useState(() => {
    try {
      const stored = localStorage.getItem('currentEntite');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [entitesRes, paysRes, devisesRes, languesRes] = await Promise.all([
        apiClient.get('/entites/'),
        apiClient.get('/pays/'),
        apiClient.get('/devises/'),
        apiClient.get('/langues/'),
      ]);

      const entitesActives = extractData(entitesRes).filter(isActive);
      setEntites(entitesActives);
      setPays(extractData(paysRes));
      setDevises(extractData(devisesRes));

      const languesData = extractData(languesRes);
      setLangues(languesData.length > 0 ? languesData : DEFAULT_LANGUAGES);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expirée. Redirection vers la page de connexion...');
        setTimeout(() => {
          localStorage.clear();
          navigate('/login');
        }, 2000);
      } else if (err.response?.status === 404) {
        setError('Le système n\'est pas configuré. Contactez l\'administrateur.');
      } else {
        setError('Impossible de charger les données. Vérifiez votre connexion.');
      }
      setEntites([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectEntite = useCallback((entite) => {
    setSelectedEntite(entite);

    localStorage.setItem('currentEntite', JSON.stringify(entite));
    localStorage.setItem('entiteActive', entite.id.toString());
    localStorage.setItem('entiteSelectedAt', new Date().toISOString());

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.company_id = entite.id;
      user.entite_active = entite.id;
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      // silencieux — non bloquant
    }

    setTimeout(() => navigate('/dashboard'), 800);
  }, [navigate]);

  return {
    entites, pays, devises, langues,
    loading, error,
    selectedEntite,
    fetchAll, selectEntite,
  };
}

// ─────────────────────────────────────────────
// HOOK — Filtrage + Pagination
// ─────────────────────────────────────────────
function useFilteredPagination(items) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;

    return items.filter((e) =>
      [e.raison_sociale, e.activite, e.ville, e.forme_juridique]
        .some((field) => field?.toLowerCase().includes(term))
    );
  }, [searchTerm, items]);

  // Réinitialise la page si le filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  return {
    searchTerm, setSearchTerm,
    currentPage: safePage,
    setCurrentPage,
    itemsPerPage, setItemsPerPage,
    filtered, paginated,
    totalPages,
    totalItems: filtered.length,
    startIndex,
  };
}

// ─────────────────────────────────────────────
// HOOK — Sélection de lignes (checkboxes)
// ─────────────────────────────────────────────
function useRowSelection(visibleIds) {
  const [selected, setSelected] = useState([]);

  const toggle = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.length === visibleIds.length && visibleIds.length > 0 ? [] : [...visibleIds]
    );
  }, [visibleIds]);

  return { selected, toggle, toggleAll };
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Spinner de chargement centré */
function LoadingScreen() {
  return (
    <div className="px-4 pt-0 pb-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <Header />
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-3 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 animate-pulse" />
          <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Page d'onboarding quand aucune entité n'existe */
function EmptyStateScreen({ onCreateClick }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-violet-50 p-6">
      <Header />
      <div className="max-w-2xl mx-auto mt-10 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full mb-6">
          <TbBuildingSkyscraper className="w-12 h-12 text-violet-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Bienvenue dans votre espace !
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          Vous n'avez pas encore de société configurée.
        </p>
        <p className="text-gray-500 mb-8">
          Pour commencer à utiliser l'application, vous devez créer votre première société.
          Cela prendra seulement quelques minutes.
        </p>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-violet-500 text-white p-8 flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <FiPlus className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold">Prêt à commencer ?</h2>
              <p className="text-violet-100">Créez votre première société en 3 étapes simples</p>
            </div>
          </div>
          <div className="p-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2"
            >
              <FiArrowLeft size={18} />
              Retour à la connexion
            </button>
            <button
              onClick={onCreateClick}
              className="px-8 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <FiPlus size={18} />
              Créer ma première société
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Barre d'outils : créer, titre, recherche, items/page */
function Toolbar({ searchTerm, onSearch, itemsPerPage, onItemsPerPageChange, onCreateClick }) {
  return (
    <div className="flex items-center gap-2 flex-wrap p-2 border border-gray-300 rounded-lg bg-white">
      <button
        onClick={onCreateClick}
        className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all font-medium flex items-center gap-1 shadow text-sm"
      >
        <FiPlus size={14} />
        <span>Nouvelle Société</span>
      </button>

      <span className="text-base font-bold text-gray-900 px-2 py-1.5">
        Sélection de Société
      </span>

      <div className="relative flex-1 max-w-2xl">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher une société par nom, activité, ville..."
          className="pl-9 pr-8 py-1.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      <select
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        className="ml-auto border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
      >
        {ITEMS_PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n} lignes</option>
        ))}
      </select>
    </div>
  );
}

/** Banner d'erreur avec bouton réessayer */
function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="mb-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-lg p-3 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-red-100 rounded">
          <FiX className="w-3 h-3 text-red-600" />
        </div>
        <p className="font-medium text-red-900 text-sm">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
      >
        Réessayer
      </button>
    </div>
  );
}

/** Composant de pagination réutilisable */
function Pagination({ currentPage, totalPages, totalItems, startIndex, itemsPerPage, onPageChange }) {
  if (totalPages <= 1) return null;

  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  /** Génère les numéros de page avec fenêtre glissante de 5 */
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-xs text-gray-600">
          Page {currentPage} sur {totalPages} · Lignes {startIndex + 1}–{endIndex} sur {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-1 rounded border transition-all ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            <FiChevronLeft size={12} />
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[28px] h-7 rounded border text-xs font-medium transition-all ${
                currentPage === page
                  ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-1 rounded border transition-all ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            <FiChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Une ligne de la table */
function EntityRow({ entite, isSelected, isChecked, onSelect, onToggleCheck, disabled }) {
  return (
    <tr
      className={`transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-gradient-to-r from-violet-100 to-violet-50 border-l-4 border-l-violet-500'
          : isChecked
            ? 'bg-gradient-to-r from-violet-50 to-violet-25 hover:from-violet-100 hover:to-violet-50'
            : 'bg-white hover:from-gray-50 hover:to-gray-100 hover:bg-gradient-to-r'
      }`}
    >
      <td className="px-2 py-2 whitespace-nowrap border border-gray-200 w-8">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => { e.stopPropagation(); onToggleCheck(); }}
          className="w-2.5 h-2.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
        />
      </td>
      <td className="px-3 py-2 font-medium text-gray-900 border border-gray-200">
        {entite.raison_sociale}
        {entite.forme_juridique && (
          <div className="text-xs text-gray-500 mt-0.5">{entite.forme_juridique}</div>
        )}
      </td>
      <td className="px-3 py-2 text-gray-700 border border-gray-200">
        {entite.activite || '—'}
      </td>
      <td className="px-3 py-2 text-gray-700 border border-gray-200">
        {entite.ville || '—'}
        {entite.pays_details && (
          <div className="text-xs text-gray-500 mt-0.5">
            {entite.pays_details.nom || entite.pays_details.code_iso}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-gray-700 border border-gray-200">
        {entite.statut ? 'Active' : 'Inactive'}
      </td>
      <td className="px-3 py-2 text-right border border-gray-200">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isSelected
              ? 'bg-violet-600 text-white'
              : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          {isSelected ? 'Sélectionné' : 'Sélectionner'}
        </button>
      </td>
    </tr>
  );
}

/** Table complète avec en-tête, lignes, empty state */
function EntitiesTable({ paginated, selectedEntite, selectedRows, onSelect, onToggleRow, onToggleAll, processing }) {
  const allChecked = paginated.length > 0 && selectedRows.length === paginated.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <th className="px-2 py-1.5 border border-gray-200 w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  className="w-2.5 h-2.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
              </th>
              {['Raison Sociale', 'Activité', 'Localisation', 'Statut', 'Actions'].map((label) => (
                <th
                  key={label}
                  className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 tracking-wider border border-gray-200 whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center border border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                      <TbBuildingSkyscraper className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Aucun résultat trouvé</h3>
                    <p className="text-gray-500 text-sm">Essayez de modifier vos critères de recherche</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((entite) => (
                <EntityRow
                  key={entite.id}
                  entite={entite}
                  isSelected={selectedEntite?.id === entite.id}
                  isChecked={selectedRows.includes(entite.id)}
                  onSelect={() => onSelect(entite)}
                  onToggleCheck={() => onToggleRow(entite.id)}
                  disabled={processing}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Footer : info session + actions */
function PageFooter({ onLogout, onRefresh }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center gap-2 text-gray-600 text-sm">
        <FiInfo className="text-violet-400" />
        <span>Session en attente de sélection d'entité</span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onLogout}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
        >
          Se déconnecter
        </button>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all font-medium text-sm flex items-center gap-2"
        >
          <FiRefreshCw size={14} />
          Actualiser
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
export default function SelectEntitePage() {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { entites, pays, devises, langues, loading, error, selectedEntite, fetchAll, selectEntite } =
    useEntities();

  const {
    searchTerm, setSearchTerm,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    paginated, totalPages, totalItems, startIndex,
  } = useFilteredPagination(entites);

  const visibleIds = useMemo(() => paginated.map((e) => e.id), [paginated]);
  const { selected: selectedRows, toggle: toggleRow, toggleAll: toggleAllRows } =
    useRowSelection(visibleIds);

  // ── Sélection d'une entité avec gestion de l'état de traitement ──
  const handleSelect = useCallback(async (entite) => {
    if (processing) return;
    setProcessing(true);
    try {
      await selectEntite(entite);
    } catch {
      setProcessing(false);
    }
  }, [processing, selectEntite]);

  // ── Déconnexion ──
  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate('/login');
  }, [navigate]);

  // ── Callback de création réussie ──
  const handleCreateSuccess = useCallback(async () => {
    await fetchAll();
    setShowCreateForm(false);
  }, [fetchAll]);

  // ─── RENDERS CONDITIONNELS ───
  if (loading) return <LoadingScreen />;

  if (entites.length === 0 && !showCreateForm) {
    return <EmptyStateScreen onCreateClick={() => setShowCreateForm(true)} />;
  }

  // ─── RENDER PRINCIPAL ───
  return (
    <div className="px-4 pt-0 pb-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <Header />

      <div className={showCreateForm ? 'max-w-7xl mx-auto mt-6' : ''}>
        {/* Modal de création */}
        {showCreateForm && (
          <EntityFormModal
            entity={null}
            users={[]}
            pays={pays}
            devises={devises}
            langues={langues}
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleCreateSuccess}
          />
        )}

        {/* Vue principale (table + toolbar) */}
        {!showCreateForm && entites.length > 0 && (
          <>
            <Toolbar
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              onCreateClick={() => setShowCreateForm(true)}
            />

            <ErrorBanner message={error} onRetry={fetchAll} />

            <EntitiesTable
              paginated={paginated}
              selectedEntite={selectedEntite}
              selectedRows={selectedRows}
              onSelect={handleSelect}
              onToggleRow={toggleRow}
              onToggleAll={toggleAllRows}
              processing={processing}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />

            <PageFooter onLogout={handleLogout} onRefresh={fetchAll} />
          </>
        )}
      </div>
    </div>
  );
}
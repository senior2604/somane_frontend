// C:\python\django\somane_frontend\src\features\financial-reports\pages\index.jsx
// CORRECTIONS :
//   - L'API est remplacée par financial-reports/raw-imports/?state=validated
//     pour n'afficher QUE les imports validés (= balances ayant généré des états)
//   - Les liens "Voir" pointent vers /financial-reports/{import.id} (= id du raw-import)
//   - Le bouton ⚡ régénère depuis l'import source (même id)
//   - Plus de confusion avec les templates SYSCOHADA (id 4, 5, 6)

import { useEffect, useState } from 'react';
import {
  FiEye, FiFilter, FiPlus, FiSearch,
  FiRefreshCw, FiZap, FiCalendar, FiDatabase,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';

const STYLES = `
  * { box-sizing: border-box; }

  .sysc-page {
    font-family: Arial, sans-serif;
    background: #e8e8e8;
    min-height: 100vh;
    color: #1a1a1a;
    font-size: 13px;
  }
  .sysc-inner { max-width: 960px; margin: 0 auto; padding: 16px; }

  .sysc-navbar {
    background: #0d2438;
    padding: 8px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    border-radius: 3px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0,0,0,.4);
  }
  .navbar-title { color: white; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .navbar-crumb { color: rgba(255,255,255,.4); font-size: 10px; }
  .navbar-page  { color: #ffd700; font-size: 11px; font-weight: 700; }
  .sysc-navbar-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px; border-radius: 4px;
    background: rgba(255,255,255,.08); color: #ccc;
    border: 1px solid rgba(255,255,255,.15);
    font-size: 11px; cursor: pointer; font-family: Arial;
    transition: background .15s;
    text-decoration: none;
  }
  .sysc-navbar-btn:hover { background: rgba(255,255,255,.15); color: white; }
  .sysc-navbar-btn.primary { background: #ffd700; color: #0d2438; border: none; font-weight: 700; }
  .sysc-navbar-btn.primary:hover { background: #f0c800; }

  .section-header {
    background: #1a3a5c;
    color: white;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 3px 3px 0 0;
  }
  .section-header h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: white; }
  .section-header p  { font-size: 10px; color: rgba(255,255,255,.65); margin-top: 2px; }
  .badge-count {
    background: #ffd700; color: #0d2438;
    font-size: 10px; font-weight: 700;
    padding: 3px 10px; border-radius: 2px;
    white-space: nowrap;
  }

  .filters-bar {
    background: white;
    border: 1px solid #c0c8d8; border-top: none;
    padding: 10px 16px;
    display: flex; gap: 10px; align-items: center;
  }
  .search-wrap { flex: 1; position: relative; }
  .search-wrap input {
    width: 100%; padding: 6px 10px 6px 30px;
    border: 1px solid #ccc; border-radius: 2px;
    font-size: 11px; font-family: Arial; color: #1a1a1a;
    background: white;
  }
  .search-wrap input:focus { outline: none; border-color: #1a3a5c; }
  .search-icon {
    position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
    color: #888; pointer-events: none; font-size: 14px;
  }
  .filter-select {
    padding: 6px 10px; border: 1px solid #ccc; border-radius: 2px;
    font-size: 11px; font-family: Arial; color: #1a1a1a;
    background: white; cursor: pointer;
  }
  .filter-select:focus { outline: none; border-color: #1a3a5c; }

  .stats-bar {
    display: grid; grid-template-columns: repeat(3, 1fr);
    background: #f0f4f8;
    border: 1px solid #c0c8d8; border-top: none;
    border-bottom: 3px solid #1a3a5c;
  }
  .stat-cell {
    padding: 10px 16px; text-align: center;
    border-right: 1px solid #c0c8d8;
  }
  .stat-cell:last-child { border-right: none; }
  .stat-num  { font-size: 24px; font-weight: 700; line-height: 1; }
  .stat-label{ font-size: 9.5px; color: #555; text-transform: uppercase; letter-spacing: .03em; margin-top: 3px; }
  .stat-violet .stat-num { color: #1a3a5c; }
  .stat-blue   .stat-num { color: #185fa5; }
  .stat-green  .stat-num { color: #3b6d11; }

  .cards-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: #c0c8d8;
    border: 1px solid #c0c8d8; border-top: none;
  }
  @media (max-width: 720px) { .cards-grid { grid-template-columns: 1fr; } }
  @media (max-width: 960px) and (min-width: 721px) { .cards-grid { grid-template-columns: repeat(2, 1fr); } }

  .report-card {
    background: white;
    padding: 14px 16px;
    display: flex; flex-direction: column; gap: 10px;
    transition: background .12s;
  }
  .report-card:hover { background: #f5f8ff; }

  .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .card-name { font-size: 12px; font-weight: 700; color: #1a3a5c; line-height: 1.3; }
  .card-meta { font-size: 10px; color: #666; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
  .card-period {
    font-size: 9.5px; color: #555;
    background: #eef2f7; border: 1px solid #d0d8e8;
    border-radius: 2px; padding: 2px 6px;
    margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;
  }

  .pill { font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 2px; white-space: nowrap; }
  .pill-validated { background: #e3f2fd; color: #0c447c; border: 1px solid #b5d4f4; }
  .pill-ref       { background: #fff8e1; color: #7a5c00; border: 1px solid #ffe082; }

  .etats-badges {
    display: flex; gap: 4px; flex-wrap: wrap;
  }
  .etat-badge {
    font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 2px;
    text-transform: uppercase; letter-spacing: .03em;
    display: inline-flex; align-items: center; gap: 3px;
  }
  .etat-bilan  { background: #e3f2fd; color: #0c447c; border: 1px solid #b5d4f4; }
  .etat-cr     { background: #e8f5e9; color: #27500a; border: 1px solid #c0dd97; }
  .etat-tft    { background: #eeedfe; color: #3c3489; border: 1px solid #ceccf6; }

  .card-actions { display: flex; gap: 6px; margin-top: 4px; }
  .action-btn {
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 5px 8px;
    font-size: 10px; font-weight: 700; font-family: Arial;
    border-radius: 2px; border: 1px solid transparent;
    cursor: pointer; text-transform: uppercase; letter-spacing: .03em;
    text-decoration: none;
    transition: filter .1s;
  }
  .action-btn:hover { filter: brightness(.91); }
  .btn-view      { background: #e3f2fd; color: #0c447c; border-color: #b5d4f4; }
  .btn-syscohada { background: #f0f4ff; color: #2c3e8c; border-color: #b8c4ef; }
  .btn-regen     { background: #f3e8fd; color: #4a1d78; border-color: #d4aaef; flex: 0; padding: 5px 10px; }
  .btn-import    { background: #f5f5f0; color: #444; border-color: #d0cec4; flex: 0; padding: 5px 10px; }

  .empty-state {
    background: white;
    border: 1px solid #c0c8d8; border-top: none;
    padding: 48px; text-align: center;
  }
  .empty-label { color: #888; font-size: 12px; margin-bottom: 14px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid #ddd; border-top-color: #1a3a5c;
    border-radius: 50%;
    animation: spin .8s linear infinite;
    margin: 80px auto;
  }

  .error-block {
    background: #ffebee; border: 1px solid #ef9a9a; border-top: none;
    padding: 10px 16px; color: #b71c1c; font-size: 12px;
  }

  .info-banner {
    background: #e8f4fd; border: 1px solid #b5d4f4; border-top: none;
    padding: 8px 16px; color: #0c447c; font-size: 11px;
    display: flex; align-items: center; gap: 8px;
  }
`;

export default function FinancialReportsList() {
  const [imports, setImports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRef, setFilterRef]   = useState('all');
  const [regenerating, setRegenerating] = useState(null);

  useEffect(() => { loadImports(); }, []);

  // ── On charge les raw-imports VALIDÉS (state=validated)
  // Ces imports sont ceux dont les états financiers ont été générés.
  // L'id de chaque import est utilisé directement pour naviguer
  // vers /financial-reports/{id} (fichier 3 — FinancialStatementsSyscohada).
  const loadImports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        'financial-reports/raw-imports/?state=validated'
      );
      const data = Array.isArray(response)
        ? response
        : response.results || response.data || [];
      // Exclure les balances de référence N-1 de la liste principale
      // (elles servent d'input, elles n'ont pas d'états à afficher)
      setImports(data.filter(imp => !imp.is_reference_balance));
      setError(null);
    } catch (err) {
      console.error('Erreur chargement imports validés:', err);
      setError('Impossible de charger les états financiers.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (importId) => {
    if (!importId) return;
    if (!window.confirm('Régénérer les états financiers depuis cet import ?')) return;
    setRegenerating(importId);
    try {
      const res = await apiClient.post(
        `financial-reports/raw-imports/${importId}/regenerate_statements/`
      );
      alert(res.detail || 'États financiers régénérés avec succès.');
      await loadImports();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erreur lors de la régénération.';
      alert(msg);
    } finally {
      setRegenerating(null);
    }
  };

  const getPeriodLabel = (imp) => {
    if (!imp.period) return '—';
    if (typeof imp.period === 'object') return imp.period.name || imp.period.code || '—';
    return String(imp.period);
  };

  const getSourceLabel = (imp) => {
    if (!imp.data_source) return '—';
    if (typeof imp.data_source === 'object') return imp.data_source.name || '—';
    return String(imp.data_source);
  };

  const getImportDate = (imp) => {
    if (!imp.import_date) return '—';
    return new Date(imp.import_date).toLocaleDateString('fr-FR');
  };

  const filteredImports = imports.filter(imp => {
    const matchesSearch =
      (imp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPeriodLabel(imp).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRef =
      filterRef === 'all' ||
      (filterRef === 'normal'    && !imp.is_reference_balance) ||
      (filterRef === 'reference' &&  imp.is_reference_balance);
    return matchesSearch && matchesRef;
  });

  return (
    <div className="sysc-page">
      <style>{STYLES}</style>

      <div className="sysc-inner">
        {/* ── Navigation ── */}
        <div className="sysc-navbar">
          <div className="navbar-title">
            <span>📄 Gestion Financière</span>
            <span className="navbar-crumb">›</span>
            <span className="navbar-page">États financiers générés</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="sysc-navbar-btn" onClick={loadImports} title="Actualiser">
              <FiRefreshCw size={12} /> Actualiser
            </button>
            <Link to="/financial-reports/imports" className="sysc-navbar-btn primary">
              <FiPlus size={14} /> Nouvel import
            </Link>
          </div>
        </div>

        {/* ── En-tête ── */}
        <div className="section-header">
          <div>
            <h1>États Financiers Générés</h1>
            <p>Bilan · Compte de résultat · Flux de trésorerie — produits depuis les balances validées</p>
          </div>
          <span className="badge-count">{imports.length} balance{imports.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Bannière info ── */}
        <div className="info-banner">
          ℹ️ Chaque ligne correspond à une balance validée. Cliquez sur <strong>📊 États</strong> pour
          consulter le Bilan, Compte de résultat et TFT au format SYSCOHADA.
        </div>

        {/* ── Filtres ── */}
        <div className="filters-bar">
          <div className="search-wrap">
            <FiSearch className="search-icon" size={14} />
            <input
              type="text"
              placeholder="Rechercher par nom ou période..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <FiFilter size={14} style={{ color: '#888', flexShrink: 0 }} />
          <select className="filter-select" value={filterRef} onChange={e => setFilterRef(e.target.value)}>
            <option value="all">Toutes les balances</option>
            <option value="normal">Balances principales</option>
            <option value="reference">Balances N-1</option>
          </select>
        </div>

        {/* ── Statistiques ── */}
        <div className="stats-bar">
          <div className="stat-cell stat-violet">
            <div className="stat-num">{imports.length}</div>
            <div className="stat-label">Balances validées</div>
          </div>
          <div className="stat-cell stat-blue">
            <div className="stat-num">
              {imports.filter(i => !i.is_reference_balance).length}
            </div>
            <div className="stat-label">Balances principales</div>
          </div>
          <div className="stat-cell stat-green">
            <div className="stat-num">
              {imports.filter(i => i.is_reference_balance).length}
            </div>
            <div className="stat-label">Balances N-1</div>
          </div>
        </div>

        {/* ── Contenu ── */}
        {loading && <div className="spinner" />}

        {!loading && error && <div className="error-block">{error}</div>}

        {!loading && !error && filteredImports.length === 0 && (
          <div className="empty-state">
            <p className="empty-label">
              {imports.length === 0
                ? 'Aucune balance validée — importez et validez une balance pour générer les états financiers.'
                : 'Aucune balance ne correspond aux filtres sélectionnés.'}
            </p>
            <Link to="/financial-reports/imports" className="sysc-navbar-btn primary" style={{ display: 'inline-flex' }}>
              <FiPlus size={14} /> Importer une balance
            </Link>
          </div>
        )}

        {!loading && !error && filteredImports.length > 0 && (
          <div className="cards-grid">
            {filteredImports.map(imp => {
              const isRegen = regenerating === imp.id;

              return (
                <div key={imp.id} className="report-card">

                  {/* Titre + statut */}
                  <div className="card-top">
                    <div>
                      <div className="card-name">{imp.name}</div>
                      <div className="card-meta">
                        <FiDatabase size={10} />
                        {getSourceLabel(imp)}
                      </div>
                      <div className="card-meta" style={{ marginTop: 2 }}>
                        <FiCalendar size={10} />
                        Importé le {getImportDate(imp)}
                      </div>
                    </div>
                    <span className={`pill ${imp.is_reference_balance ? 'pill-ref' : 'pill-validated'}`}>
                      {imp.is_reference_balance ? 'Réf. N-1' : 'Validé'}
                    </span>
                  </div>

                  {/* Période */}
                  <div>
                    <span className="card-period">
                      <FiCalendar size={9} />
                      {getPeriodLabel(imp)}
                    </span>
                  </div>

                  {/* États disponibles */}
                  <div>
                    <div style={{ fontSize: 9.5, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      États disponibles
                    </div>
                    <div className="etats-badges">
                      <span className="etat-badge etat-bilan">⚖️ Bilan</span>
                      <span className="etat-badge etat-cr">📊 Résultat</span>
                      <span className="etat-badge etat-tft">💸 Trésorerie</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="card-actions">
                    {/* Voir les états SYSCOHADA — pointe vers /financial-reports/{import.id} */}
                    <Link
                      to={`/financial-reports/${imp.id}`}
                      className="action-btn btn-view"
                      title="Consulter les états financiers SYSCOHADA"
                    >
                      <FiEye size={11} /> États SYSCOHADA
                    </Link>

                    {/* Régénérer */}
                    <button
                      className="action-btn btn-regen"
                      onClick={() => handleRegenerate(imp.id)}
                      disabled={isRegen}
                      title="Régénérer les états financiers"
                    >
                      <FiZap size={11} />
                      {isRegen ? '…' : ''}
                    </button>

                    {/* Voir l'import source */}
                    <Link
                      to={`/financial-reports/import/${imp.id}`}
                      className="action-btn btn-import"
                      title="Voir la balance source"
                      style={{ flex: 0, padding: '5px 10px' }}
                    >
                      <FiDatabase size={11} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
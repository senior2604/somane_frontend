// src/features/financial-reports/pages/import/[id].jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';

export default function ImportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [importData, setImportData] = useState(null);
  const [stagingLines, setStagingLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [activeCell, setActiveCell] = useState(null); // { lineId, field }
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  
  // Pour éviter les re-renders pendant l'édition
  const isEditingRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const importRes = await apiClient.get(`financial-reports/raw-imports/${id}/`);
      setImportData(importRes);

      let lines = [];
      
      try {
        const stagingRes = await apiClient.get(`financial-reports/raw-imports/${id}/staging_lines/`);
        lines = stagingRes.results || stagingRes || [];
      } catch (err) {
        const stagingRes = await apiClient.get('financial-reports/staging/', {
          params: { 
            import_run: id,
            ordering: 'account_code'
          },
        });
        lines = stagingRes.results || stagingRes || [];
      }

      const uniqueLines = Array.from(
        new Map(lines.map(line => [line.id, line])).values()
      );
      
      setStagingLines(uniqueLines);
      
    } catch (err) {
      setError('Impossible de charger les détails');
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellClick = (lineId, field, currentValue) => {
    // Ne pas activer si déjà en édition
    if (isEditingRef.current) return;
    
    setActiveCell({ lineId, field });
    setEditValue(currentValue ?? '');
    isEditingRef.current = true;
  };

  const saveCell = async (lineId, field, newValue, oldValue) => {
    const line = stagingLines.find(l => l.id === lineId);
    if (!line) return;

    // Conversion pour champs numériques
    const numericFields = ['opening_debit', 'opening_credit', 'movement_debit', 'movement_credit', 'closing_debit', 'closing_credit'];
    
    let valueToSave = newValue;
    let originalValue = oldValue;

    if (numericFields.includes(field)) {
      valueToSave = newValue === '' ? 0 : parseFloat(String(newValue).replace(',', '.'));
      originalValue = originalValue ?? 0;
      
      if (isNaN(valueToSave)) {
        valueToSave = 0;
      }
    }

    // Si pas de changement, ne rien faire
    if (valueToSave === originalValue) {
      return;
    }

    setSavingCell({ lineId, field });

    try {
      const response = await apiClient.patch(
        `financial-reports/staging/${lineId}/`,
        { [field]: valueToSave }
      );

      setStagingLines(prev =>
        prev.map(l =>
          l.id === lineId ? { ...l, ...response } : l
        )
      );

      setSuccessMessage('Cellule mise à jour');
      setTimeout(() => setSuccessMessage(''), 2000);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur de sauvegarde';
      setError(`Erreur : ${errorMsg}`);
    } finally {
      setSavingCell(null);
    }
  };

  const exitEditMode = (shouldSave = true) => {
    if (!activeCell) return;

    const { lineId, field } = activeCell;
    const line = stagingLines.find(l => l.id === lineId);
    
    if (shouldSave && line) {
      saveCell(lineId, field, editValue, line[field]);
    }

    setActiveCell(null);
    setEditValue('');
    isEditingRef.current = false;
  };

  const handleKeyDown = (e, lineId, field, lineIndex, fieldIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exitEditMode(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitEditMode(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      exitEditMode(true);
      
      // Navigation vers la cellule suivante
      const fields = ['account_code', 'account_label', 'opening_debit', 'opening_credit', 'movement_debit', 'movement_credit', 'closing_debit', 'closing_credit'];
      const nextFieldIndex = (fieldIndex + 1) % fields.length;
      const nextLineIndex = nextFieldIndex === 0 ? lineIndex + 1 : lineIndex;
      
      if (nextLineIndex < stagingLines.length) {
        const nextLine = stagingLines[nextLineIndex];
        const nextField = fields[nextFieldIndex];
        setTimeout(() => {
          handleCellClick(nextLine.id, nextField, nextLine[nextField]);
        }, 50);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      exitEditMode(true);
      if (lineIndex < stagingLines.length - 1) {
        setTimeout(() => {
          const nextLine = stagingLines[lineIndex + 1];
          handleCellClick(nextLine.id, field, nextLine[field]);
        }, 50);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      exitEditMode(true);
      if (lineIndex > 0) {
        setTimeout(() => {
          const prevLine = stagingLines[lineIndex - 1];
          handleCellClick(prevLine.id, field, prevLine[field]);
        }, 50);
      }
    }
  };

  const handleValidateImport = async () => {
    if (!window.confirm('Valider cet import ?')) return;

    setProcessing(true);
    setError(null);
    
    try {
      const response = await apiClient.post(`financial-reports/raw-imports/${id}/validate/`);
      setSuccessMessage(response.detail || 'Import validé avec succès !');
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur de validation';
      setError(`Erreur : ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprocess = async () => {
    if (!window.confirm('Re-traiter ce fichier ? Les anciennes lignes seront supprimées.')) return;

    setProcessing(true);
    setError(null);
  
    try {
      const response = await apiClient.post(`financial-reports/raw-imports/${id}/reprocess/`);
      setSuccessMessage(response.detail || 'Fichier retraité avec succès !');
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur de retraitement';
      setError(`Erreur : ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  // Composant de cellule Excel-style CORRIGÉ
  const ExcelCell = ({ line, field, lineIndex, fieldIndex, type = 'text', align = 'left' }) => {
    const inputRef = useRef(null);
    const isActive = activeCell?.lineId === line.id && activeCell?.field === field;
    const isSaving = savingCell?.lineId === line.id && savingCell?.field === field;
    const value = line[field];

    useEffect(() => {
      if (isActive && inputRef.current) {
        inputRef.current.focus();
        // NE PAS sélectionner automatiquement - placer le curseur à la fin
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, [isActive]);

    const displayValue = type === 'number' 
      ? (value ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : (value || '');

    const cellClasses = `
      px-4 py-2.5 border-r border-b border-gray-300 
      transition-all cursor-cell
      ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}
      ${isActive ? 'ring-2 ring-blue-500 ring-inset bg-white z-10' : 'hover:bg-blue-50'}
      ${isSaving ? 'bg-yellow-50' : ''}
    `;

    if (isActive) {
      return (
        <td className={cellClasses}>
          <input
            ref={inputRef}
            type="text"
            inputMode={type === 'number' ? 'decimal' : 'text'}
            value={editValue}
            onChange={(e) => {
              const val = e.target.value;
              if (type === 'number') {
                // Autoriser chiffres, virgule, point, moins
                if (/^-?[\d.,]*$/.test(val) || val === '') {
                  setEditValue(val);
                }
              } else {
                setEditValue(val);
              }
            }}
            onBlur={() => {
              // Petit délai pour permettre la navigation clavier
              setTimeout(() => {
                if (isEditingRef.current) {
                  exitEditMode(true);
                }
              }, 100);
            }}
            onKeyDown={(e) => handleKeyDown(e, line.id, field, lineIndex, fieldIndex)}
            className={`w-full h-full bg-transparent outline-none ${align === 'right' ? 'text-right' : ''}`}
            autoComplete="off"
            spellCheck="false"
          />
        </td>
      );
    }

    return (
      <td 
        className={cellClasses}
        onClick={() => handleCellClick(line.id, field, value)}
      >
        <div className="min-h-[24px]">
          {value != null ? displayValue : ''}
        </div>
      </td>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error && !importData) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-2xl mb-4">Erreur</div>
        <p>{error}</p>
        <button
          onClick={() => navigate('/financial-reports/import')}
          className="mt-6 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Retour aux imports
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full bg-gray-50 min-h-screen">
      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-3">
          <FiCheckCircle size={20} />
          {successMessage}
          <button 
            onClick={() => setSuccessMessage('')}
            className="ml-auto text-green-700 hover:text-green-900"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <FiAlertCircle size={20} />
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/financial-reports/import')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{importData.name}</h1>
            <p className="text-gray-600 mt-1">
              Import du {new Date(importData.import_date).toLocaleString('fr-FR')} • 
              Source : {importData.data_source?.name || '—'} • 
              Période : {importData.period?.name || '—'}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            importData.state === 'processed' ? 'bg-green-100 text-green-800' :
            importData.state === 'validated' ? 'bg-blue-100 text-blue-800' :
            importData.state === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {importData.state === 'draft' ? 'Brouillon' :
             importData.state === 'validated' ? 'Validé' :
             importData.state === 'processed' ? 'Traité' : 'Erreur'}
            {importData.state === 'processed' && <FiCheckCircle size={16} />}
            {importData.state === 'error' && <FiAlertCircle size={16} />}
          </span>

          {importData.state === 'error' && (
            <button
              onClick={handleReprocess}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FiRefreshCw size={18} />
              {processing ? 'Re-traitement...' : 'Re-traiter'}
            </button>
          )}

          {(importData.state === 'processed' || importData.state === 'draft') && (
            <button
              onClick={handleValidateImport}
              disabled={processing || stagingLines.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FiCheckCircle size={18} />
              {processing ? 'Validation...' : 'Valider l\'import'}
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-600">Lignes importées</div>
          <div className="text-2xl font-bold text-gray-900">{stagingLines.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-600">Validées</div>
          <div className="text-2xl font-bold text-green-600">
            {stagingLines.filter(l => l.validation_status === 'validated').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-600">En attente</div>
          <div className="text-2xl font-bold text-yellow-600">
            {stagingLines.filter(l => l.validation_status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-600">Erreurs</div>
          <div className="text-2xl font-bold text-red-600">
            {stagingLines.filter(l => l.validation_status === 'error').length}
          </div>
        </div>
      </div>

      {/* Tableau style Excel */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-b from-gray-100 to-gray-200 border-b-2 border-gray-400">
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-r border-gray-300 sticky left-0 bg-gradient-to-b from-gray-100 to-gray-200 z-20">
                  Code compte
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[250px]">
                  Libellé
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  solde N-1 débit 
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  solde N-1 crédit 
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  Mvt N débit
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  Mvt N crédit
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  Solde N débit
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  Solde N crédit
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border-r border-gray-300 min-w-[120px]">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 min-w-[200px]">
                  Erreur
                </th>
              </tr>
            </thead>
            <tbody>
              {stagingLines.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-gray-500 border-b border-gray-300">
                    Aucune ligne importée pour cet import
                  </td>
                </tr>
              ) : (
                stagingLines.map((line, lineIndex) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <ExcelCell 
                      line={line} 
                      field="account_code" 
                      lineIndex={lineIndex} 
                      fieldIndex={0}
                      type="text"
                    />
                    <ExcelCell 
                      line={line} 
                      field="account_label" 
                      lineIndex={lineIndex} 
                      fieldIndex={1}
                      type="text"
                    />
                    <ExcelCell 
                      line={line} 
                      field="opening_debit" 
                      lineIndex={lineIndex} 
                      fieldIndex={2}
                      type="number"
                      align="right"
                    />
                    <ExcelCell 
                      line={line} 
                      field="opening_credit" 
                      lineIndex={lineIndex} 
                      fieldIndex={3}
                      type="number"
                      align="right"
                    />
                    <ExcelCell 
                      line={line} 
                      field="movement_debit" 
                      lineIndex={lineIndex} 
                      fieldIndex={4}
                      type="number"
                      align="right"
                    />
                    <ExcelCell 
                      line={line} 
                      field="movement_credit" 
                      lineIndex={lineIndex} 
                      fieldIndex={5}
                      type="number"
                      align="right"
                    />
                    <ExcelCell 
                      line={line} 
                      field="closing_debit" 
                      lineIndex={lineIndex} 
                      fieldIndex={6}
                      type="number"
                      align="right"
                    />
                    <ExcelCell 
                      line={line} 
                      field="closing_credit" 
                      lineIndex={lineIndex} 
                      fieldIndex={7}
                      type="number"
                      align="right"
                    />
                    <td className="px-4 py-2.5 text-center border-r border-b border-gray-300">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        line.validation_status === 'validated' ? 'bg-green-100 text-green-800' :
                        line.validation_status === 'error' ? 'bg-red-100 text-red-800' :
                        line.validation_status === 'warning' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {line.validation_status === 'pending' ? 'En attente' :
                         line.validation_status === 'validated' ? 'Validé' :
                         line.validation_status === 'warning' ? 'Avertissement' : 'Erreur'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-red-600 border-b border-gray-300">
                      {line.error_details ? (
                        typeof line.error_details === 'string' 
                          ? line.error_details 
                          : JSON.stringify(line.error_details)
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Navigation :</strong> Cliquez sur une cellule pour l'éditer • 
          <kbd className="mx-1 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs">Tab</kbd> pour cellule suivante • 
          <kbd className="mx-1 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs">Enter</kbd> pour valider • 
          <kbd className="mx-1 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs">Esc</kbd> pour annuler • 
          <kbd className="mx-1 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs">↑</kbd>
          <kbd className="mx-1 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs">↓</kbd> pour naviguer verticalement
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6">
        <button
          onClick={() => navigate('/financial-reports/import')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          ← Retour à la liste
        </button>
        
        <div className="flex gap-4">
          {importData.state === 'error' && (
            <button
              onClick={handleReprocess}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <FiRefreshCw size={18} />
              {processing ? 'Re-traitement...' : 'Re-traiter le fichier'}
            </button>
          )}
          
          {(importData.state === 'processed' || importData.state === 'draft') && stagingLines.length > 0 && (
            <button
              onClick={handleValidateImport}
              disabled={processing || stagingLines.filter(l => l.validation_status === 'error').length > 0}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <FiCheckCircle size={18} />
              {processing ? 'Validation...' : 'Valider toutes les lignes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// features/comptabilité/components/ComptabiliteFormContainer.jsx
import React from 'react';
import { FiSave, FiX, FiDownload } from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';

export default function ComptabiliteFormContainer({
  // Configuration
  title = "Formulaire",
  subtitle = "",
  moduleType = 'pieces',
  
  // Navigation
  onBack = null,
  showBackButton = true,
  
  // États
  loading = false,
  error = null,
  success = null,
  
  // Actions
  onSubmit = null,
  onCancel = null,
  onExport = null,
  
  // Indicateurs
  hasWarning = false,
  warningMessage = '',
  totals = null,
  indicators = [],
  
  // Modes
  mode = 'create',
  isSubmitting = false,
  
  // Contenu
  children,
  
  // Actions supplémentaires
  additionalActions = [],
  
  // Personnalisation
  submitLabel = null,
  cancelLabel = null,
  showSubmitButton = true,
  showCancelButton = true,
}) {
  
  // Configuration par module
  const moduleConfigs = {
    pieces: {
      title: mode === 'create' ? 'Nouvelle écriture' : 
             mode === 'edit' ? 'Modifier écriture' : 
             'Détails',
      submitLabel: mode === 'create' ? 'Enregistrer' : 'Mettre à jour',
      cancelLabel: 'Annuler',
    },
    journaux: {
      title: mode === 'create' ? 'Créer un journal' : 
             mode === 'edit' ? 'Modifier journal' : 
             'Détails',
      submitLabel: mode === 'create' ? 'Enregistrer' : 'Mettre à jour',
      cancelLabel: 'Annuler',
    },
    comptes: {
      title: mode === 'create' ? 'Nouveau compte' : 
             mode === 'edit' ? 'Modifier compte' : 
             'Détails',
      submitLabel: mode === 'create' ? 'Enregistrer' : 'Mettre à jour',
      cancelLabel: 'Annuler',
    }
  };
  
  const config = moduleConfigs[moduleType] || moduleConfigs.pieces;
  const finalTitle = title || config.title;
  const finalSubmitLabel = submitLabel || config.submitLabel;
  const finalCancelLabel = cancelLabel || config.cancelLabel;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 py-2">
        {/* En-tête minimaliste */}
        <div className="mb-1">
          <div className="flex items-center justify-between">
            {/* Titre discret */}
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                {finalTitle}
              </div>
              {subtitle && (
                <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
              )}
            </div>

            {/* Actions minimales */}
            <div className="flex items-center gap-1">
              {mode === 'view' && onExport && (
                <div className="relative group">
                  <button 
                    className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-0.5 hover:bg-gray-100 rounded transition-colors"
                    title="Exporter"
                  >
                    Export
                  </button>
                  
                  <div className="absolute right-0 top-full mt-0.5 w-24 bg-white rounded shadow border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="p-1">
                      <button
                        onClick={() => onExport('pdf')}
                        className="w-full text-left px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <FaFilePdf size={8} className="text-red-500" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => onExport('excel')}
                        className="w-full text-left px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <FaFileExcel size={8} className="text-green-500" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Indicateurs discrets */}
          {(totals || indicators.length > 0) && (
            <div className="flex items-center gap-1 mt-1">
              {totals && (
                <div className={`px-1 py-0.5 rounded text-xs ${totals.balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {totals.balanced ? '✓ Équilibre' : '✗ Déséquilibre'}
                </div>
              )}
              
              {indicators.map((indicator, index) => (
                <div
                  key={index}
                  className={`px-1 py-0.5 rounded text-xs ${indicator.color || 'bg-gray-100 text-gray-700'}`}
                >
                  {indicator.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages d'état */}
        <div className="space-y-1 mb-2">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-1.5">
              <div className="flex items-start gap-1">
                <FiX className="text-red-500 flex-shrink-0 mt-0.5" size={9} />
                <p className="text-xs text-red-700 leading-tight">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded p-1.5">
              <div className="flex items-start gap-1">
                <FiSave className="text-green-500 flex-shrink-0 mt-0.5" size={9} />
                <p className="text-xs text-green-700 leading-tight">{success}</p>
              </div>
            </div>
          )}
          
          {hasWarning && warningMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
              <p className="text-xs text-blue-700 leading-tight">{warningMessage}</p>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="p-3">
            {children}
          </div>
          
          {/* Actions */}
          {(mode === 'create' || mode === 'edit') && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  {showCancelButton && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {finalCancelLabel}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {showSubmitButton && onSubmit && (
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={isSubmitting || loading}
                      className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white"></div>
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <FiSave size={10} />
                          <span>{finalSubmitLabel}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
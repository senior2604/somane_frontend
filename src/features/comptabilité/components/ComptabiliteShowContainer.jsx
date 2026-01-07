// features/comptabilité/components/ComptabiliteDashboardContainer.jsx
import React from 'react';
import { 
  FiEdit, 
  FiSave, 
  FiX, 
  FiPrinter, 
  FiDownload,
  FiCopy,
  FiFileText,
  FiCheck,
  FiEye,
  FiArrowLeft
} from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';

export default function ComptabiliteDashboardContainer({
  // Configuration du document
  reference = "FG/2025/09/0001",
  title = "Tableau de bord de la comptabilité",
  status = "draft", // draft | validated | posted
  date = new Date().toLocaleDateString('fr-FR'),
  
  // Navigation
  onBack = null,
  showBackButton = true,
  
  // États
  loading = false,
  error = null,
  mode = 'view', // view | edit | create
  
  // Actions principales
  onEdit = null,
  onSave = null,
  onCancel = null,
  onValidate = null,
  onPost = null,
  onPrint = null,
  onExport = null,
  onDuplicate = null,
  
  // Données de l'en-tête
  headerData = {
    financialType: "Payable",
    nature: "",
    departLocation: "",
    journal: "",
    driver: "",
    driverContact: "",
    invoiceObject: ""
  },
  
  // Écritures comptables
  accountingEntries = [],
  totals = {
    debit: 0,
    credit: 0,
    balanced: true
  },
  
  // Informations supplémentaires
  additionalInfo = "",
  transactionType = "Locations Transport",
  
  // Personnalisation
  showAccountingSection = true,
  showHeaderSection = true,
  showActions = true,
  
  // Contenu personnalisé
  children
}) {
  
  // Formatage des montants
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0) + ' CFA';
  };
  
  // Configuration des statuts
  const statusConfig = {
    draft: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Brouillon',
      icon: '📝'
    },
    validated: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Validé',
      icon: '✅'
    },
    posted: {
      color: 'bg-green-100 text-green-800 border-green-200',
      label: 'Comptabilisé',
      icon: '📊'
    }
  };
  
  const currentStatus = statusConfig[status] || statusConfig.draft;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Container principal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          
          {/* En-tête du document avec référence */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {showBackButton && onBack && (
                  <button
                    onClick={onBack}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    title="Retour"
                  >
                    <FiArrowLeft size={16} />
                  </button>
                )}
                
                <div>
                  <div className="flex items-center gap-3">
                    <FiFileText className="text-violet-600" size={24} />
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono font-semibold border border-gray-300">
                          {reference}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${currentStatus.color}`}>
                          {currentStatus.icon} {currentStatus.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          Date: {date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-2">
                  {mode === 'view' && onEdit && (
                    <button
                      onClick={onEdit}
                      className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-blue-200"
                    >
                      <FiEdit size={14} />
                      <span>Éditer</span>
                    </button>
                  )}
                  
                  {mode === 'view' && onDuplicate && (
                    <button
                      onClick={onDuplicate}
                      className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-300"
                    >
                      <FiCopy size={14} />
                      <span>Dupliquer</span>
                    </button>
                  )}
                  
                  {mode === 'view' && onPrint && (
                    <button
                      onClick={onPrint}
                      className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-300"
                    >
                      <FiPrinter size={14} />
                      <span>Imprimer</span>
                    </button>
                  )}
                  
                  {(mode === 'edit' || mode === 'create') && onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-red-200"
                    >
                      <FiX size={14} />
                      <span>Annuler</span>
                    </button>
                  )}
                  
                  {(mode === 'edit' || mode === 'create') && onSave && (
                    <button
                      onClick={onSave}
                      className="px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-green-200"
                    >
                      <FiSave size={14} />
                      <span>Comptabiliser</span>
                    </button>
                  )}
                  
                  {mode === 'view' && onExport && (
                    <div className="relative group">
                      <button className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-300">
                        <FiDownload size={14} />
                        <span>Exporter</span>
                      </button>
                      
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="p-1">
                          <button
                            onClick={() => onExport('pdf')}
                            className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <FaFilePdf size={12} className="text-red-500" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => onExport('excel')}
                            className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <FaFileExcel size={12} className="text-green-500" />
                            <span>Excel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Section en-tête du document (comme dans l'image) */}
          {showHeaderSection && (
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Financial Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Financial Type
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.financialType}
                  </div>
                </div>
                
                {/* Nature du Chargement */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Nature du Chargement
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.nature || '-'}
                  </div>
                </div>
                
                {/* Lieu de Départ */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Lieu de Départ
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.departLocation || '-'}
                  </div>
                </div>
                
                {/* Date comptable */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Date comptable
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {date}
                  </div>
                </div>
                
                {/* Journal */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Journal
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.journal || '-'}
                  </div>
                </div>
                
                {/* Chauffeur */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Chauffeur
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.driver || '-'}
                  </div>
                </div>
                
                {/* Driver Contact Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Driver Contact Number
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.driverContact || '-'}
                  </div>
                </div>
                
                {/* Objet de la Facture */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Objet de la Facture
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 min-h-[60px]">
                    {headerData.invoiceObject || '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Écritures comptables */}
          {showAccountingSection && (
            <div className="p-6 border-b border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Écritures comptables
                </h3>
                <div className="text-sm text-gray-600">
                  {transactionType}
                </div>
              </div>
              
              {/* Tableau des écritures */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Compte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Partenaire
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Libellé
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Compte analytique
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Immobilisation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Débit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Crédit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountingEntries.length > 0 ? (
                      accountingEntries.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            <div className="font-medium text-gray-900">
                              {entry.account || '-'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {entry.accountDescription || ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            {entry.partner || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            {entry.label || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            {entry.analyticAccount || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            {entry.immobilization || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 font-medium">
                            {entry.debit ? formatAmount(entry.debit) : '0 CFA'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {entry.credit ? formatAmount(entry.credit) : '0 CFA'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                          Aucune écriture comptable
                        </td>
                      </tr>
                    )}
                    
                    {/* Ligne des totaux */}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="5" className="px-4 py-3 text-right text-sm border-r border-gray-300">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-gray-300">
                        <span className={totals.balanced ? 'text-green-600' : 'text-red-600'}>
                          {formatAmount(totals.debit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={totals.balanced ? 'text-green-600' : 'text-red-600'}>
                          {formatAmount(totals.credit)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Résumé des totaux */}
              <div className="mt-4 flex justify-end">
                <div className={`px-4 py-2 rounded-lg ${
                  totals.balanced 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      Total Débit: {formatAmount(totals.debit)}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="font-medium">
                      Total Crédit: {formatAmount(totals.credit)}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className={`font-bold ${
                      totals.balanced ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {totals.balanced ? '✓ Équilibré' : '✗ Déséquilibré'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Informations supplémentaires */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Autres informations
              </h3>
            </div>
            
            {additionalInfo ? (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 whitespace-pre-line">{additionalInfo}</p>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p>Aucune information supplémentaire</p>
              </div>
            )}
          </div>
          
          {/* Section pour contenu personnalisé */}
          {children && (
            <div className="p-6 border-t border-gray-200">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
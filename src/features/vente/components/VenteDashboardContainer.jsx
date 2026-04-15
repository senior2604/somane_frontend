// src/features/vente/components/VenteDashboardContainer.jsx
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
  FiArrowLeft,
  FiShoppingCart,
  FiTruck,
  FiDollarSign,
  FiUser,
  FiCalendar,
  FiPackage
} from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';

export default function VenteDashboardContainer({
  // Configuration du document
  reference = "",
  title = "Document Vente",
  subtitle = "",
  status = "draft", // draft | validated | confirmed | delivered | canceled | invoiced
  date = new Date().toLocaleDateString('fr-FR'),
  documentType = "commande", // commande | devis | facture | bon_livraison
  
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
  onConfirm = null,
  onDeliver = null,
  onInvoice = null,
  onPrint = null,
  onExport = null,
  onDuplicate = null,
  onDelete = null,
  
  // Données de l'en-tête VENTE
  headerData = {
    client: "",
    commercial: "",
    dateCommande: "",
    dateLivraison: "",
    statut: "",
    modePaiement: "",
    adresseLivraison: "",
    adresseFacturation: "",
    referenceClient: "",
    conditions: ""
  },
  
  // Lignes de document
  documentLines = [],
  totals = {
    totalHT: 0,
    totalTaxe: 0,
    totalTTC: 0
  },
  
  // Informations supplémentaires
  additionalInfo = "",
  notes = "",
  
  // Personnalisation
  showHeaderSection = true,
  showClientSection = true,
  showLinesSection = true,
  showTotalsSection = true,
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
  
  // Configuration des statuts VENTE
  const statusConfig = {
    draft: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Brouillon',
      icon: '📝',
      iconComponent: <FiEdit className="text-yellow-600" size={16} />
    },
    validated: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Validé',
      icon: '✅',
      iconComponent: <FiCheck className="text-blue-600" size={16} />
    },
    confirmed: {
      color: 'bg-green-100 text-green-800 border-green-200',
      label: 'Confirmé',
      icon: '✓',
      iconComponent: <FiCheck className="text-green-600" size={16} />
    },
    delivered: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      label: 'Livré',
      icon: '🚚',
      iconComponent: <FiTruck className="text-purple-600" size={16} />
    },
    invoiced: {
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      label: 'Facturé',
      icon: '🧾',
      iconComponent: <FiFileText className="text-indigo-600" size={16} />
    },
    canceled: {
      color: 'bg-red-100 text-red-800 border-red-200',
      label: 'Annulé',
      icon: '✗',
      iconComponent: <FiX className="text-red-600" size={16} />
    }
  };
  
  const currentStatus = statusConfig[status] || statusConfig.draft;
  
  // Configuration par type de document
  const documentConfig = {
    commande: {
      titlePrefix: 'Commande Client',
      icon: <FiShoppingCart className="text-blue-600" size={24} />,
      color: 'text-blue-600'
    },
    devis: {
      titlePrefix: 'Devis',
      icon: <FiFileText className="text-green-600" size={24} />,
      color: 'text-green-600'
    },
    facture: {
      titlePrefix: 'Facture',
      icon: <FiFileText className="text-purple-600" size={24} />,
      color: 'text-purple-600'
    },
    bon_livraison: {
      titlePrefix: 'Bon de Livraison',
      icon: <FiTruck className="text-orange-600" size={24} />,
      color: 'text-orange-600'
    }
  };
  
  const currentDocConfig = documentConfig[documentType] || documentConfig.commande;
  
  // Configuration des boutons selon le mode
  const getActionButtons = () => {
    if (mode === 'view') {
      return (
        <>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-blue-200"
            >
              <FiEdit size={14} />
              <span>Éditer</span>
            </button>
          )}
          
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-green-200"
            >
              <FiCheck size={14} />
              <span>Confirmer</span>
            </button>
          )}
          
          {onDeliver && (
            <button
              onClick={onDeliver}
              className="px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-purple-200"
            >
              <FiTruck size={14} />
              <span>Livrer</span>
            </button>
          )}
          
          {onInvoice && (
            <button
              onClick={onInvoice}
              className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 rounded-lg hover:from-indigo-100 hover:to-indigo-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-indigo-200"
            >
              <FiFileText size={14} />
              <span>Facturer</span>
            </button>
          )}
          
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-300"
            >
              <FiCopy size={14} />
              <span>Dupliquer</span>
            </button>
          )}
          
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-gray-300"
            >
              <FiPrinter size={14} />
              <span>Imprimer</span>
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-red-200"
            >
              <span>Supprimer</span>
            </button>
          )}
        </>
      );
    } else if (mode === 'edit' || mode === 'create') {
      return (
        <>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-red-200"
            >
              <FiX size={14} />
              <span>Annuler</span>
            </button>
          )}
          
          {onSave && (
            <button
              onClick={onSave}
              className="px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-green-200"
            >
              <FiSave size={14} />
              <span>{mode === 'create' ? 'Créer' : 'Enregistrer'}</span>
            </button>
          )}
          
          {onValidate && mode === 'edit' && (
            <button
              onClick={onValidate}
              className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-blue-200"
            >
              <FiCheck size={14} />
              <span>Valider</span>
            </button>
          )}
        </>
      );
    }
    return null;
  };
  
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
          
          {/* En-tête du document */}
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
                    {currentDocConfig.icon}
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{title || `${currentDocConfig.titlePrefix} - ${reference}`}</h1>
                      {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {reference && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono font-semibold border border-gray-300">
                            {reference}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${currentStatus.color}`}>
                          <span className="mr-1">{currentStatus.icon}</span>
                          {currentStatus.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          <FiCalendar className="inline mr-1" size={12} />
                          {date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-2">
                  {getActionButtons()}
                  
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
          
          {/* Section en-tête du document (informations client) */}
          {showHeaderSection && (
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Client */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Client
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center gap-2">
                    <FiUser className="text-gray-400" size={14} />
                    <span>{headerData.client || '-'}</span>
                  </div>
                </div>
                
                {/* Commercial */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Commercial
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center gap-2">
                    <FiUser className="text-gray-400" size={14} />
                    <span>{headerData.commercial || '-'}</span>
                  </div>
                </div>
                
                {/* Date commande */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Date commande
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center gap-2">
                    <FiCalendar className="text-gray-400" size={14} />
                    <span>{headerData.dateCommande || '-'}</span>
                  </div>
                </div>
                
                {/* Date livraison */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Date livraison
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center gap-2">
                    <FiCalendar className="text-gray-400" size={14} />
                    <span>{headerData.dateLivraison || '-'}</span>
                  </div>
                </div>
                
                {/* Statut */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Statut
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.statut || '-'}
                  </div>
                </div>
                
                {/* Mode de paiement */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Mode de paiement
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.modePaiement || '-'}
                  </div>
                </div>
                
                {/* Référence client */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Référence client
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    {headerData.referenceClient || '-'}
                  </div>
                </div>
                
                {/* Conditions */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Conditions
                  </label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 min-h-[60px]">
                    {headerData.conditions || '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Informations client détaillées */}
          {showClientSection && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Adresse de livraison */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiTruck className="text-gray-400" size={16} />
                    <h4 className="font-medium text-gray-700">Adresse de livraison</h4>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {headerData.adresseLivraison || 'Aucune adresse spécifiée'}
                    </p>
                  </div>
                </div>
                
                {/* Adresse de facturation */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiFileText className="text-gray-400" size={16} />
                    <h4 className="font-medium text-gray-700">Adresse de facturation</h4>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {headerData.adresseFacturation || 'Même adresse que la livraison'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Lignes du document */}
          {showLinesSection && (
            <div className="p-6 border-b border-gray-200">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Lignes du document
                </h3>
                <div className="text-sm text-gray-600">
                  {documentLines.length} article(s)
                </div>
              </div>
              
              {/* Tableau des lignes */}
              {children ? children : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Article
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Quantité
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Prix unitaire
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Remise
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total HT
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentLines.length > 0 ? (
                        documentLines.map((line, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm border-r border-gray-200">
                              <div className="flex items-center gap-2">
                                <FiPackage className="text-gray-400" size={14} />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {line.article || '-'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {line.code || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200">
                              {line.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200 font-medium">
                              {line.quantite || 0}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200">
                              {line.prixUnitaire ? formatAmount(line.prixUnitaire) : '0 CFA'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200">
                              {line.remise ? `${line.remise}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {line.totalHT ? formatAmount(line.totalHT) : '0 CFA'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                            Aucune ligne de document
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Section Totaux */}
          {showTotalsSection && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-end">
                <div className="w-full max-w-md">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total HT:</span>
                        <span className="font-medium">{formatAmount(totals.totalHT)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Taxes:</span>
                        <span className="font-medium">{formatAmount(totals.totalTaxe)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total TTC:</span>
                          <span className="text-xl font-bold text-blue-600">{formatAmount(totals.totalTTC)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Section Informations supplémentaires */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Notes et informations
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notes */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Notes internes</h4>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {notes ? (
                    <p className="text-gray-700 whitespace-pre-line">{notes}</p>
                  ) : (
                    <p className="text-gray-400 italic">Aucune note</p>
                  )}
                </div>
              </div>
              
              {/* Informations supplémentaires */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Informations supplémentaires</h4>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {additionalInfo ? (
                    <p className="text-gray-700 whitespace-pre-line">{additionalInfo}</p>
                  ) : (
                    <p className="text-gray-400 italic">Aucune information supplémentaire</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


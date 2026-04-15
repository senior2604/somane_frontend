// src/features/vente/components/VenteFormContainer.jsx
import React from 'react';
import { 
  FiSave, 
  FiX, 
  FiEdit, 
  FiPrinter, 
  FiDownload,
  FiArrowLeft,
  FiFileText,
  FiCopy,
  FiEye,
  FiCheck,
  FiTrash2
} from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
// Supprimez ces imports incorrects :
// import ... from '../../../services/apiClient';
// import ... from '../../components/VenteFormContainer';

export default function VenteFormContainer({
  // Configuration du document
  reference = "",
  title = "",
  subtitle = "",
  status = "draft", // draft | validated | posted | confirmed | canceled
  date = new Date().toLocaleDateString('fr-FR'),
  module = "Vente", // "Vente" ou "Achat"
  
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
  onPrint = null,
  onExport = null,
  onDuplicate = null,
  onDelete = null,
  
  // Données de l'en-tête spécifiques à Vente/Achat
  headerData = {},
  
  // Personnalisation
  showHeaderSection = true,
  showActions = true,
  customHeaderFields = null,
  customMainSection = null,
  
  // Sections supplémentaires
  children,
  additionalSections = [],
  
  // Spécifique Vente/Achat
  showClientSection = true,
  showProductSection = true,
  showAmountSection = true,
  showDeliverySection = true,
  showPaymentSection = true,
}) {
  
  // Configuration des statuts spécifiques à Vente/Achat
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
    confirmed: {
      color: 'bg-green-100 text-green-800 border-green-200',
      label: 'Confirmé',
      icon: '✓'
    },
    posted: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      label: 'Comptabilisé',
      icon: '📊'
    },
    canceled: {
      color: 'bg-red-100 text-red-800 border-red-200',
      label: 'Annulé',
      icon: '✗'
    }
  };
  
  const currentStatus = statusConfig[status] || statusConfig.draft;
  
  // Formatage des montants
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0) + ' CFA';
  };
  
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
              <FiTrash2 size={14} />
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
          
          {onConfirm && mode === 'edit' && (
            <button
              onClick={onConfirm}
              className="px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 flex items-center gap-2 text-sm font-medium border border-purple-200"
            >
              <FiCheck size={14} />
              <span>Confirmer</span>
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
                    <FiFileText className={module === "Vente" ? "text-blue-600" : "text-green-600"} size={24} />
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                      {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {reference && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono font-semibold border border-gray-300">
                            {reference}
                          </span>
                        )}
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
          
          {/* Section en-tête personnalisée */}
          {showHeaderSection && (
            <div className="p-6 border-b border-gray-200">
              {customHeaderFields ? (
                customHeaderFields
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Champs génériques - à adapter selon le formulaire */}
                  {headerData.client && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Client
                      </label>
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        {headerData.client}
                      </div>
                    </div>
                  )}
                  
                  {headerData.supplier && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Fournisseur
                      </label>
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        {headerData.supplier}
                      </div>
                    </div>
                  )}
                  
                  {headerData.date && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Date
                      </label>
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        {headerData.date}
                      </div>
                    </div>
                  )}
                  
                  {/* Ajoutez d'autres champs selon vos besoins */}
                </div>
              )}
            </div>
          )}
          
          {/* Section principale personnalisée */}
          {customMainSection ? (
            <div className="p-6 border-b border-gray-200">
              {customMainSection}
            </div>
          ) : (
            <>
              {/* Section Client/Fournisseur */}
              {showClientSection && headerData.client && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {module === "Vente" ? "Informations Client" : "Informations Fournisseur"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        {module === "Vente" ? "Nom Client" : "Nom Fournisseur"}
                      </label>
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        {headerData.client}
                      </div>
                    </div>
                    {headerData.contact && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                          Contact
                        </label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          {headerData.contact}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Section Produits */}
              {showProductSection && children && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {module === "Vente" ? "Produits Commandés" : "Articles Achetés"}
                  </h3>
                  {children}
                </div>
              )}
              
              {/* Section Montants */}
              {showAmountSection && headerData.amounts && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Montants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {headerData.amounts.map((amount, index) => (
                      <div key={index}>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                          {amount.label}
                        </label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 font-medium">
                          {formatAmount(amount.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Section Livraison */}
              {showDeliverySection && headerData.delivery && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Livraison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(headerData.delivery).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                          {key}
                        </label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Section Paiement */}
              {showPaymentSection && headerData.payment && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Paiement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(headerData.payment).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                          {key}
                        </label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Sections supplémentaires */}
          {additionalSections.map((section, index) => (
            <div key={index} className="p-6 border-b border-gray-200 last:border-b-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h3>
              {section.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
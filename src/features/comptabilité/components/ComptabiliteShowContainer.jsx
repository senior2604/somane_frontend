// features/comptabilité/components/ComptabiliteShowContainer.jsx
import React from 'react';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiTrash2, 
  FiPrinter, 
  FiDownload,
  FiCopy,
  FiRefreshCw
} from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';

export default function ComptabiliteShowContainer({
  // Configuration
  title = "Détails",
  subtitle = "",
  moduleType = 'journaux',
  
  // Navigation
  onBack = null,
  showBackButton = true,
  
  // États
  loading = false,
  error = null,
  
  // Actions principales
  onEdit = null,
  onDelete = null,
  onDuplicate = null,
  onRefresh = null,
  onPrint = null,
  onExport = null,
  
  // Données
  data = null,
  
  // Sections
  sections = [], // Array de sections { title: string, fields: array }
  
  // Actions supplémentaires
  additionalActions = [],
  
  // Personnalisation
  showHeader = true,
  showActions = true,
}) {
  
  // Configuration par module
  const moduleConfigs = {
    journaux: {
      title: 'Détails du journal',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce journal ?',
    },
    pieces: {
      title: 'Détails de la pièce',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette pièce ?',
    },
    comptes: {
      title: 'Détails du compte',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
    }
  };
  
  const config = moduleConfigs[moduleType] || moduleConfigs.journaux;
  const finalTitle = title || config.title;
  
  const handleDelete = () => {
    if (window.confirm(config.deleteConfirm)) {
      onDelete && onDelete();
    }
  };
  
  const renderValue = (value, type) => {
    if (value === undefined || value === null) return '-';
    
    switch(type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(value);
      case 'status':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'Actif' : 'Inactif'}
          </span>
        );
      case 'boolean':
        return value ? 'Oui' : 'Non';
      default:
        return value;
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 mt-2 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-red-100 rounded">
                <FiTrash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">{error}</p>
              </div>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FiRefreshCw size={14} />
                <span>Réessayer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* En-tête */}
      {showHeader && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
                  title="Retour"
                >
                  <FiArrowLeft size={16} />
                </button>
              )}
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {finalTitle}
                </h1>
                {subtitle && (
                  <p className="text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            
            {/* Actions dans l'en-tête */}
            {showActions && (
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
                    title="Actualiser"
                  >
                    <FiRefreshCw size={16} />
                  </button>
                )}
                
                {onDuplicate && (
                  <button
                    onClick={onDuplicate}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
                    title="Dupliquer"
                  >
                    <FiCopy size={16} />
                  </button>
                )}
                
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="p-2 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all duration-300 flex items-center justify-center"
                    title="Modifier"
                  >
                    <FiEdit size={16} />
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all duration-300 flex items-center justify-center"
                    title="Supprimer"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
                
                {onPrint && (
                  <button
                    onClick={onPrint}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                  >
                    <FiPrinter size={14} />
                    <span>Imprimer</span>
                  </button>
                )}
                
                {onExport && (
                  <div className="relative group">
                    <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-2">
                      <FiDownload size={14} />
                      <span>Exporter</span>
                    </button>
                    
                    {/* Dropdown d'export */}
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="p-2">
                        <div className="space-y-1">
                          <button
                            onClick={() => onExport('pdf')}
                            className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <FaFilePdf size={12} className="text-red-500" />
                            <span>Format PDF</span>
                          </button>
                          <button
                            onClick={() => onExport('excel')}
                            className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <FaFileExcel size={12} className="text-green-500" />
                            <span>Format Excel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions supplémentaires */}
                {additionalActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                      action.variant === 'primary' 
                        ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {action.icon && <action.icon size={14} />}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Badge d'état si disponible dans les données */}
          {data?.active !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                data.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {data.active ? 'Actif' : 'Inactif'}
              </span>
              
              {data?.created_at && (
                <span className="text-xs text-gray-500">
                  Créé le {new Date(data.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Sections de détails */}
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {section.title && (
              <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
              </div>
            )}
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {field.label}
                    </label>
                    <div className="text-sm text-gray-900 font-medium">
                      {field.render 
                        ? field.render(data)
                        : renderValue(data?.[field.key], field.type)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* Section pour le contenu personnalisé */}
        {children && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
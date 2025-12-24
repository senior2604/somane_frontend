import React, { useState, useEffect, useRef } from 'react';
import { FiType, FiBriefcase, FiCreditCard, FiDatabase, FiChevronDown, FiSearch, FiCheck, FiAlertCircle } from "react-icons/fi";

export default function JournalForm({ 
  initialData = {},
  onSubmit,
  loading = false,
  error = null,
  onCancel,
  companies = [],
  journalTypes = [],
  comptes = [],
  banques = []
}) {
  const [formData, setFormData] = useState({
    code: initialData.code || '',
    name: initialData.name || '',
    type: initialData.type?.id || initialData.type || '',
    company: initialData.company?.id || initialData.company || '',
    default_account: initialData.default_account?.id || initialData.default_account || '',
    bank_account: initialData.bank_account?.id || initialData.bank_account || '',
    note: initialData.note || '',
    active: initialData.active !== false
  });

  const [searchCompany, setSearchCompany] = useState('');
  const [searchType, setSearchType] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = { ...formData };
    
    // Si entreprise manuelle
    if (!submitData.company && manualCompany.trim()) {
      submitData.company_name = manualCompany.trim();
    }
    
    onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Informations de Base */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de Base</h3>
        
        <div className="space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code du Journal *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Ex: VEN, ACH, BAN, CAI..."
              maxLength={8}
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du Journal *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Ex: Journal des ventes..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de Journal *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Sélectionnez un type...</option>
              {journalTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Notes additionnelles..."
            />
          </div>
        </div>
      </div>

      {/* Entreprise */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Entreprise</h3>
        
        {companies.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entreprise
            </label>
            <select
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Toutes les entreprises</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.raison_sociale || company.nom}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={manualCompany}
              onChange={(e) => setManualCompany(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Saisissez le nom de l'entreprise..."
            />
          </div>
        )}
      </div>

      {/* Configuration des Comptes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration des Comptes</h3>
        
        <div className="space-y-4">
          {/* Compte par défaut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte par défaut
            </label>
            <select
              value={formData.default_account}
              onChange={(e) => handleChange('default_account', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Sélectionnez un compte...</option>
              {comptes.map(compte => (
                <option key={compte.id} value={compte.id}>
                  {compte.code} - {compte.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compte bancaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte bancaire
            </label>
            <select
              value={formData.bank_account}
              onChange={(e) => handleChange('bank_account', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Sélectionnez un compte bancaire...</option>
              {banques.map(banque => (
                <option key={banque.id} value={banque.id}>
                  {banque.numero_compte ? `${banque.banque?.nom} - ${banque.numero_compte}` : banque.banque?.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statut */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut</h3>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => handleChange('active', e.target.checked)}
            className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Journal actif
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Un journal inactif ne pourra pas être utilisé pour les écritures comptables
        </p>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sauvegarde...
            </>
          ) : (
            <>
              <FiCheck />
              {initialData.id ? 'Mettre à jour' : 'Créer le journal'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
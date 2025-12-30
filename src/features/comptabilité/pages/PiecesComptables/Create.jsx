import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { piecesService } from "../../services";
import ComptabiliteFormContainer from '../../components/ComptabiliteFormContainer';

export default function Create() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    journal_id: '',
    date: new Date().toISOString().split('T')[0],
    label: '',
    reference: '',
    partner_id: '',
    lines: [
      { account_id: '', debit: '', credit: '', label: '', partner_id: '' }
    ]
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setDataLoading(true);
    try {
      const [journalsRes, accountsRes] = await Promise.all([
        piecesService.getJournals(),
        piecesService.getAccounts()
      ]);
      
      setJournals(journalsRes || []);
      setAccounts(accountsRes || []);
      
      try {
        if (piecesService.getPartners) {
          const partnersRes = await piecesService.getPartners();
          setPartners(partnersRes || []);
        }
      } catch (partnerError) {
        console.warn('Partners non disponibles:', partnerError);
        setPartners([]);
      }
      
    } catch (err) {
      console.error('Erreur chargement options:', err);
      setError('Erreur lors du chargement des données: ' + (err.message || 'Vérifiez votre connexion'));
    } finally {
      setDataLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    setFormData(prev => ({ ...prev, lines: newLines }));
    setError(null);
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: '', debit: '', credit: '', label: '', partner_id: '' }]
    }));
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Une pièce doit avoir au moins une ligne');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const totals = formData.lines.reduce((acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 });
    
    return {
      ...totals,
      balanced: Math.abs(totals.debit - totals.credit) < 0.01
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.journal_id) {
      setError('Le journal est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.date) {
      setError('La date est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.label?.trim()) {
      setError('Le libellé est obligatoire');
      setLoading(false);
      return;
    }

    const hasEmptyAccounts = formData.lines.some(line => !line.account_id);
    if (hasEmptyAccounts) {
      setError('Toutes les lignes doivent avoir un compte sélectionné');
      setLoading(false);
      return;
    }

    const totals = calculateTotals();
    if (!totals.balanced) {
      setError(`La pièce n'est pas équilibrée ! Débit: ${totals.debit.toFixed(2)} €, Crédit: ${totals.credit.toFixed(2)} €`);
      setLoading(false);
      return;
    }

    try {
      if (!piecesService.formatPieceForApi) {
        throw new Error('Erreur de configuration: formatPieceForApi non disponible');
      }
      
      if (!piecesService.create) {
        throw new Error('Erreur de configuration: create non disponible');
      }
      
      const formattedData = piecesService.formatPieceForApi(formData);
      const result = await piecesService.create(formattedData);
      
      setSuccess('Pièce comptable créée avec succès !');
      
      setTimeout(() => {
        navigate('/comptabilite/pieces');
      }, 1500);
      
    } catch (err) {
      console.error('Erreur création:', err);
      
      let errorMessage = 'Erreur lors de la création de la pièce';
      if (err.status === 401) {
        errorMessage = 'Vous devez être connecté pour créer une pièce';
      } else if (err.status === 400) {
        errorMessage = 'Données invalides: ' + (err.message || 'Vérifiez les informations saisies');
      } else if (err.status === 404) {
        errorMessage = 'Endpoint non trouvé. Vérifiez la configuration de l\'API';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const indicators = [
    { label: `${formData.lines.length} ligne${formData.lines.length > 1 ? 's' : ''}`, color: 'bg-gray-100 text-gray-700' }
  ];

  const hasWarning = partners.length === 0;
  const warningMessage = partners.length === 0 
    ? 'Les partenaires ne sont pas disponibles. Les champs partenaire seront ignorés.'
    : '';

  return (
    <ComptabiliteFormContainer
      moduleType="pieces"
      mode="create"
      title="Nouvelle écriture"
      subtitle="Création d'une nouvelle pièce comptable"
      onBack={() => navigate('/comptabilite/pieces')}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/comptabilite/pieces')}
      loading={loading || dataLoading}
      error={error}
      success={success}
      totals={totals}
      indicators={indicators}
      hasWarning={hasWarning}
      warningMessage={warningMessage}
      isSubmitting={loading}
    >
      <div className="space-y-3 max-w-4xl mx-auto">
        {/* Avertissement partenaires */}
        {hasWarning && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-2 border-blue-500 rounded-r p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-100 rounded">
                  <FiAlertCircle className="text-blue-600" size={10} />
                </div>
                <p className="text-blue-800 text-xs font-medium">
                  {warningMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Section Informations Générales */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">INFORMATIONS GÉNÉRALES</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Journal */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Journal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.journal_id}
                onChange={(e) => handleChange('journal_id', e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                disabled={journals.length === 0}
              >
                <option value="">Sélectionnez un journal</option>
                {journals.map(journal => (
                  <option key={journal.id} value={journal.id}>
                    {journal.code} - {journal.name}
                  </option>
                ))}
              </select>
              {journals.length === 0 && (
                <div className="text-xs text-gray-500 mt-1">Chargement...</div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
              />
            </div>

            {/* Libellé */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => handleChange('label', e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                placeholder="Libellé de la pièce comptable"
              />
            </div>

            {/* Référence */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Référence
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                placeholder="Numéro de facture, commande..."
              />
            </div>

            {/* Partenaire */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Partenaire
              </label>
              <select
                value={formData.partner_id}
                onChange={(e) => handleChange('partner_id', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-xs"
                disabled={partners.length === 0}
              >
                <option value="">Sélectionnez un partenaire</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
              {partners.length === 0 && (
                <div className="text-xs text-gray-500 mt-1">Non disponible</div>
              )}
            </div>
          </div>
        </div>

        {/* Section Lignes d'écriture */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-3 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">LIGNES D'ÉCRITURE</h3>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 text-xs font-medium flex items-center gap-1.5"
            >
              <FiPlus size={10} />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Compte *</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase text-green-600">Débit</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase text-red-600">Crédit</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Partenaire</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* Compte */}
                    <td className="p-2">
                      <select
                        value={line.account_id}
                        onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs bg-white"
                        disabled={accounts.length === 0}
                      >
                        <option value="">Sélectionnez un compte</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                      {accounts.length === 0 && (
                        <div className="text-xs text-gray-500 mt-1">Chargement...</div>
                      )}
                    </td>
                    
                    {/* Débit */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs text-green-700"
                        placeholder="0,00"
                      />
                    </td>
                    
                    {/* Crédit */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs text-red-700"
                        placeholder="0,00"
                      />
                    </td>
                    
                    {/* Libellé */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => handleLineChange(index, 'label', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs"
                        placeholder="Libellé de la ligne"
                      />
                    </td>
                    
                    {/* Partenaire */}
                    <td className="p-2">
                      <select
                        value={line.partner_id}
                        onChange={(e) => handleLineChange(index, 'partner_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-xs bg-white"
                        disabled={partners.length === 0}
                      >
                        <option value="">Sélectionnez</option>
                        {partners.map(partner => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={formData.lines.length <= 1}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Supprimer cette ligne"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            * Tous les comptes doivent être sélectionnés. Remplissez soit le débit, soit le crédit.
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded p-2">
          <div className="flex items-center gap-1.5">
            <FiAlertCircle className="text-amber-600" size={10} />
            <p className="text-amber-800 text-xs">
              <span className="font-medium">Instructions :</span> La pièce doit être équilibrée (Total Débit = Total Crédit)
            </p>
          </div>
        </div>
      </div>
    </ComptabiliteFormContainer>
  );
}
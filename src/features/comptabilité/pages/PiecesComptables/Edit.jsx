import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiPlus, FiTrash2, FiDollarSign,
  FiCalendar, FiType, FiBriefcase, FiFileText, FiCheck
} from 'react-icons/fi';
import { piecesService } from "../../services";

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    journal_id: '',
    date: '',
    label: '',
    reference: '',
    partner_id: '',
    lines: []
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les données en parallèle
      const [pieceData, journalsRes, accountsRes, partnersRes] = await Promise.all([
        piecesService.getById(id),
        piecesService.getJournals(),
        piecesService.getAccounts(),
        piecesService.getPartners()
      ]);
      
      // Mettre à jour le formulaire avec les données de la pièce
      setFormData({
        journal_id: pieceData.journal?.id || '',
        date: pieceData.date || '',
        label: pieceData.label || '',
        reference: pieceData.reference || '',
        partner_id: pieceData.partner?.id || '',
        lines: pieceData.lines?.map(line => ({
          id: line.id,
          account_id: line.account?.id || '',
          debit: line.debit || '',
          credit: line.credit || '',
          label: line.label || '',
          partner_id: line.partner?.id || ''
        })) || []
      });
      
      setJournals(journalsRes || []);
      setAccounts(accountsRes || []);
      setPartners(partnersRes || []);
      
    } catch (err) {
      console.error('Erreur chargement données:', err);
      if (err.status === 404) {
        setError('Pièce comptable non trouvée');
      } else {
        setError(`Erreur de chargement: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Si on met un débit, on efface le crédit et vice-versa
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    setFormData(prev => ({ ...prev, lines: newLines }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    // Validation
    if (!formData.journal_id) {
      setError('Le journal est obligatoire');
      setSubmitLoading(false);
      return;
    }

    if (!formData.date) {
      setError('La date est obligatoire');
      setSubmitLoading(false);
      return;
    }

    if (!formData.label?.trim()) {
      setError('Le libellé est obligatoire');
      setSubmitLoading(false);
      return;
    }

    const totals = calculateTotals();
    if (!totals.balanced) {
      setError(`La pièce n'est pas équilibrée ! Débit: ${totals.debit.toFixed(2)} €, Crédit: ${totals.credit.toFixed(2)} €`);
      setSubmitLoading(false);
      return;
    }

    try {
      const formattedData = piecesService.formatPieceForApi(formData);
      await piecesService.update(id, formattedData);
      navigate(`/comptabilite/pieces/${id}`);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      setError(err.message || 'Erreur lors de la mise à jour de la pièce');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la pièce...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800 rounded-lg hover:from-gray-300 hover:to-gray-200 font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate('/comptabilite/pieces')}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 font-medium"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* En-tête */}
        <div className="mb-6">
          <Link
            to={`/comptabilite/pieces/${id}`}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-3 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            <FiArrowLeft size={14} />
            Retour à la pièce
          </Link>
          
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Modifier la pièce #{id}
              </h1>
              <p className="text-gray-600 mt-1 text-sm">Modification d'une écriture existante</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded text-sm font-medium ${totals.balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {totals.balanced ? 'Équilibré' : 'Non équilibré'}
              </div>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-2 border-red-500 rounded-r">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-100 rounded">
                <FiTrash2 className="text-red-600" size={12} />
              </div>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Totaux */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100/30 rounded-lg border border-green-200 p-3">
            <div className="text-sm text-gray-600 mb-1">Total Débit</div>
            <div className="text-xl font-bold text-green-700">
              {totals.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100/30 rounded-lg border border-red-200 p-3">
            <div className="text-sm text-gray-600 mb-1">Total Crédit</div>
            <div className="text-xl font-bold text-red-700">
              {totals.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
        </div>

        {/* Formulaire (identique à Create.jsx mais avec données pré-remplies) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 md:p-6">
            {/* En-tête de la pièce */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journal *
                </label>
                <select
                  value={formData.journal_id}
                  onChange={(e) => handleChange('journal_id', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Sélectionnez un journal</option>
                  {journals.map(journal => (
                    <option key={journal.id} value={journal.id}>
                      {journal.code} - {journal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Libellé *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Libellé de la pièce comptable"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleChange('reference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Numéro de facture, commande..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partenaire
                </label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => handleChange('partner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Sélectionnez un partenaire</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lignes d'écriture */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Lignes d'écriture</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded hover:from-blue-700 hover:to-blue-600 text-sm font-medium flex items-center gap-1.5"
                >
                  <FiPlus size={12} />
                  Ajouter une ligne
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase text-green-600">Débit</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase text-red-600">Crédit</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Partenaire</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.lines.map((line, index) => (
                      <tr key={line.id || index} className="hover:bg-gray-50">
                        <td className="p-2">
                          <select
                            value={line.account_id}
                            onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                          >
                            <option value="">Sélectionnez un compte</option>
                            {accounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit}
                            onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm text-green-700"
                            placeholder="0,00"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit}
                            onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm text-red-700"
                            placeholder="0,00"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.label}
                            onChange={(e) => handleLineChange(index, 'label', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                            placeholder="Libellé de la ligne"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={line.partner_id}
                            onChange={(e) => handleLineChange(index, 'partner_id', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                          >
                            <option value="">Sélectionnez</option>
                            {partners.map(partner => (
                              <option key={partner.id} value={partner.id}>
                                {partner.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={formData.lines.length <= 1}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer cette ligne"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Link
                to={`/comptabilite/pieces/${id}`}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitLoading || !totals.balanced}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 font-medium text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={14} />
                    <span>Mettre à jour</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
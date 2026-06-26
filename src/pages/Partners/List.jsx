import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiEdit2, FiEye, FiFilter, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiUserPlus } from 'react-icons/fi';
import { apiClient } from '../../services/apiClient';
import { useEntity } from '../../context/EntityContext';
import { PARTNER_TYPES, getPartnerName, parseResponse } from './PartnerShared';

export default function PartnersList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchPartners = useCallback(async () => {
    if (!activeEntity?.id) {
      setPartners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/partenaires/');
      const data = parseResponse(response);
      setPartners(data.filter(p => !p.company || p.company === activeEntity.id || p.company?.id === activeEntity.id));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Impossible de charger les partenaires');
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const filteredPartners = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return partners.filter(p => {
      const text = [
        p.nom, p.raison_sociale, p.name, p.email, p.telephone,
        p.numero_fiscal, p.registre_commerce,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchSearch = !needle || text.includes(needle);
      const matchType = !filterType || p.type_partenaire === filterType;
      const matchStatus = !filterStatus || String(Boolean(p.statut)) === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [partners, search, filterType, filterStatus]);

  const deletePartner = async (partner) => {
    if (!window.confirm(`Supprimer "${getPartnerName(partner)}" ?`)) return;
    try {
      await apiClient.delete(`/partenaires/${partner.id}/`);
      await fetchPartners();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Suppression impossible');
    }
  };

  const stats = {
    total: partners.length,
    actifs: partners.filter(p => p.statut).length,
    avecCompte: partners.filter(p => p.user).length,
  };

  return (
    <div className="p-4">
      <div className="bg-white border border-gray-300">
        <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Partenaires</h1>
            <p className="text-xs text-gray-500">{stats.total} partenaire(s), {stats.actifs} actif(s), {stats.avecCompte} compte(s) utilisateur</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchPartners} className="h-8 px-3 border border-gray-300 text-xs hover:bg-gray-50 flex items-center gap-1">
              <FiRefreshCw size={13} /> Actualiser
            </button>
            <button onClick={() => navigate('create')} className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1">
              <FiPlus size={13} /> Nouveau partenaire
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-300 bg-gray-50 grid grid-cols-12 gap-2">
          <div className="col-span-6 relative">
            <FiSearch size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-7 pr-2 border border-gray-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
              placeholder="Rechercher nom, email, telephone, numero fiscal..."
            />
          </div>
          <div className="col-span-3 flex items-center gap-1">
            <FiFilter size={13} className="text-gray-400" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full h-8 border border-gray-300 text-xs">
              <option value="">Tous les types</option>
              {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full h-8 border border-gray-300 text-xs">
              <option value="">Tous les statuts</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
            <FiAlertCircle size={14} /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Partenaire</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Type</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Contact</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Localisation</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-left">Compte</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-center">Statut</th>
                <th className="border border-gray-300 px-2 py-1.5 text-xs text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="border border-gray-300 px-3 py-8 text-center text-sm text-gray-500">Chargement...</td></tr>
              ) : filteredPartners.length === 0 ? (
                <tr><td colSpan={7} className="border border-gray-300 px-3 py-8 text-center text-sm text-gray-500">Aucun partenaire trouve</td></tr>
              ) : filteredPartners.map(partner => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1.5">
                    <div className="text-xs font-medium text-gray-900">{getPartnerName(partner)}</div>
                    <div className="text-[11px] text-gray-500">ID: {partner.id}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs capitalize">{partner.type_partenaire || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{partner.email || '-'}</div>
                    <div className="text-gray-500">{partner.telephone || '-'}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    <div>{partner.ville_details?.nom || partner.ville_legacy || '-'}</div>
                    <div className="text-gray-500">{partner.pays_details?.nom || ''}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-xs">
                    {partner.user ? (
                      <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200">Compte cree</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200">A creer</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                    <span className={`px-2 py-1 ${partner.statut ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {partner.statut ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate(String(partner.id))} className="p-1 text-blue-600 hover:bg-blue-50" title="Afficher"><FiEye size={14} /></button>
                      <button onClick={() => navigate(String(partner.id))} className="p-1 text-purple-600 hover:bg-purple-50" title="Modifier"><FiEdit2 size={14} /></button>
                      {!partner.user && <button onClick={() => navigate(`${partner.id}?tab=user`)} className="p-1 text-green-600 hover:bg-green-50" title="Creer utilisateur"><FiUserPlus size={14} /></button>}
                      <button onClick={() => deletePartner(partner)} className="p-1 text-red-600 hover:bg-red-50" title="Supprimer"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-gray-300 bg-gray-50 text-xs text-gray-500">
          {filteredPartners.length} resultat(s)
        </div>
      </div>
    </div>
  );
}

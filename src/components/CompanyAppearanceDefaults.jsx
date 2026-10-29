import React, { useEffect, useState } from 'react';
import { useAppearancePreferences } from '../context/AppearancePreferencesContext';

const CHOICES = {
  theme: [['light', 'Clair'], ['dark', 'Sombre'], ['system', 'Selon le système']],
  font: [['system', 'Système'], ['segoe', 'Segoe UI'], ['arial', 'Arial'], ['verdana', 'Verdana'], ['tahoma', 'Tahoma'], ['calibri', 'Calibri'], ['georgia', 'Georgia'], ['cambria', 'Cambria'], ['times', 'Times New Roman'], ['consolas', 'Consolas'], ['mono', 'Monospace système']],
  textSize: [['tiny', 'Très petite'], ['small', 'Petite'], ['standard', 'Normale'], ['medium', 'Moyenne'], ['large', 'Grande'], ['extra-large', 'Très grande']],
  density: [['compact', 'Compacte'], ['standard', 'Standard'], ['comfortable', 'Confortable']],
  contrast: [['system', 'Selon le système'], ['normal', 'Normal'], ['high', 'Renforcé']],
  tooltips: [['always', 'Au survol et au clavier'], ['focus', 'Au clavier uniquement'], ['off', 'Désactivées']],
};

export default function CompanyAppearanceDefaults() {
  const { companyDefaults, loadCompanyDefaults, saveCompanyDefaults } = useAppearancePreferences();
  const [draft, setDraft] = useState({ theme: 'system', font: 'system', textSize: 'standard', density: 'standard', contrast: 'system', tooltips: 'always' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCompanyDefaults(); }, [loadCompanyDefaults]);
  useEffect(() => {
    if (companyDefaults) setDraft((current) => ({ ...current, ...companyDefaults }));
  }, [companyDefaults]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveCompanyDefaults({
        theme: draft.theme,
        font: draft.font,
        textSize: draft.textSize,
        density: draft.density,
        contrast: draft.contrast,
        tooltips: draft.tooltips,
      });
      setMessage('Les valeurs par défaut de l’entreprise ont été enregistrées.');
    } catch (error) {
      setMessage(error.message || 'Impossible d’enregistrer les valeurs par défaut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="somane-preferences-panel" aria-labelledby="company-appearance-title">
      <header className="somane-preferences-panel__header">
        <div><h2 id="company-appearance-title">Valeurs par défaut de l’entreprise</h2><p>Ces choix servent de base aux comptes utilisateurs. Ils ne remplacent pas les préférences personnelles déjà enregistrées.</p></div>
      </header>
      <div className="somane-preferences-grid">
        {Object.entries(CHOICES).map(([key, options]) => (
          <label className="somane-preference-field" key={key}>
            <span className="somane-preference-field__label">{{ theme: 'Thème', font: 'Police générale', textSize: 'Taille du texte', density: 'Densité', contrast: 'Contraste', tooltips: 'Infobulles' }[key]}</span>
            <select className="somane-select" value={draft[key] || options[0][0]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}>
              {options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
        ))}
      </div>
      {message && <p className="somane-preferences-panel__notice" role="status">{message}</p>}
      <div className="somane-preferences-panel__footer"><button className="somane-btn somane-btn--primary" type="button" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les valeurs de l’entreprise'}</button></div>
    </section>
  );
}

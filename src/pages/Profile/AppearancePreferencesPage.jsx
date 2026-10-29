import React, { useEffect, useState } from 'react';
import AppearanceSettingsPanel from '../../components/AppearanceSettingsPanel';
import { useAppearancePreferences } from '../../context/AppearancePreferencesContext';

export default function AppearancePreferencesPage() {
  const { companyDefaults, loadCompanyDefaults, applyPreferences } = useAppearancePreferences();
  const [notice, setNotice] = useState('');

  useEffect(() => { loadCompanyDefaults(); }, [loadCompanyDefaults]);

  return (
    <main className="somane-appearance-page">
      <header className="somane-appearance-page__header">
        <div><p className="somane-appearance-page__eyebrow">Préférences personnelles</p><h1>Apparence</h1><p>Vos choix sont enregistrés pour votre compte et appliqués dans tous les modules.</p></div>
        {companyDefaults && <button type="button" className="somane-btn somane-btn--secondary" onClick={() => { applyPreferences(companyDefaults); setNotice('Les valeurs par défaut de l’entreprise sont appliquées. Vous pouvez encore les modifier.'); }}>Appliquer les valeurs de l’entreprise</button>}
      </header>
      {notice && <p className="somane-preferences-panel__notice" role="status">{notice}</p>}
      <AppearanceSettingsPanel />
    </main>
  );
}

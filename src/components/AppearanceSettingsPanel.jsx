import React, { useEffect, useState } from 'react';
import { FiRotateCcw, FiSliders } from 'react-icons/fi';
import { BRAND_PRESETS, useAppearancePreferences } from '../context/AppearancePreferencesContext';
import SomaneSelect from './SomaneSelect';
import { FormMessage, LoadingIndicator, OperationIndicator, Skeleton } from './FeedbackPrimitives';

const OPTIONS = {
  theme: [['light', 'Clair'], ['dark', 'Sombre'], ['system', 'Selon le système']],
  contrast: [['system', 'Selon le système'], ['normal', 'Normal'], ['high', 'Renforcé']],
  font: [
    ['system', 'Système'], ['arial', 'Arial'], ['segoe', 'Segoe UI'], ['tahoma', 'Tahoma'],
    ['verdana', 'Verdana'], ['trebuchet', 'Trebuchet MS'], ['calibri', 'Calibri'],
    ['candara', 'Candara'], ['lucida-sans', 'Lucida Sans'], ['georgia', 'Georgia'],
    ['cambria', 'Cambria'], ['times', 'Times New Roman'], ['garamond', 'Garamond'],
    ['palatino', 'Palatino Linotype'], ['consolas', 'Consolas'], ['courier', 'Courier New'],
    ['mono', 'Monospace système'],
  ],
  textSize: [['tiny', 'Très petite'], ['small', 'Petite'], ['standard', 'Normale'], ['medium', 'Moyenne'], ['large', 'Grande'], ['extra-large', 'Très grande']],
  fontWeight: [['light', 'Légère'], ['standard', 'Standard'], ['strong', 'Renforcée']],
  lineHeight: [['compact', 'Compacte'], ['normal', 'Normale'], ['relaxed', 'Aérée']],
  textWidth: [['narrow', 'Étroite'], ['standard', 'Standard'], ['wide', 'Large']],
  density: [['compact', 'Compacte'], ['standard', 'Standard'], ['comfortable', 'Confortable']],
  tooltips: [['always', 'Au survol et au clavier'], ['focus', 'Au clavier uniquement'], ['off', 'Désactivées']],
  tooltipDelay: [[0, 'Immédiat'], [250, '250 ms'], [500, '500 ms'], [800, '800 ms']],
  tooltipPlacement: [['auto', 'Automatique'], ['top', 'Haut'], ['bottom', 'Bas'], ['left', 'Gauche'], ['right', 'Droite']],
  notificationPosition: [['right', 'À droite'], ['left', 'À gauche']],
  notificationAnimation: [['slide', 'Glissement depuis le bord'], ['fade', 'Fondu'], ['none', 'Aucune']],
  notificationDuration: [[3000, '3 secondes'], [4500, '4,5 secondes'], [8000, '8 secondes'], [0, 'Jusqu’à fermeture']],
};

const RoleScale = ({ label, value, onChange, min = 50, max = 100 }) => (
  <label className="somane-preference-field">
    <span className="somane-preference-field__label">{label}</span>
    <span className="somane-font-scale">
      <input type="range" min={min} max={max} step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={`${label} en pourcentage`} />
      <output>{value}%</output>
    </span>
  </label>
);

const COLOR_FIELDS = [
  ['primary', 'Principale'], ['secondary', 'Secondaire'], ['accent', 'Accent'],
  ['success', 'Succès'], ['warning', 'Avertissement'], ['error', 'Erreur'], ['info', 'Information'],
  ['page', 'Fond principal'], ['surface', 'Fond des surfaces'], ['subtle', 'Fond secondaire'],
  ['text', 'Texte principal'], ['textSecondary', 'Texte secondaire'], ['border', 'Bordures'],
];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const PreferenceSelect = ({ label, value, options, onChange }) => (
  <label className="somane-preference-field">
    <span className="somane-preference-field__label">{label}</span>
    <SomaneSelect className="somane-select" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </SomaneSelect>
  </label>
);

function ColorPreference({ name, label, value, onChange }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <label className="somane-color-setting">
      <span>{label}</span>
      <span className="somane-color-setting__control">
        <input
          type="color"
          value={HEX_COLOR.test(value || '') ? value : '#000000'}
          onChange={(event) => onChange(name, event.target.value)}
          aria-label={`Couleur ${label}`}
        />
        <input
          className="somane-input somane-color-setting__hex"
          type="text"
          value={draft}
          maxLength={7}
          aria-label={`Code HEX ${label}`}
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setDraft(next);
            if (HEX_COLOR.test(next)) onChange(name, next);
          }}
          onBlur={() => { if (!HEX_COLOR.test(draft)) setDraft(value); }}
        />
      </span>
    </label>
  );
}

export default function AppearanceSettingsPanel() {
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const {
    preferences, colors, updatePreference, updateColor, applyBrand, resetPreferences,
  } = useAppearancePreferences();

  useEffect(() => {
    if (!demoRunning) return undefined;
    const timer = window.setInterval(() => {
      setDemoProgress((value) => Math.min(100, value + 5));
    }, 350);
    return () => window.clearInterval(timer);
  }, [demoRunning]);

  useEffect(() => {
    if (demoRunning && demoProgress >= 100) setDemoRunning(false);
  }, [demoProgress, demoRunning]);

  const startDemo = () => {
    setDemoProgress(0);
    setDemoRunning(true);
  };

  return (
    <section className="somane-appearance-panel" aria-labelledby="appearance-settings-title">
      <div className="somane-appearance-panel__header">
        <div className="somane-appearance-panel__title-wrap">
          <span className="somane-appearance-panel__icon"><FiSliders size={16} /></span>
          <div>
            <h2 id="appearance-settings-title" className="somane-appearance-panel__title">Apparence de l’application</h2>
            <p className="somane-appearance-panel__description">Vos préférences sont enregistrées sur votre compte et appliquées dans tous les modules.</p>
          </div>
        </div>
        <button type="button" className="somane-btn somane-btn--secondary somane-btn--sm" onClick={resetPreferences}>
          <FiRotateCcw size={13} /> Réinitialiser
        </button>
      </div>

      <div className="somane-appearance-section">
        <h3>Affichage</h3>
        <div className="somane-appearance-panel__grid">
          <PreferenceSelect label="Thème" value={preferences.theme} options={OPTIONS.theme} onChange={(value) => updatePreference('theme', value)} />
          <PreferenceSelect
            label="Thème de marque"
            value={preferences.brand}
            options={Object.entries(BRAND_PRESETS).map(([id, preset]) => [id, preset.label])}
            onChange={applyBrand}
          />
          <PreferenceSelect label="Contraste" value={preferences.contrast} options={OPTIONS.contrast} onChange={(value) => updatePreference('contrast', value)} />
          <PreferenceSelect label="Densité" value={preferences.density} options={OPTIONS.density} onChange={(value) => updatePreference('density', value)} />
          <PreferenceSelect label="Infobulles" value={preferences.tooltips} options={OPTIONS.tooltips} onChange={(value) => updatePreference('tooltips', value)} />
          <PreferenceSelect label="Délai des infobulles" value={preferences.tooltipDelay} options={OPTIONS.tooltipDelay} onChange={(value) => updatePreference('tooltipDelay', Number(value))} />
          <PreferenceSelect label="Position des infobulles" value={preferences.tooltipPlacement} options={OPTIONS.tooltipPlacement} onChange={(value) => updatePreference('tooltipPlacement', value)} />
          <PreferenceSelect label="Position des notifications" value={preferences.notificationPosition} options={OPTIONS.notificationPosition} onChange={(value) => updatePreference('notificationPosition', value)} />
          <PreferenceSelect label="Animation des notifications" value={preferences.notificationAnimation} options={OPTIONS.notificationAnimation} onChange={(value) => updatePreference('notificationAnimation', value)} />
          <PreferenceSelect label="Durée des notifications" value={preferences.notificationDuration} options={OPTIONS.notificationDuration} onChange={(value) => updatePreference('notificationDuration', Number(value))} />
          <label className="somane-preference-field">
            <span className="somane-preference-field__label">Échelle des espacements</span>
            <span className="somane-font-scale">
              <input type="range" min="70" max="140" step="5" value={preferences.spacingScale} onChange={(event) => updatePreference('spacingScale', Number(event.target.value))} aria-label="Échelle des espacements en pourcentage" />
              <output>{preferences.spacingScale}%</output>
            </span>
          </label>
          <label className="somane-preference-toggle">
            <input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => updatePreference('reduceMotion', event.target.checked)} />
            <span>Réduire les animations</span>
          </label>
        </div>
      </div>

      <div className="somane-appearance-section">
        <h3>Typographie</h3>
        <div className="somane-appearance-panel__grid">
          <PreferenceSelect label="Police générale" value={preferences.font} options={OPTIONS.font} onChange={(value) => updatePreference('font', value)} />
          <PreferenceSelect label="Police des titres" value={preferences.headingFont} options={OPTIONS.font} onChange={(value) => updatePreference('headingFont', value)} />
          <PreferenceSelect label="Police des données et nombres" value={preferences.dataFont} options={[['system', 'Police générale'], ...OPTIONS.font.filter(([id]) => id !== 'system')]} onChange={(value) => updatePreference('dataFont', value)} />
          <PreferenceSelect label="Taille de base" value={preferences.textSize} options={OPTIONS.textSize} onChange={(value) => updatePreference('textSize', value)} />
          <PreferenceSelect label="Graisses" value={preferences.fontWeight} options={OPTIONS.fontWeight} onChange={(value) => updatePreference('fontWeight', value)} />
          <PreferenceSelect label="Hauteur de ligne" value={preferences.lineHeight} options={OPTIONS.lineHeight} onChange={(value) => updatePreference('lineHeight', value)} />
          <PreferenceSelect label="Largeur de lecture" value={preferences.textWidth} options={OPTIONS.textWidth} onChange={(value) => updatePreference('textWidth', value)} />
          <RoleScale label="Titres" value={preferences.titleScale} onChange={(value) => updatePreference('titleScale', value)} />
          <RoleScale label="Libellés" value={preferences.labelScale} onChange={(value) => updatePreference('labelScale', value)} />
          <RoleScale label="Aides et descriptions" value={preferences.helpScale} onChange={(value) => updatePreference('helpScale', value)} />
          <RoleScale label="Tableaux" value={preferences.tableScale} onChange={(value) => updatePreference('tableScale', value)} />
          <RoleScale label="Menus" value={preferences.menuScale} onChange={(value) => updatePreference('menuScale', value)} />
          <RoleScale label="Boutons" value={preferences.buttonScale} onChange={(value) => updatePreference('buttonScale', value)} />
          <RoleScale label="Échelle générale" value={preferences.fontScale} min={50} max={100} onChange={(value) => updatePreference('fontScale', value)} />
        </div>
      </div>

      <div className="somane-appearance-section">
        <h3>Chargement et opérations longues</h3>
        <p className="somane-feedback-preview__description">Aperçu des indicateurs utilisés pendant le chargement des données et les traitements.</p>
        <div className="somane-feedback-preview">
          <div className="somane-feedback-preview__sample">
            <span className="somane-feedback-preview__label">Chargement simple</span>
            <LoadingIndicator label="Chargement des données…" />
          </div>
          <div className="somane-feedback-preview__sample">
            <span className="somane-feedback-preview__label">Squelette de contenu</span>
            <Skeleton variant="title" />
            <Skeleton variant="text" count={3} widths={['100%', '86%', '68%']} />
          </div>
          <div className="somane-feedback-preview__sample">
            <span className="somane-feedback-preview__label">Message lié à un champ</span>
            <div id="feedback-preview-field" className="somane-input" role="group" tabIndex={-1} aria-describedby="feedback-preview-field-message">
              Champ de démonstration
            </div>
            <FormMessage id="feedback-preview-field-message" fieldId="feedback-preview-field">
              Ce champ nécessite une vérification.
            </FormMessage>
          </div>
          <div className="somane-feedback-preview__operation">
            {demoRunning ? (
              <OperationIndicator
                title="Traitement simulé"
                description="Aucune donnée réelle n’est modifiée."
                progress={demoProgress}
                onCancel={() => setDemoRunning(false)}
              />
            ) : (
              <>
                <span className="somane-feedback-preview__label">Progression d’une opération longue</span>
                <button type="button" className="somane-btn somane-btn--secondary somane-btn--sm" onClick={startDemo}>
                  Lancer la démonstration
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="somane-appearance-section">
        <h3>Palette de couleurs</h3>
        <div className="somane-appearance-colors">
          {COLOR_FIELDS.map(([name, label]) => (
            <ColorPreference key={name} name={name} label={label} value={colors[name]} onChange={updateColor} />
          ))}
        </div>
      </div>

      <div className="somane-appearance-preview" aria-live="polite">
        <span>Aperçu</span>
        <button type="button" className="somane-btn somane-btn--primary somane-btn--sm">Action principale</button>
        <span className="somane-badge somane-badge--success">Succès</span>
        <span className="somane-badge somane-badge--warning">Avertissement</span>
        <span className="somane-appearance-preview__text">Texte secondaire · {preferences.fontScale}%</span>
      </div>
    </section>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { getActiveEntity } from '../services/entityUtils';

const STORAGE_KEY = 'somane:appearance:v1';
const COMPANY_DEFAULTS_KEY = 'ui.appearance.defaults';
const DEFAULT_COLORS = {
  primary: '#1E3A8A',
  secondary: '#475569',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  page: '#F8FAFC',
  surface: '#FFFFFF',
  subtle: '#F1F5F9',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

export const BRAND_PRESETS = {
  somane: { label: 'Somane', colors: { primary: DEFAULT_COLORS.primary, secondary: DEFAULT_COLORS.secondary, accent: DEFAULT_COLORS.accent } },
  ocean: { label: 'Océan', colors: { primary: '#075985', secondary: '#334155', accent: '#06B6D4' } },
  emerald: { label: 'Émeraude', colors: { primary: '#047857', secondary: '#36534A', accent: '#0F766E' } },
  violet: { label: 'Violet', colors: { primary: '#6D28D9', secondary: '#4C1D95', accent: '#A78BFA' } },
  custom: { label: 'Personnalisé', colors: null },
};

const DARK_COLORS = {
  ...DEFAULT_COLORS,
  page: '#0F172A', surface: '#1E293B', subtle: '#1E293B',
  text: '#F1F5F9', textSecondary: '#CBD5E1', border: '#475569',
};

const DEFAULT_PREFERENCES = {
  theme: 'light',
  brand: 'somane',
  font: 'system',
  headingFont: 'system',
  dataFont: 'system',
  textSize: 'standard',
  fontScale: 80,
  titleScale: 80,
  labelScale: 80,
  helpScale: 80,
  tableScale: 80,
  menuScale: 80,
  buttonScale: 80,
  fontWeight: 'standard',
  lineHeight: 'normal',
  textWidth: 'standard',
  density: 'standard',
  spacingScale: 100,
  contrast: 'system',
  reduceMotion: false,
  tooltips: 'always',
  tooltipDelay: 250,
  tooltipPlacement: 'auto',
  notificationPosition: 'right',
  notificationAnimation: 'slide',
  notificationDuration: 4500,
  colorOverrides: {},
};

const AppearancePreferencesContext = createContext(null);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const EMPTY_COLORS = {};
const userId = () => authService.getUser()?.id || 'anonymous';
const userStorageKey = () => `${STORAGE_KEY}:user:${userId()}`;
const THEME_SURFACE_COLORS = new Set(['page', 'surface', 'subtle', 'text', 'textSecondary', 'border']);
const AVAILABLE_FONTS = new Set([
  'system', 'arial', 'segoe', 'tahoma', 'verdana', 'trebuchet', 'calibri', 'candara',
  'lucida-sans', 'georgia', 'cambria', 'times', 'garamond', 'palatino', 'consolas', 'courier', 'mono',
]);

const readPreferences = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(userStorageKey()) || (userId() === 'anonymous' ? localStorage.getItem(STORAGE_KEY) : null) || '{}');
    const legacyPrimary = HEX_COLOR.test(parsed.accentColor || '') ? parsed.accentColor : null;
    // Older builds stored the entire light palette as `colors`, even when untouched.
    // Only the current explicit overrides and legacy custom primary are user choices.
    const colorOverrides = { ...(parsed.colorOverrides || {}) };
    if (legacyPrimary && !colorOverrides.primary && legacyPrimary.toUpperCase() !== DEFAULT_COLORS.primary) {
      colorOverrides.primary = legacyPrimary;
    }
    Object.keys(colorOverrides).forEach((key) => {
      if (!HEX_COLOR.test(colorOverrides[key] || '') || !(key in DEFAULT_COLORS)) delete colorOverrides[key];
    });
    const oldBrand = parsed.brand || (parsed.accent && BRAND_PRESETS[parsed.accent] ? parsed.accent : 'somane');
    ['font', 'headingFont', 'dataFont'].forEach((key) => {
      if (!AVAILABLE_FONTS.has(parsed[key])) parsed[key] = 'system';
    });
    if (!['tiny', 'small', 'standard', 'medium', 'large', 'extra-large'].includes(parsed.textSize)) parsed.textSize = DEFAULT_PREFERENCES.textSize;
    if (!['light', 'standard', 'strong'].includes(parsed.fontWeight)) parsed.fontWeight = DEFAULT_PREFERENCES.fontWeight;
    if (!['compact', 'normal', 'relaxed'].includes(parsed.lineHeight)) parsed.lineHeight = DEFAULT_PREFERENCES.lineHeight;
    if (!['narrow', 'standard', 'wide'].includes(parsed.textWidth)) parsed.textWidth = DEFAULT_PREFERENCES.textWidth;
    if (!['system', 'normal', 'high'].includes(parsed.contrast)) parsed.contrast = DEFAULT_PREFERENCES.contrast;
    const fontScale = Number(parsed.fontScale);
    parsed.fontScale = Number.isFinite(fontScale)
      ? Math.min(100, Math.max(50, fontScale))
      : DEFAULT_PREFERENCES.fontScale;
    ['titleScale', 'labelScale', 'helpScale', 'tableScale', 'menuScale', 'buttonScale'].forEach((key) => {
      const scale = Number(parsed[key]);
      parsed[key] = Number.isFinite(scale)
        ? Math.min(100, Math.max(50, scale))
        : DEFAULT_PREFERENCES[key];
    });
    if (![0, 250, 500, 800].includes(Number(parsed.tooltipDelay))) parsed.tooltipDelay = DEFAULT_PREFERENCES.tooltipDelay;
    if (!['auto', 'top', 'bottom', 'left', 'right'].includes(parsed.tooltipPlacement)) parsed.tooltipPlacement = DEFAULT_PREFERENCES.tooltipPlacement;
    if (!['left', 'right'].includes(parsed.notificationPosition)) parsed.notificationPosition = DEFAULT_PREFERENCES.notificationPosition;
    if (!['slide', 'fade', 'none'].includes(parsed.notificationAnimation)) parsed.notificationAnimation = DEFAULT_PREFERENCES.notificationAnimation;
    if (![0, 3000, 4500, 8000].includes(Number(parsed.notificationDuration))) parsed.notificationDuration = DEFAULT_PREFERENCES.notificationDuration;
    return { ...DEFAULT_PREFERENCES, ...parsed, brand: oldBrand, colorOverrides };
  } catch {
    return { ...DEFAULT_PREFERENCES, colorOverrides: {} };
  }
};

const getSystemTheme = () => (
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

const getSystemContrast = () => Boolean(
  window.matchMedia?.('(prefers-contrast: more)').matches
  || window.matchMedia?.('(forced-colors: active)').matches
);

const getSystemReducedMotion = () => Boolean(
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

const getApplicableColorOverrides = (overrides, theme) => Object.fromEntries(
  Object.entries(overrides).filter(([key, value]) => (
    theme !== 'dark'
    || !THEME_SURFACE_COLORS.has(key)
    || value.toUpperCase() !== DEFAULT_COLORS[key]
  )),
);

const hexToRgb = (hex) => {
  const value = HEX_COLOR.test(hex || '') ? hex.slice(1) : '1E3A8A';
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
};

const mixColor = (hex, target, amount) => hexToRgb(hex)
  .map((channel, index) => Math.round(channel * (1 - amount) + target[index] * amount));

const toHex = (rgb) => `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
const rgbString = (hex) => hexToRgb(hex).join(' ');
const contrastForeground = (hex) => {
  const luminance = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.179 ? '#172033' : '#FFFFFF';
};

const getColorTokens = (colors, theme, contrast) => {
  const primary = colors.primary;
  const primaryHover = toHex(mixColor(primary, [0, 0, 0], 0.14));
  const tintTarget = theme === 'dark' ? [15, 23, 42] : [255, 255, 255];
  const tintAmount = theme === 'dark' ? 0.78 : 0.88;
  const primaryLight = toHex(mixColor(primary, tintTarget, tintAmount));
  const primaryDark = toHex(mixColor(primary, [0, 0, 0], 0.3));
  const secondary = colors.secondary;
  const accent = colors.accent;
  const borderStrong = contrast === 'high'
    ? colors.text
    : toHex(mixColor(colors.border, hexToRgb(colors.text), 0.25));
  const border = contrast === 'high'
    ? toHex(mixColor(colors.border, hexToRgb(colors.text), 0.55))
    : colors.border;
  const secondaryText = contrast === 'high'
    ? toHex(mixColor(colors.textSecondary, hexToRgb(colors.text), 0.45))
    : colors.textSecondary;
  const tokens = {
    '--somane-primary': primary,
    '--somane-primary-rgb': rgbString(primary),
    '--somane-primary-hover': primaryHover,
    '--somane-primary-hover-rgb': rgbString(primaryHover),
    '--somane-primary-light': primaryLight,
    '--somane-primary-light-rgb': rgbString(primaryLight),
    '--somane-primary-dark': primaryDark,
    '--somane-primary-dark-rgb': rgbString(primaryDark),
    '--somane-primary-foreground': contrastForeground(primary),
    '--somane-secondary': secondary,
    '--somane-secondary-rgb': rgbString(secondary),
    '--somane-accent': accent,
    '--somane-accent-rgb': rgbString(accent),
    '--somane-accent-hover': toHex(mixColor(accent, [0, 0, 0], 0.14)),
    '--somane-accent-light': toHex(mixColor(accent, tintTarget, theme === 'dark' ? 0.78 : 0.86)),
    '--somane-success': colors.success,
    '--somane-success-rgb': rgbString(colors.success),
    '--somane-success-light': toHex(mixColor(colors.success, tintTarget, theme === 'dark' ? 0.78 : 0.86)),
    '--somane-success-dark': toHex(mixColor(colors.success, [0, 0, 0], 0.48)),
    '--somane-warning': colors.warning,
    '--somane-warning-rgb': rgbString(colors.warning),
    '--somane-warning-light': toHex(mixColor(colors.warning, tintTarget, theme === 'dark' ? 0.78 : 0.82)),
    '--somane-warning-dark': toHex(mixColor(colors.warning, [0, 0, 0], 0.52)),
    '--somane-danger': colors.error,
    '--somane-danger-rgb': rgbString(colors.error),
    '--somane-danger-light': toHex(mixColor(colors.error, tintTarget, theme === 'dark' ? 0.78 : 0.86)),
    '--somane-danger-dark': toHex(mixColor(colors.error, [0, 0, 0], 0.42)),
    '--somane-error': colors.error,
    '--somane-info': colors.info,
    '--somane-info-rgb': rgbString(colors.info),
    '--somane-info-light': toHex(mixColor(colors.info, tintTarget, theme === 'dark' ? 0.78 : 0.86)),
    '--somane-info-dark': toHex(mixColor(colors.info, [0, 0, 0], 0.42)),
    '--somane-bg': colors.page,
    '--somane-bg-page': colors.page,
    '--somane-bg-rgb': rgbString(colors.page),
    '--somane-bg-elevated': colors.surface,
    '--somane-bg-subtle': colors.subtle,
    '--somane-text': colors.text,
    '--somane-text-rgb': rgbString(colors.text),
    '--somane-text-secondary': secondaryText,
    '--somane-border': border,
    '--somane-border-rgb': rgbString(border),
    '--somane-border-strong': borderStrong,
    '--somane-border-focus': primary,
    '--somane-brand-500-rgb': rgbString(primary),
    '--somane-brand-600-rgb': rgbString(primary),
    '--somane-brand-700-rgb': rgbString(primaryHover),
  };
  return tokens;
};

export function AppearancePreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [companyDefaults, setCompanyDefaults] = useState(null);
  const [settingsRecordId, setSettingsRecordId] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [systemContrast, setSystemContrast] = useState(getSystemContrast);
  const [systemReducedMotion, setSystemReducedMotion] = useState(getSystemReducedMotion);

  const updatePreference = useCallback((key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const updateColor = useCallback((key, value) => {
    setPreferences((current) => ({
      ...current,
      brand: 'custom',
      colorOverrides: { ...current.colorOverrides, [key]: value.toUpperCase() },
    }));
  }, []);

  const applyBrand = useCallback((brand) => {
    const preset = BRAND_PRESETS[brand];
    if (!preset) return;
    setPreferences((current) => ({
      ...current,
      brand,
      colorOverrides: brand === 'custom' ? current.colorOverrides : {},
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(companyDefaults ? { ...DEFAULT_PREFERENCES, ...companyDefaults, colorOverrides: companyDefaults.colorOverrides || {} } : { ...DEFAULT_PREFERENCES, colorOverrides: {} });
  }, [companyDefaults]);

  const applyPreferences = useCallback((next) => {
    const merged = { ...DEFAULT_PREFERENCES, ...next, colorOverrides: next?.colorOverrides || {} };
    ['fontScale', 'titleScale', 'labelScale', 'helpScale', 'tableScale', 'menuScale', 'buttonScale'].forEach((key) => {
      const scale = Number(merged[key]);
      merged[key] = Number.isFinite(scale)
        ? Math.min(100, Math.max(50, scale))
        : DEFAULT_PREFERENCES[key];
    });
    setPreferences(merged);
  }, []);

  const loadCompanyDefaults = useCallback(async () => {
    try {
      const result = await apiClient.get('/parametres/');
      const rows = Array.isArray(result) ? result : result?.results || [];
      const record = rows.find((item) => item.cle === COMPANY_DEFAULTS_KEY);
      const value = record?.valeur && typeof record.valeur === 'object' ? record.valeur : null;
      if (value) setCompanyDefaults(value);
      return value;
    } catch (error) {
      console.warn('Valeurs par défaut de l’entreprise indisponibles.', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (!authService.isAuthenticated() || !authService.getUser()?.id) return;
      setServerLoaded(false);
      setSettingsRecordId(null);
      try {
        const cached = localStorage.getItem(userStorageKey());
        if (cached) applyPreferences(JSON.parse(cached));
        else applyPreferences(DEFAULT_PREFERENCES);
      } catch { /* Le cache invalide sera remplacé par les préférences serveur. */ }
      try {
        const result = await apiClient.get('/user-settings/');
        const rows = Array.isArray(result) ? result : result?.results || [];
        const row = rows[0];
        if (active && row) {
          setSettingsRecordId(row.id);
          if (row.preferences && Object.keys(row.preferences).length) applyPreferences(row.preferences);
          else if (row.theme_systeme) updatePreference('theme', row.theme_systeme);
        } else if (active) {
          const defaults = await loadCompanyDefaults();
          if (active && defaults) applyPreferences(defaults);
        }
      } catch (error) {
        console.warn('Préférences serveur indisponibles, le cache local reste actif.', error);
      } finally {
        if (active) setServerLoaded(true);
      }
    };
    sync();
    window.addEventListener('somane:auth-changed', sync);
    return () => { active = false; window.removeEventListener('somane:auth-changed', sync); };
  }, [applyPreferences, loadCompanyDefaults, updatePreference]);

  const resolvedTheme = preferences.theme === 'system' ? systemTheme : preferences.theme;
  const resolvedContrast = preferences.contrast === 'system'
    ? (systemContrast ? 'high' : 'normal')
    : preferences.contrast;
  const reduceMotion = preferences.reduceMotion || systemReducedMotion;
  const baseColors = resolvedTheme === 'dark' ? DARK_COLORS : DEFAULT_COLORS;
  const brandColors = BRAND_PRESETS[preferences.brand]?.colors || EMPTY_COLORS;
  const applicableColorOverrides = getApplicableColorOverrides(preferences.colorOverrides, resolvedTheme);
  const colors = useMemo(() => ({
    ...baseColors,
    ...brandColors,
    ...applicableColorOverrides,
  }), [baseColors, brandColors, applicableColorOverrides]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.font = preferences.font;
    root.dataset.headingFont = preferences.headingFont;
    root.dataset.dataFont = preferences.dataFont;
    root.dataset.textSize = preferences.textSize;
    root.dataset.fontWeight = preferences.fontWeight;
    root.dataset.lineHeight = preferences.lineHeight;
    root.dataset.textWidth = preferences.textWidth;
    root.dataset.density = preferences.density;
    root.dataset.contrast = resolvedContrast;
    root.dataset.motion = reduceMotion ? 'reduce' : 'normal';
    root.dataset.tooltips = preferences.tooltips;
    root.dataset.tooltipDelay = String(preferences.tooltipDelay);
    root.dataset.tooltipPlacement = preferences.tooltipPlacement;
    root.dataset.notificationPosition = preferences.notificationPosition;
    root.dataset.notificationAnimation = preferences.notificationAnimation;
    const fontScale = Math.min(100, Math.max(50, Number(preferences.fontScale) || DEFAULT_PREFERENCES.fontScale));
    const baseFontSizes = { tiny: 12, small: 14, standard: 16, medium: 18, large: 20, 'extra-large': 22 };
    const selectedBaseSize = baseFontSizes[preferences.textSize] || baseFontSizes.standard;
    const spacingScale = Math.min(140, Math.max(70, Number(preferences.spacingScale) || 100)) / 100;
    root.style.setProperty('--somane-root-font-size', `${selectedBaseSize * fontScale / 100}px`);
    root.style.setProperty('--somane-user-spacing-scale', String(spacingScale));
    const roleScales = {
      titleScale: '--somane-title-scale',
      labelScale: '--somane-label-scale',
      helpScale: '--somane-help-scale',
      tableScale: '--somane-table-scale',
      menuScale: '--somane-menu-scale',
      buttonScale: '--somane-button-scale',
    };
    Object.entries(roleScales).forEach(([key, token]) => {
      const scale = Math.min(100, Math.max(50, Number(preferences[key]) || DEFAULT_PREFERENCES[key])) / 100;
      root.style.setProperty(token, String(scale));
    });
    const weights = {
      light: [300, 400, 500, 600],
      standard: [400, 500, 600, 700],
      strong: [500, 600, 700, 800],
    }[preferences.fontWeight] || [400, 500, 600, 700];
    ['regular', 'medium', 'semibold', 'bold'].forEach((name, index) => {
      root.style.setProperty(`--somane-weight-${name}`, String(weights[index]));
    });
    const lineHeights = { compact: [1.15, 1.4, 1.6], normal: [1.25, 1.5, 1.7], relaxed: [1.35, 1.65, 1.85] };
    const leading = lineHeights[preferences.lineHeight] || lineHeights.normal;
    ['tight', 'normal', 'relaxed'].forEach((name, index) => {
      root.style.setProperty(`--somane-leading-${name}`, String(leading[index]));
    });
    Object.entries(getColorTokens(colors, resolvedTheme, resolvedContrast)).forEach(([token, value]) => {
      root.style.setProperty(token, value);
    });

    try {
      localStorage.setItem(userStorageKey(), JSON.stringify(preferences));
      // Keep the legacy key for migration compatibility, not as the source of truth.
      if (userId() === 'anonymous') localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Impossible d’enregistrer les préférences d’apparence.', error);
    }
  }, [preferences, colors, resolvedTheme, resolvedContrast, reduceMotion]);

  useEffect(() => {
    if (!serverLoaded || !authService.isAuthenticated() || !authService.getUser()?.id) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const payload = { theme_systeme: preferences.theme, preferences };
        if (settingsRecordId) await apiClient.patch(`/user-settings/${settingsRecordId}/`, payload);
        else {
          const result = await apiClient.post('/user-settings/', payload);
          if (result?.id) setSettingsRecordId(result.id);
        }
      } catch (error) {
        // Local preferences remain available if the server is temporarily unreachable.
        console.warn('Synchronisation des préférences différée.', error);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [preferences, settingsRecordId, serverLoaded]);

  const saveCompanyDefaults = useCallback(async (defaults) => {
    const result = await apiClient.get('/parametres/');
    const rows = Array.isArray(result) ? result : result?.results || [];
    const record = rows.find((item) => item.cle === COMPANY_DEFAULTS_KEY);
    const activeEntity = getActiveEntity();
    const payload = { cle: COMPANY_DEFAULTS_KEY, valeur: defaults, description: 'Valeurs par défaut de l’apparence pour les utilisateurs de l’entreprise.', modifiable: true, entite: activeEntity?.id ?? activeEntity ?? null };
    if (record) await apiClient.patch(`/parametres/${record.id}/`, { valeur: defaults });
    else await apiClient.post('/parametres/', payload);
    setCompanyDefaults(defaults);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    setSystemTheme(query.matches ? 'dark' : 'light');
    query.addEventListener?.('change', updateTheme);
    return () => query.removeEventListener?.('change', updateTheme);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const contrastQueries = [
      window.matchMedia('(prefers-contrast: more)'),
      window.matchMedia('(forced-colors: active)'),
    ];
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateContrast = () => setSystemContrast(getSystemContrast());
    const updateMotion = (event) => setSystemReducedMotion(event.matches);
    contrastQueries.forEach((query) => query.addEventListener?.('change', updateContrast));
    motionQuery.addEventListener?.('change', updateMotion);
    updateContrast();
    setSystemReducedMotion(motionQuery.matches);
    return () => {
      contrastQueries.forEach((query) => query.removeEventListener?.('change', updateContrast));
      motionQuery.removeEventListener?.('change', updateMotion);
    };
  }, []);

  const value = useMemo(() => ({
    preferences,
    colors,
    updatePreference,
    updateColor,
    applyBrand,
    resetPreferences,
    applyPreferences,
    companyDefaults,
    loadCompanyDefaults,
    saveCompanyDefaults,
  }), [preferences, colors, updatePreference, updateColor, applyBrand, resetPreferences, applyPreferences, companyDefaults, loadCompanyDefaults, saveCompanyDefaults]);
  return <AppearancePreferencesContext.Provider value={value}>{children}</AppearancePreferencesContext.Provider>;
}

export function useAppearancePreferences() {
  const value = useContext(AppearancePreferencesContext);
  if (!value) throw new Error('useAppearancePreferences doit être utilisé dans AppearancePreferencesProvider');
  return value;
}

// src/features/comptabilite/services/accountHelper.js

/**
 * SERVICE D'AIDE À LA GESTION DES COMPTES COMPTABLES
 * 
 * Ce service permet de déterminer dynamiquement la nature d'un compte,
 * de trouver les comptes partenaires, et de suggérer les journaux
 * en fonction des données réelles du plan comptable.
 * 
 * AVANTAGE : Aucune constante en dur, compatible avec TOUS les référentiels
 * (PCG, SYSCOHADA, US GAAP, OHADA, etc.)
 * 
 * UTILISATION DANS LES COMPOSANTS :
 * - PiecesComptables/Create.jsx
 * - PiecesComptables/Edit.jsx
 * - Journaux/Create.jsx
 * - etc.
 */

// =============================================================================
// CONFIGURATION (modifiable sans toucher au code principal)
// =============================================================================

/**
 * Mapping des types de partenaires vers les préfixes de comptes attendus.
 * C'est la SEULE configuration "en dur" de ce fichier.
 * Elle peut être déplacée dans une API plus tard si besoin.
 * 
 * ⚠️ Ces préfixes sont des FALLBACKS. La priorité est donnée aux données
 *    réelles du plan comptable chargé depuis l'API.
 */
const PARTNER_PREFIX_MAPPING = {
  fournisseur: ['401', '40', '4010', '40100', '401000'],
  client: ['411', '41', '4110', '41100', '411000'],
  employe: ['422', '42', '421', '4210', '42100'],
  debiteur: ['4581', '458', '45810', '458100'],
  crediteur: ['4181', '418', '41810', '418100'],
  divers: ['467', '46', '461', '462']
};

/**
 * Mapping des types de journaux par nature de compte (fallback)
 * Utilisé uniquement si la détection par groupe ou par type échoue
 */
const DEFAULT_JOURNAL_CODES = {
  charge: 'ACH',
  produit: 'VEN',
  tresorerie: 'BQ',
  default: 'OD'
};

const sortCounterpartCandidates = (accounts) => accounts.sort((a, b) => {
  const aIsDetail = a.account_type === 'detail' ? 0 : 1;
  const bIsDetail = b.account_type === 'detail' ? 0 : 1;
  if (aIsDetail !== bIsDetail) return aIsDetail - bIsDetail;
  const aLevel = Number(a.level) || 0;
  const bLevel = Number(b.level) || 0;
  if (aLevel !== bLevel) return bLevel - aLevel;
  return String(a.code || '').localeCompare(String(b.code || ''));
});

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

/**
 * Détermine la nature d'un compte à partir de son code ou de ses données
 * 
 * @param {string} accountCode - Code du compte (ex: "411001")
 * @param {Array} accountsList - Liste des comptes chargés depuis l'API
 * @returns {string} Nature du compte : 'charge', 'produit', 'tiers', 'tresorerie', 'other'
 * 
 * @example
 * getAccountNature('601', accounts) // → 'charge'
 * getAccountNature('701', accounts) // → 'produit'
 * getAccountNature('411', accounts) // → 'tiers'
 * getAccountNature('512', accounts) // → 'tresorerie'
 */
export const getAccountNature = (accountCode, accountsList = []) => {
  if (!accountCode || typeof accountCode !== 'string') {
    return 'other';
  }

  // Nettoyer le code (enlever les espaces)
  const cleanCode = accountCode.trim();

  // === PRIORITÉ 1 : Utiliser les données du plan comptable (le plus fiable) ===
  if (accountsList && accountsList.length > 0) {
    // Chercher le compte par son code exact
    const compte = accountsList.find(c => c.code === cleanCode || String(c.id) === cleanCode);
    
    if (compte) {
      // 1.1 Par le groupe du compte (le plus fiable)
      const groupName = compte.group?.name || compte.group_name || '';
      const groupCode = compte.group?.code || '';
      
      if (groupName.includes('Classe 6') || groupName.includes('Charges') || groupCode === '6') {
        return 'charge';
      }
      if (groupName.includes('Classe 7') || groupName.includes('Produits') || groupCode === '7') {
        return 'produit';
      }
      if (groupName.includes('Classe 4') || groupName.includes('Tiers') || groupCode === '4') {
        return 'tiers';
      }
      if (groupName.includes('Classe 5') || groupName.includes('Trésorerie') || groupCode === '5') {
        return 'tresorerie';
      }
      
      // 1.2 Par le type du compte (si disponible)
      if (compte.type?.code) {
        const typeCode = compte.type.code.toLowerCase();
        if (typeCode.includes('charge')) return 'charge';
        if (typeCode.includes('produit')) return 'produit';
        if (typeCode.includes('tiers')) return 'tiers';
      }
      
      // 1.3 Par le nom du groupe
      if (groupName.toLowerCase().includes('charge')) return 'charge';
      if (groupName.toLowerCase().includes('produit')) return 'produit';
      if (groupName.toLowerCase().includes('tiers')) return 'tiers';
    }
  }

  // === PRIORITÉ 2 : Fallback sur le premier caractère (PCG standard / SYSCOHADA) ===
  const firstChar = cleanCode.charAt(0);
  if (firstChar === '6') return 'charge';
  if (firstChar === '7') return 'produit';
  if (firstChar === '4') return 'tiers';
  if (firstChar === '5') return 'tresorerie';

  return 'other';
};

/**
 * Trouve le compte partenaire approprié pour un type de partenaire donné
 * 
 * @param {string} partnerType - Type du partenaire (fournisseur, client, employe, etc.)
 * @param {Array} accountsList - Liste des comptes chargés depuis l'API
 * @returns {Object|null} Le compte trouvé ou null
 * 
 * @example
 * findPartnerAccount('fournisseur', accounts) // → { id: 4, code: '401', name: 'Fournisseurs' }
 */
export const findPartnerAccount = (partnerType, accountsList) => {
  if (!partnerType || !accountsList || !accountsList.length) {
    return null;
  }

  // Nettoyer le type (minuscules, sans accents)
  const cleanType = partnerType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const usableAccounts = sortCounterpartCandidates(accountsList.filter(isValidCounterpartAccount));

  // Récupérer les préfixes pour ce type de partenaire
  const prefixes = PARTNER_PREFIX_MAPPING[cleanType] || PARTNER_PREFIX_MAPPING.divers || [];

  // Chercher le premier compte qui correspond à un préfixe
  for (const prefix of prefixes) {
    const compte = usableAccounts.find(a => a.code && a.code.startsWith(prefix));
    if (compte) {
      return compte;
    }
  }

  // Fallback : chercher n'importe quel compte dont le nom contient le type
  const compteByName = usableAccounts.find(a => {
    const name = (a.name || '').toLowerCase();
    return name.includes(cleanType) || name.includes(cleanType.slice(0, 3));
  });

  return compteByName || null;
};

/**
 * Trouve le compte bancaire/caisse par défaut pour un journal
 * 
 * @param {Array} accountsList - Liste des comptes chargés depuis l'API
 * @returns {Object|null} Le compte de trésorerie trouvé ou null
 */
export const findCashAccount = (accountsList) => {
  if (!accountsList || !accountsList.length) {
    return null;
  }

  // Priorité 1 : Comptes bancaires standards
  const bankPrefixes = ['512', '52', '511', '514', '5120', '51200'];
  for (const prefix of bankPrefixes) {
    const compte = accountsList.find(a => a.code && a.code.startsWith(prefix));
    if (compte) return compte;
  }

  // Priorité 2 : Comptes de caisse
  const cashPrefixes = ['531', '53', '532', '5310', '53100'];
  for (const prefix of cashPrefixes) {
    const compte = accountsList.find(a => a.code && a.code.startsWith(prefix));
    if (compte) return compte;
  }

  // Priorité 3 : N'importe quel compte de trésorerie (groupe 5)
  const compte = accountsList.find(a => {
    const groupName = a.group?.name || a.group_name || '';
    const firstChar = a.code?.charAt(0);
    return groupName.includes('Classe 5') || groupName.includes('Trésorerie') || firstChar === '5';
  });

  return compte || null;
};

/**
 * Suggère un journal en fonction de la nature du compte et des journaux disponibles
 * 
 * @param {string} accountNature - Nature du compte (charge, produit, tiers, tresorerie)
 * @param {Array} journalsList - Liste des journaux chargés depuis l'API
 * @returns {Object|null} Le journal suggéré ou null
 * 
 * @example
 * suggestJournalByNature('charge', journals) // → { id: 1, code: 'ACH', name: 'Achats' }
 */
export const suggestJournalByNature = (accountNature, journalsList) => {
  if (!accountNature || !journalsList || !journalsList.length) {
    return null;
  }

  // Mapping entre nature et code de journal attendu (en priorité)
  const mappingByCode = {
    charge: ['ACH', 'ACHATS', 'PUR', 'PURCHASE', 'ACHAT'],
    produit: ['VEN', 'VENTES', 'SAL', 'SALE', 'SALES', 'VENTE'],
    tresorerie: ['BQ', 'BAN', 'BANK', 'CAI', 'CASH', 'BANQUE', 'CAISSE']
  };

  const candidateCodes = mappingByCode[accountNature] || [];
  
  // Chercher par code d'abord
  for (const code of candidateCodes) {
    const journal = journalsList.find(j => j.code === code);
    if (journal) return journal;
  }

  // Chercher par type de journal
  for (const journal of journalsList) {
    const typeCode = journal.type?.code || journal.type_code || '';
    const typeName = journal.type?.name || journal.type_name || '';
    
    if (accountNature === 'charge') {
      if (typeCode === 'PURCHASE' || typeName.includes('Achat')) return journal;
    }
    if (accountNature === 'produit') {
      if (typeCode === 'SALE' || typeName.includes('Vente')) return journal;
    }
    if (accountNature === 'tresorerie') {
      if (typeCode === 'BANK' || typeCode === 'CASH' || typeName.includes('Banque') || typeName.includes('Caisse')) {
        return journal;
      }
    }
  }

  // Fallback : journal par défaut
  const defaultJournal = journalsList.find(j => j.code === DEFAULT_JOURNAL_CODES.default);
  return defaultJournal || journalsList[0] || null;
};

/**
 * Vérifie si un compte peut être utilisé comme compte de contrepartie
 * 
 * @param {Object} account - Le compte à vérifier
 * @returns {boolean} True si le compte peut être une contrepartie
 */
export const isValidCounterpartAccount = (account) => {
  if (!account) return false;
  
  // Un compte de contrepartie doit être opérationnel (pas racine)
  if (account.is_root === true) return false;
  
  // Doit être actif
  if (account.active === false) return false;
  if (account.locked === true) return false;
  
  // Doit appartenir à une entité (pas un compte racine partagé)
  if (account.company === null || account.company === undefined || account.company === '') return false;
  
  return true;
};

/**
 * Résout le compte de contrepartie en combinant nature du compte, type partenaire
 * et comptes réellement disponibles. Le fallback par préfixe reste volontairement
 * conservateur et ne retient que les comptes opérationnels.
 *
 * @param {Object} params
 * @param {Object} params.motherLine - Ligne saisie par l'utilisateur
 * @param {Object} params.partner - Partenaire sélectionné
 * @param {Array} params.accountsList - Plan comptable chargé depuis l'API
 * @returns {Object|null}
 */
export const resolveCounterpartAccount = ({ motherLine, partner, accountsList = [] }) => {
  if (!motherLine || !partner || !accountsList.length) return null;

  const nature = getAccountNature(motherLine.account_code, accountsList);
  const partnerType = (partner.type_partenaire || partner.type || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const prefixesByNatureAndPartner = {
    charge: {
      fournisseur: ['401', '40'],
      employe: ['422', '421', '42'],
      crediteur: ['401', '408', '467', '418'],
      debiteur: ['467', '458'],
      client: ['411', '467'],
    },
    produit: {
      client: ['411', '41'],
      debiteur: ['411', '467', '458'],
      crediteur: ['467', '418'],
      fournisseur: ['401', '467'],
      employe: ['467', '421', '422'],
    },
    tiers: PARTNER_PREFIX_MAPPING,
    tresorerie: PARTNER_PREFIX_MAPPING,
    other: PARTNER_PREFIX_MAPPING,
  };

  const usableAccounts = sortCounterpartCandidates(accountsList.filter(isValidCounterpartAccount));

  const configuredPrefixes =
    prefixesByNatureAndPartner[nature]?.[partnerType] ||
    PARTNER_PREFIX_MAPPING[partnerType] ||
    PARTNER_PREFIX_MAPPING.divers ||
    [];

  for (const prefix of configuredPrefixes) {
    const account = usableAccounts.find(a => a.code && a.code.startsWith(prefix));
    if (account) return account;
  }

  return findPartnerAccount(partnerType, usableAccounts);
};

/**
 * Filtre les partenaires en fonction du compte sélectionné
 * 
 * @param {Array} partners - Liste des partenaires
 * @param {string} accountCode - Code du compte sélectionné
 * @param {Array} accountsList - Liste des comptes pour déterminer la nature
 * @returns {Array} Liste filtrée des partenaires
 */
export const filterPartnersByAccount = (partners, accountCode, accountsList = []) => {
  if (!partners || !partners.length) return [];
  if (!accountCode) return partners;

  const nature = getAccountNature(accountCode, accountsList);
  
  // Mapping nature → types de partenaires autorisés
  const allowedTypes = {
    charge: ['fournisseur', 'employe', 'crediteur', 'debiteur', 'divers'],
    produit: ['client', 'debiteur', 'crediteur', 'divers'],
    tiers: ['client', 'fournisseur', 'employe', 'debiteur', 'crediteur', 'divers'],
    tresorerie: ['client', 'fournisseur', 'employe', 'debiteur', 'crediteur', 'divers'],
    other: ['client', 'fournisseur', 'employe', 'debiteur', 'crediteur', 'divers']
  };

  const allowed = allowedTypes[nature] || allowedTypes.other;
  
  return partners.filter(partner => {
    const type = partner.type_partenaire || partner.type || '';
    return allowed.includes(type);
  });
};

/**
 * Détermine si un compte est un compte de tiers (client/fournisseur)
 * 
 * @param {string} accountCode - Code du compte
 * @param {Array} accountsList - Liste des comptes
 * @returns {boolean}
 */
export const isThirdPartyAccount = (accountCode, accountsList = []) => {
  const nature = getAccountNature(accountCode, accountsList);
  return nature === 'tiers';
};

/**
 * Détermine si un compte est un compte de charge ou de produit
 * 
 * @param {string} accountCode - Code du compte
 * @param {Array} accountsList - Liste des comptes
 * @returns {boolean}
 */
export const isIncomeOrExpenseAccount = (accountCode, accountsList = []) => {
  const nature = getAccountNature(accountCode, accountsList);
  return nature === 'charge' || nature === 'produit';
};

/**
 * Récupère le sens normal d'un compte (débit ou crédit)
 * 
 * @param {string} accountCode - Code du compte
 * @param {Array} accountsList - Liste des comptes
 * @returns {string} 'debit' ou 'credit'
 */
export const getNormalBalance = (accountCode, accountsList = []) => {
  const nature = getAccountNature(accountCode, accountsList);
  
  // Règle générale (PCG standard / SYSCOHADA)
  if (nature === 'charge' || nature === 'actif') return 'debit';
  if (nature === 'produit' || nature === 'passif') return 'credit';
  if (nature === 'tiers') return 'debit'; // Par défaut, les comptes tiers sont débiteurs
  
  return 'debit';
};

/**
 * Détermine si un compte est lettrable (reconcile)
 * 
 * @param {Object} account - Le compte à vérifier
 * @returns {boolean}
 */
export const isReconciliableAccount = (account) => {
  if (!account) return false;
  return account.reconcile === true;
};

// =============================================================================
// EXPORT PAR DÉFAUT (pour faciliter l'import)
// =============================================================================

export default {
  getAccountNature,
  findPartnerAccount,
  findCashAccount,
  suggestJournalByNature,
  isValidCounterpartAccount,
  resolveCounterpartAccount,
  filterPartnersByAccount,
  isThirdPartyAccount,
  isIncomeOrExpenseAccount,
  getNormalBalance,
  isReconciliableAccount
};

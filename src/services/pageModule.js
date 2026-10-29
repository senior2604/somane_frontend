const CORE_PAGE_PREFIXES = [
  '/entities',
  '/partner',
  '/partners',
  '/UsersGestions',
  '/security',
  '/userentities',
  '/groupes',
  '/permissions',
  '/settings',
  '/journal',
  '/modules',
  '/countries',
  '/currencies',
  '/banks',
  '/PartnerBanks',
  '/somane-ai',
  '/ExchangeRates',
  '/Languages',
  '/translations',
  '/States',
  '/tasks',
  '/system',
  '/models',
  '/model-fields',
  '/field-preview',
];

export function isCorePage(pathname = '') {
  const normalizedPath = pathname.toLowerCase();
  return CORE_PAGE_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.toLowerCase();
    return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
  });
}

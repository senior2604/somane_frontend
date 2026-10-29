function flattenMenuItems(nodes, translate, ancestors = []) {
  return (Array.isArray(nodes) ? nodes : []).flatMap((node) => {
    if (!node || typeof node !== 'object') return [];
    const name = String(node.name || '').trim();
    const labelParts = [...ancestors, name].filter(Boolean);
    const items = [];

    if (node.path) {
      items.push({
        label: translate(labelParts.join(' / ')),
        path: node.path,
        model: node.model || undefined,
      });
    }

    if (Array.isArray(node.children) && node.children.length) {
      items.push(...flattenMenuItems(node.children, translate, labelParts));
    }

    return items;
  });
}

function coreNavigationFromMenus(configuration, translate) {
  const menus = Array.isArray(configuration?.menus) ? configuration.menus : [];
  const coreRoot = menus.find((menu) => (
    menu?.application_root && String(menu.name || '').trim().toLocaleLowerCase() === 'core'
  )) || menus.find((menu) => String(menu?.name || '').trim().toLocaleLowerCase() === 'core');

  if (!coreRoot) return null;

  return (coreRoot.children || [])
    .map((category) => ({
      name: translate(category.name),
      path: category.path || undefined,
      items: flattenMenuItems(category.children, translate),
    }))
    .filter((category) => category.path || category.items.length > 0);
}

export function getHeaderNavigation(configuration, module, translate = (text) => text) {
  const headerNavigation = configuration?.header_navigation || {};
  const configuredMenus = headerNavigation[module?.id];
  if (Array.isArray(configuredMenus) && configuredMenus.length > 0) {
    return configuredMenus.map((menu) => ({
      name: translate(menu.name),
      path: menu.path || undefined,
      items: (menu.children || []).map((item) => ({
        label: translate(item.name),
        path: item.path,
        model: item.model || undefined,
      })),
    }));
  }

  if (module?.id === 'core') {
    const coreMenus = coreNavigationFromMenus(configuration, translate);
    if (coreMenus) return coreMenus;
  }

  return (module?.navigation || []).map((menu) => ({
    ...menu,
    name: translate(menu.name),
    items: menu.items?.map((item) => ({ ...item, label: translate(item.label || item.name) })),
  }));
}

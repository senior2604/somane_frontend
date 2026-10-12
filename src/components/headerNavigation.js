export function getHeaderNavigation(configuration, module) {
  const configuredMenus = configuration?.header_navigation?.[module?.id];
  if (!Array.isArray(configuredMenus) || configuredMenus.length === 0) {
    return module?.navigation || [];
  }

  return configuredMenus.map((menu) => ({
    name: menu.name,
    path: menu.path || undefined,
    items: (menu.children || []).map((item) => ({
      label: item.name,
      path: item.path,
      model: item.model || undefined,
    })),
  }));
}

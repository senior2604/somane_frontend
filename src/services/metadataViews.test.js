import { applyConfiguredListColumns } from './metadataViews';

describe('applyConfiguredListColumns', () => {
  const columns = [
    { id: 'name', label: 'Nom d’origine' },
    { id: 'supplier', label: 'Fournisseur' },
    { id: 'amount_total', label: 'Montant' },
  ];

  it('applique l’ordre et les libellés de la vue et ignore les champs invisibles', () => {
    const configured = applyConfiguredListColumns(columns, [
      { name: 'amount_total', label: 'TTC', invisible: false, widget: 'monetary' },
      { name: 'partner', label: 'Partenaire', invisible: false },
      { name: 'name', label: 'Référence', invisible: true },
    ], { partner: 'supplier' });

    expect(configured.map(({ id, label }) => [id, label])).toEqual([
      ['amount_total', 'TTC'],
      ['supplier', 'Partenaire'],
    ]);
    expect(configured[0].metadataField.widget).toBe('monetary');
  });

  it('conserve les colonnes de la page lorsque la vue n’est pas configurée', () => {
    expect(applyConfiguredListColumns(columns, null)).toBe(columns);
    expect(applyConfiguredListColumns(columns, [])).toBe(columns);
  });
});

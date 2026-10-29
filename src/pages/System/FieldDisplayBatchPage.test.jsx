import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FieldDisplayBatchPage from './FieldDisplayBatchPage';
import { apiClient } from '../../services/apiClient';

jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ t: (value) => value }) }));
jest.mock('../../context/UiContext', () => ({ useUi: () => ({ security: { user: { id: 1, is_superuser: true } } }) }));
jest.mock('react-router-dom', () => ({ Link: 'a' }), { virtual: true });
jest.mock('../../services/developerMode', () => ({
  readDeveloperMode: () => true,
  subscribeDeveloperMode: () => () => {},
}));

jest.mock('../../services/apiClient', () => ({
  apiClient: { get: jest.fn(), patch: jest.fn() },
}));

describe('FieldDisplayBatchPage', () => {
  beforeEach(() => {
    apiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/ir-models/') return Promise.resolve({ results: [{ id: 1, model: 'core.Test' }] });
      if (endpoint === '/ir-model-fields/') {
        return Promise.resolve({
          results: Array.from({ length: 21 }, (_, index) => ({
            id: index + 1,
            name: `field_${String(index).padStart(3, '0')}`,
            field_description: `Champ ${index}`,
            ttype: 'char',
            model_id: 1,
            state: 'base',
          })),
        });
      }
      if (endpoint === '/ir-views/') return Promise.resolve({ results: [] });
      return Promise.resolve({ results: [] });
    });
  });

  test('affiche 20 champs par défaut, permet de parcourir les pages et de passer à 30', async () => {
    render(<FieldDisplayBatchPage />);

    await screen.findByText('field_000');
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Configurer' })).toHaveLength(20));
    expect(screen.queryByText('field_020')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(await screen.findByText('field_020')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Configurer' })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Lignes par page'), { target: { value: '30' } });
    expect(await screen.findByText('field_000')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Configurer' })).toHaveLength(21);
    expect(screen.getByText('Page 1 sur 1')).toBeInTheDocument();
  });

  test('enregistre le rendu d’un champ dans une vue précise', async () => {
    apiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/ir-models/') return Promise.resolve({ results: [{ id: 1, model: 'core.Test' }] });
      if (endpoint === '/ir-model-fields/') return Promise.resolve({ results: [{
        id: 1, name: 'field_000', field_description: 'Champ 0', ttype: 'char', model_id: 1, state: 'base',
      }] });
      if (endpoint === '/ir-views/') return Promise.resolve({ results: [{
        id: 51, name: 'Vue formulaire', model: 'core.Test', type: 'form', mode: 'primary', active: true,
        inherit_id: null, arch_db: '<form><field name="field_000"/></form>',
      }] });
      return Promise.resolve({ results: [] });
    });
    apiClient.patch.mockResolvedValue({
      view_id: 51,
      arch_db: '<form><field name="field_000" widget="email"/></form>',
    });

    render(<FieldDisplayBatchPage />);
    await screen.findByText('field_000');
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }));

    const viewWidget = await screen.findByLabelText('Rendu de la vue — Vue formulaire');
    fireEvent.change(viewWidget, { target: { value: 'email' } });

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(
      '/ir-model-fields/1/set-view-widget/', expect.objectContaining({
        view_id: 51, widget: 'email', options: {}, attributes: {}, clear_attributes: [],
      }),
    ));
    await waitFor(() => expect(screen.getByLabelText('Rendu de la vue — Vue formulaire').value).toBe('email'));
  });
});

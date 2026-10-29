import React from 'react';
import { render, screen } from '@testing-library/react';
import MetadataFieldDisplay from './MetadataFieldDisplay';
import { LanguageProvider } from '../context/LanguageContext';

function renderField(value, field) {
  return render(<LanguageProvider><MetadataFieldDisplay value={value} field={field} /></LanguageProvider>);
}

describe('MetadataFieldDisplay widgets', () => {
  test('rendu e-mail sous forme de lien mailto', () => {
    renderField('contact@somane.example', { type: 'char', widget: 'email' });
    expect(screen.getByRole('link')).toHaveAttribute('href', 'mailto:contact@somane.example');
  });

  test('refuse de rendre un lien URL avec un protocole dangereux', () => {
    renderField('javascript:alert(1)', { type: 'char', widget: 'url' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  test('applique une décoration XML simple sur une valeur de badge', () => {
    const { container } = render(<LanguageProvider><MetadataFieldDisplay
      value="Terminé"
      field={{ type: 'selection', widget: 'badge', widget_attributes: { 'decoration-success': "state == 'done'" } }}
      record={{ state: 'done' }}
    /></LanguageProvider>);
    expect(container.querySelector('.bg-emerald-100')).toBeInTheDocument();
  });

  test('affiche une sélection sous forme de barre de statut', () => {
    renderField('done', {
      type: 'selection', widget: 'statusbar',
      selection: [{ value: 'draft', label: 'Brouillon' }, { value: 'done', label: 'Terminé' }],
    });
    expect(screen.getByLabelText('Étape actuelle : Terminé')).toBeInTheDocument();
    expect(screen.getByText('Terminé')).toBeInTheDocument();
  });

  test('respecte le maximum configuré dans une barre de progression', () => {
    renderField(50, { type: 'float', widget: 'progressbar', widget_options: { max_value: 200 } });
    const progress = screen.getByRole('img', { name: 'Progression : 50 / 200' });
    expect(screen.getByText('50 / 200')).toBeInTheDocument();
    expect(progress.querySelector('span')).toHaveStyle({ width: '25%' });
  });

  test('affiche le libellé configuré sous la jauge circulaire', () => {
    renderField(60, { type: 'integer', widget: 'percentpie', widget_attributes: { string: 'Taux de réalisation' } });
    expect(screen.getByText('Taux de réalisation')).toBeInTheDocument();
  });

  test('affiche les widgets compteur, poignée, icône booléenne et HTML sécurisé', () => {
    const { rerender, container } = renderField(4, { type: 'integer', widget: 'statinfo', label: 'Documents' });
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    rerender(<LanguageProvider><MetadataFieldDisplay value={2} field={{ type: 'integer', widget: 'handle' }} handleDisabled={false} /></LanguageProvider>);
    expect(screen.getByLabelText('Poignée de réorganisation')).toHaveAttribute('draggable', 'true');

    rerender(<LanguageProvider><MetadataFieldDisplay value={false} field={{ type: 'boolean', widget: 'boolean_icon' }} /></LanguageProvider>);
    expect(screen.getByLabelText('Non')).toBeInTheDocument();

    rerender(<LanguageProvider><MetadataFieldDisplay value={'<p>Bonjour <strong>Somane</strong><script>alert(1)</script></p>'} field={{ type: 'html', widget: 'html' }} /></LanguageProvider>);
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Somane')).toBeInTheDocument();
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });
});

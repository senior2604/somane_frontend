import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WidgetOptionsEditor from './WidgetOptionsEditor';
import { LanguageProvider } from '../context/LanguageContext';

describe('WidgetOptionsEditor', () => {
  test('masque les réglages par défaut et permet de les afficher puis de les replier', () => {
    render(<LanguageProvider><WidgetOptionsEditor
      widget="datetime"
      fieldType="datetime"
      value={{ options: {}, attributes: {} }}
      onChange={jest.fn()}
    /></LanguageProvider>);

    const showButton = screen.getByRole('button', { name: 'Afficher les options (13)' });
    expect(showButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('show_time')).not.toBeInTheDocument();

    fireEvent.click(showButton);
    expect(screen.getByRole('button', { name: 'Masquer les options' })).toHaveAttribute('aria-expanded', 'true');
    ['show_time', 'show_seconds', 'rounding', 'min_date', 'max_date', 'warn_future', 'min_precision', 'max_precision', 'numeric', 'placeholder_field', 'start_date_field', 'end_date_field', 'always_range']
      .forEach((name) => expect(screen.getByLabelText(name)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Masquer les options' }));
    expect(screen.queryByLabelText('show_time')).not.toBeInTheDocument();
  });

  test('convertit la règle décoration-* en vrais attributs XML valides', () => {
    const onChange = jest.fn();
    render(<LanguageProvider><WidgetOptionsEditor
      widget="badge"
      fieldType="selection"
      value={{ options: {}, attributes: {} }}
      onChange={onChange}
    /></LanguageProvider>);

    fireEvent.click(screen.getByRole('button', { name: /Afficher les options/ }));
    fireEvent.change(screen.getByLabelText('decoration-*'), {
      target: { value: '{"decoration-success":"state == \'done\'"}' },
    });
    expect(onChange).toHaveBeenCalledWith({
      options: {},
      attributes: { 'decoration-success': "state == 'done'" },
    });
  });
});

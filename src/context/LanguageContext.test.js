import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider, normalizeLanguage, useLanguage } from './LanguageContext';

function LanguageProbe() {
  const { language, setTranslations, t } = useLanguage();
  return (
    <div>
      <span>{language}</span>
      <span>{t('Partenaires')}</span>
      <button type="button" onClick={() => setTranslations({ Partenaires: '合作伙伴（服务器翻译）' })}>
        override
      </button>
    </div>
  );
}

describe('support du chinois simplifié', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('user_data', JSON.stringify({ lang: 'zh_CN' }));
  });

  test('normalise les codes chinois et charge les traductions intégrées', async () => {
    expect(normalizeLanguage('zh-cn')).toBe('zh_CN');
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);

    expect(screen.getByText('zh_CN')).toBeInTheDocument();
    expect(screen.getByText('合作伙伴')).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe('zh-cn'));

    fireEvent.click(screen.getByRole('button', { name: 'override' }));
    expect(screen.getByText('合作伙伴（服务器翻译）')).toBeInTheDocument();
  });
});

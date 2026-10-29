import { buildEntityRequestPayload, entityApiErrorMessage, INITIAL_ENTITY_FORM } from './EntityShared';

describe('buildEntityRequestPayload', () => {
  test('does not send an existing logo URL as an ImageField upload', () => {
    const payload = buildEntityRequestPayload({
      ...INITIAL_ENTITY_FORM,
      raison_sociale: 'SOMANE',
      logo: 'http://localhost:8000/media/entites/logos/somane.png',
    });

    expect(payload).not.toBeInstanceOf(FormData);
    expect(payload).not.toHaveProperty('logo');
  });

  test('sends a newly selected logo as a multipart file', () => {
    const payload = buildEntityRequestPayload({
      ...INITIAL_ENTITY_FORM,
      raison_sociale: 'SOMANE',
      logo: 'data:image/png;base64,AQID',
    });

    expect(payload).toBeInstanceOf(FormData);
    const logo = payload.get('logo');
    expect(logo).toBeInstanceOf(File);
    expect(logo.name).toBe('logo.png');
    expect(logo.type).toBe('image/png');
    expect(logo.size).toBe(3);
  });

  test('shows serializer field errors returned by the API', () => {
    expect(entityApiErrorMessage({ data: { logo: ['La donnée soumise n’est pas un fichier.'] } }))
      .toBe('Logo : La donnée soumise n’est pas un fichier.');
  });
});

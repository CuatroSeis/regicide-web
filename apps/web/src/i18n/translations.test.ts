import { describe, expect, it } from 'vitest';
import { interpolate, LOCALES, translations } from './translations';
import type { TranslationKey } from './translations';

describe('translations', () => {
  const esKeys = Object.keys(translations.es).sort() as TranslationKey[];

  it('define los 3 idiomas del selector', () => {
    expect(LOCALES.map((l) => l.id)).toEqual(['es', 'en', 'pt']);
  });

  it('tiene las mismas claves en los 3 idiomas', () => {
    for (const locale of ['en', 'pt'] as const) {
      expect(Object.keys(translations[locale]).sort()).toEqual(esKeys);
    }
  });

  it('usa los mismos placeholders {param} en los 3 idiomas', () => {
    const tokens = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of esKeys) {
      const expected = tokens(translations.es[key]);
      for (const locale of ['en', 'pt'] as const) {
        expect(tokens(translations[locale][key]), `${locale}.${key}`).toEqual(expected);
      }
    }
  });

  it('interpola {param} con interpolate', () => {
    expect(interpolate('Turno de {name}', { name: 'Ana' })).toBe('Turno de Ana');
    expect(interpolate('{rank} de {suit}', { rank: 'Rey', suit: 'Picas' })).toBe('Rey de Picas');
  });

  it('no rompe interpolate si falta un param', () => {
    expect(interpolate('Semilla: {seed}', {})).toBe('Semilla: {seed}');
  });

  it('las claves de reglas con HTML conservan <strong>', () => {
    expect(translations.es.rulesStep1).toContain('<strong>');
    expect(translations.en.rulesStep1).toContain('<strong>');
    expect(translations.pt.rulesStep1).toContain('<strong>');
  });
});

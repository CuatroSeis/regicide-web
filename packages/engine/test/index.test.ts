import { describe, expect, it } from 'vitest';
import { version } from '../src/index.js';

describe('engine', () => {
  it('expone la versión del paquete', () => {
    expect(version).toBe('0.1.0');
  });
});

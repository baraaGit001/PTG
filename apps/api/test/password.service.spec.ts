import { PasswordService } from '../src/modules/auth/password.service.js';
import { ApiException } from '../src/common/errors/api.exception.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password and verifies the same plaintext against it', async () => {
    const hash = await service.hash('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    await expect(service.verify(hash, 'Sup3rSecret!')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('never throws on a malformed hash, just returns false', async () => {
    await expect(service.verify('not-a-real-hash', 'anything')).resolves.toBe(false);
  });

  it('accepts a policy-compliant password', () => {
    expect(() => service.assertPolicy('Abcdefgh123')).not.toThrow();
  });

  it('rejects a password that is too short', () => {
    expect(() => service.assertPolicy('Ab1')).toThrow(ApiException);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(() => service.assertPolicy('abcdefghij1')).toThrow(ApiException);
  });

  it('rejects a password missing a digit', () => {
    expect(() => service.assertPolicy('Abcdefghij')).toThrow(ApiException);
  });
});

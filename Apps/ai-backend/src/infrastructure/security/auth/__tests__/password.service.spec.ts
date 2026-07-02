import { PasswordService, WeakPasswordError } from '../password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('accepts a password meeting all policy requirements', () => {
    expect(() => service.validatePolicy('Str0ng!Passw0rd')).not.toThrow();
  });

  it('rejects a password that is too short', () => {
    expect(() => service.validatePolicy('Sh0rt!')).toThrow(WeakPasswordError);
  });

  it('rejects a password with no uppercase letter', () => {
    try {
      service.validatePolicy('weakpassword1!');
      fail('expected WeakPasswordError');
    } catch (error) {
      expect(error).toBeInstanceOf(WeakPasswordError);
      expect((error as WeakPasswordError).violations).toContain('at least one uppercase letter');
    }
  });

  it('rejects a password with no symbol', () => {
    try {
      service.validatePolicy('WeakPassword1');
      fail('expected WeakPasswordError');
    } catch (error) {
      expect((error as WeakPasswordError).violations).toContain('at least one symbol');
    }
  });

  it('hash/verify round-trips correctly', async () => {
    const hash = await service.hash('Str0ng!Passw0rd');
    expect(hash).not.toBe('Str0ng!Passw0rd');
    expect(await service.verify('Str0ng!Passw0rd', hash)).toBe(true);
    expect(await service.verify('WrongPassword1!', hash)).toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const hash1 = await service.hash('Str0ng!Passw0rd');
    const hash2 = await service.hash('Str0ng!Passw0rd');
    expect(hash1).not.toBe(hash2);
  });
});

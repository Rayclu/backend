import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should reject invalid credentials without crashing', async () => {
    const usersService = {
      findByEmailWithPassword: jest.fn().mockResolvedValue(null),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      findById: jest.fn(),
    };

    const jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const authService = new AuthService(
      usersService as any,
      jwtService as any,
      {} as any,
      { get: jest.fn() } as any,
    );

    await expect(
      authService.login({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

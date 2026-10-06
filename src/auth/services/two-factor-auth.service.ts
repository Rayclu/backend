import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwoFactorAuthService {
  constructor(private configService: ConfigService) {}

  generateSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = speakeasy.generateSecret({
      name: `Meetia (${email})`,
      issuer: this.configService.get('twoFA.issuer'),
      length: 20,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.configService.get('twoFA.window'),
    });
  }
}
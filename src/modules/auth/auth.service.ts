import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!; // do Google Cloud Console

// ══════════════════════════════════════════════════════════════════
// ALLOWLIST — MVP, controle manual de quem pode acessar
// Adicione/remova e-mails aqui. Case-insensitive (comparamos em lowercase).
// ══════════════════════════════════════════════════════════════════
const ALLOWED_EMAILS = new Set(
  [
    'tmrafinha4@gmail.com',
    'gabrielemoraes@remax.com.br',
    'isabellemoraes@remax.com.br',
    'acramrajab@remax.com.br',
    'nobrealmeida22@gmail.com',
    'alex.o.crocetti@gmail.com'
    // adicione mais e-mails aqui, um por linha
  ].map(e => e.toLowerCase()),
);

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

  constructor(private readonly jwt: JwtService) {}

  /**
   * Recebe o "credential" (ID token JWT) que o GIS manda pro frontend
   * depois que a pessoa escolhe a conta no popup do Google.
   */
  async loginWithGoogle(idToken: string) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Não foi possível obter o e-mail da conta');
    }

    const email = payload.email.toLowerCase();

    // ── Checagem da allowlist ──
    if (!ALLOWED_EMAILS.has(email)) {
      throw new ForbiddenException(
        'Este e-mail não tem permissão para acessar o CaptaDog. Fale com o administrador.',
      );
    }

    const user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub, // id único do Google
    };

    // Gera nossa própria sessão (JWT interno), não usamos o token do Google direto
    const accessToken = await this.jwt.signAsync(user, { expiresIn: '12h' });

    return { accessToken, user };
  }

  async validateSession(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token);

      // Revalida a allowlist a cada request — se alguém for removido
      // no meio da sessão, o acesso é cortado no próximo request.
      if (!ALLOWED_EMAILS.has((payload.email || '').toLowerCase())) {
        throw new ForbiddenException('Acesso revogado');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Sessão expirada ou inválida');
    }
  }
}
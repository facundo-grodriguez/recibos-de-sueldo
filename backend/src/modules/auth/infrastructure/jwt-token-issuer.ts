import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenIssuer } from '../domain/token-issuer';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issue(payload: { usuarioId: string; email: string }): string {
    return this.jwtService.sign({ sub: payload.usuarioId, email: payload.email });
  }
}

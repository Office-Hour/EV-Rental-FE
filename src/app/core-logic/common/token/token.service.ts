import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Token, TokenInfo } from './token.type';
import { TokenUtils } from './token.utils';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private _httpClient = inject(HttpClient);
  private _accessToken = signal<Token>({
    token: '',
    expiration: new Date(),
  });
  private _refreshToken = signal<Token>({
    token: '',
    expiration: new Date(),
  });
  private _tokenUtils = inject(TokenUtils);
  /**
   * Getter & Setter for access token
   */
  get accessToken(): Token {
    return this._accessToken();
  }
  set accessToken(accessToken: Token) {
    this._accessToken.set(accessToken);
  }

  /**
   * Getter & Setter for refresh token
   */
  get refreshToken(): Token {
    return this._refreshToken();
  }
  set refreshToken(refreshToken: Token) {
    this._refreshToken.set(refreshToken);
  }

  /**
   * Is access token expiration?
   *
   * @param offsetSeconds
   */
  isAccessTokenExpiration(offsetSeconds?: number): boolean {
    // Return if there is no token
    if (!this.accessToken.token) {
      return true;
    }

    // Get the expiration date
    const expirationDate = this.accessToken.expiration;

    offsetSeconds = offsetSeconds || 0;

    if (expirationDate.getTime() === new Date().getTime()) {
      return false;
    }

    // Check if the token is expiration
    return expirationDate.getTime() < new Date().getTime() + offsetSeconds * 1000;
  }

  /**
   * Is refresh token expiration?
   *
   * @param offsetSeconds
   */
  isRefreshTokenExpiration(offsetSeconds?: number): boolean {
    // Return if there is no token
    if (!this.refreshToken.token) {
      return true;
    }

    // Get the expiration date
    const expirationDate = this.refreshToken.expiration;

    offsetSeconds = offsetSeconds || 0;

    if (expirationDate.getTime() === new Date().getTime()) {
      return false;
    }

    // Check if the token is expiration
    return expirationDate.getTime() < new Date().getTime() + offsetSeconds * 1000;
  }

  /**
   * Clear the access token
   */
  clearAccessToken(): void {
    this._accessToken.set({
      token: '',
      expiration: new Date(),
    });
  }

  /**
   * Clear the refresh token
   */
  clearRefreshToken(): void {
    this._refreshToken.set({
      token: '',
      expiration: new Date(),
    });
  }

  /**
   * Clear all tokens
   */
  clearAllTokens(): void {
    this.clearAccessToken();
    this.clearRefreshToken();
  }

  /**
   * Decode the  token
   */
  decodeToken(token: string): TokenInfo {
    return this._tokenUtils.getTokenInfo(token);
  }
}

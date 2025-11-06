import { inject, Injectable, signal } from '@angular/core';
import { Token, TokenInfo } from './token.type';
import { TokenUtils } from './token.utils';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly _accessTokenStorageKey = 'voltera.access-token';
  private readonly _refreshTokenStorageKey = 'voltera.refresh-token';
  private _accessToken = signal<Token>({
    token: '',
    expiration: new Date(),
  });
  private _refreshToken = signal<Token>({
    token: '',
    expiration: new Date(),
  });
  private _tokenUtils = inject(TokenUtils);

  constructor() {
    this._hydrateFromStorage();
  }
  /**
   * Getter & Setter for access token
   */
  get accessToken(): Token {
    return this._accessToken();
  }
  set accessToken(accessToken: Token) {
    this._accessToken.set(accessToken);
    this._persistToken(this._accessTokenStorageKey, accessToken);
  }

  /**
   * Getter & Setter for refresh token
   */
  get refreshToken(): Token {
    return this._refreshToken();
  }
  set refreshToken(refreshToken: Token) {
    this._refreshToken.set(refreshToken);
    this._persistToken(this._refreshTokenStorageKey, refreshToken);
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
    this._removeStoredToken(this._accessTokenStorageKey);
  }

  /**
   * Clear the refresh token
   */
  clearRefreshToken(): void {
    this._refreshToken.set({
      token: '',
      expiration: new Date(),
    });
    this._removeStoredToken(this._refreshTokenStorageKey);
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

  private _hydrateFromStorage(): void {
    const accessToken = this._readToken(this._accessTokenStorageKey);
    if (accessToken) {
      this._accessToken.set(accessToken);
    }

    const refreshToken = this._readToken(this._refreshTokenStorageKey);
    if (refreshToken) {
      this._refreshToken.set(refreshToken);
    }
  }

  private _readToken(storageKey: string): Token | undefined {
    if (!this._canUseStorage()) {
      return undefined;
    }

    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return undefined;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as { token?: string; expiration?: string };
      if (!parsedValue.token) {
        return undefined;
      }

      const expiration = parsedValue.expiration ? new Date(parsedValue.expiration) : new Date();
      if (Number.isNaN(expiration.getTime())) {
        return { token: parsedValue.token, expiration: new Date() };
      }

      return {
        token: parsedValue.token,
        expiration,
      };
    } catch {
      return undefined;
    }
  }

  private _persistToken(storageKey: string, token: Token): void {
    if (!this._canUseStorage()) {
      return;
    }

    if (!token.token) {
      this._removeStoredToken(storageKey);
      return;
    }

    const expirationIso =
      token.expiration instanceof Date && !Number.isNaN(token.expiration.getTime())
        ? token.expiration.toISOString()
        : undefined;

    const payload = JSON.stringify({
      token: token.token,
      expiration: expirationIso,
    });

    window.localStorage.setItem(storageKey, payload);
  }

  private _removeStoredToken(storageKey: string): void {
    if (!this._canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(storageKey);
  }

  private _canUseStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }
}

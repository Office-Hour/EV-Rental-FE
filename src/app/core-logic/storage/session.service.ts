import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  /**
   * Store a plain string value
   */
  setItem(key: string, value: string): void {
    const storage = this.resolveStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Get a plain string value
   */
  getItem(key: string): string | null {
    const storage = this.resolveStorage();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Remove an item
   */
  removeItem(key: string): void {
    const storage = this.resolveStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  }

  /**
   * Store a JSON-serializable value
   */
  setJson<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.setItem(key, serialized);
    } catch {
      // ignore serialization errors
    }
  }

  /**
   * Retrieve a JSON value, or null if missing/invalid
   */
  getJson<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private resolveStorage(): Storage | null {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      return null;
    }
  }
}

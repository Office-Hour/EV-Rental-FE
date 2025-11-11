import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarHorizontalPosition,
  MatSnackBarRef,
  MatSnackBarVerticalPosition,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  action?: string;
  duration?: number;
  horizontalPosition?: MatSnackBarHorizontalPosition;
  verticalPosition?: MatSnackBarVerticalPosition;
  panelClass?: string | string[];
}

export interface ToastOpenConfig extends ToastConfig {
  kind?: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _basePanelClass = 'app-toast-container';

  open(message: string, config?: ToastOpenConfig): MatSnackBarRef<TextOnlySnackBar> {
    const normalizedMessage = this._normalizeMessage(message);
    const toastKind = config?.kind ?? 'info';

    const panelClass = this._resolvePanelClasses(toastKind, config?.panelClass);

    const snackBarConfig: MatSnackBarConfig = {
      duration: this._resolveDuration(config?.duration, toastKind),
      horizontalPosition: config?.horizontalPosition ?? 'center',
      verticalPosition: config?.verticalPosition ?? 'top',
      politeness: toastKind === 'error' ? 'assertive' : 'polite',
      ...config,
      panelClass,
    } satisfies MatSnackBarConfig;

    const action = config?.action?.trim();

    return this._snackBar.open(normalizedMessage, action || undefined, snackBarConfig);
  }

  success(message: string, config?: ToastConfig): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, { ...config, kind: 'success' });
  }

  error(message: string, config?: ToastConfig): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, { ...config, kind: 'error' });
  }

  info(message: string, config?: ToastConfig): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, { ...config, kind: 'info' });
  }

  warning(message: string, config?: ToastConfig): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, { ...config, kind: 'warning' });
  }

  dismiss(): void {
    this._snackBar.dismiss();
  }

  private _normalizeMessage(message: string): string {
    const fallback = 'Something happened';
    if (!message) {
      return fallback;
    }

    const trimmed = message.toString().trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private _resolveDuration(duration: number | undefined, kind: ToastKind): number {
    if (typeof duration === 'number') {
      return duration;
    }

    switch (kind) {
      case 'error':
        return 6000;
      case 'warning':
        return 5500;
      default:
        return 5000;
    }
  }

  private _resolvePanelClasses(
    kind: ToastKind,
    panelClass: string | string[] | undefined,
  ): string[] {
    const classes = [this._basePanelClass, `${this._basePanelClass}--${kind}`];

    if (!panelClass) {
      return classes;
    }

    return Array.isArray(panelClass) ? [...classes, ...panelClass] : [...classes, panelClass];
  }
}

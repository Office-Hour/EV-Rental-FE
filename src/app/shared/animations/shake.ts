import { AnimationCurves, AnimationDurations } from './dafaults';

// -----------------------------------------------------------------------------------------------------
// @ Shake animation using Angular 20's built-in animate API
// -----------------------------------------------------------------------------------------------------

/**
 * Modern shake animation using Angular 20's built-in animate API
 *
 * Usage:
 * ```html
 * @if (shouldShake()) {
 *   <div animate.enter="shake">
 *     Content here
 *   </div>
 * }
 * ```
 */

// Shake animation
export const shakeClasses = {
  enter: 'shake',
};

// CSS styles for shake animation
export const shakeStyles = `
  .shake {
    animation: shake ${AnimationDurations.entering} ${AnimationCurves.deceleration};
  }

  @keyframes shake {
    0%, 100% { transform: translate3d(0, 0, 0); }
    10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); }
    20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); }
  }
`;

// Legacy export for backward compatibility
export const shake = shakeClasses;

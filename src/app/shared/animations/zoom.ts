import { AnimationCurves, AnimationDurations } from './dafaults';

// -----------------------------------------------------------------------------------------------------
// @ Zoom animations using Angular 20's built-in animate API
// -----------------------------------------------------------------------------------------------------

/**
 * Modern zoom animations using Angular 20's built-in animate API
 *
 * Usage:
 * ```html
 * @if (isVisible()) {
 *   <div animate.enter="zoomIn" animate.leave="zoomOut">
 *     Content here
 *   </div>
 * }
 * ```
 */

// Zoom In
export const zoomInClasses = {
  enter: 'zoomIn',
  leave: 'zoomOut',
};

// CSS styles for zoom animations
export const zoomStyles = `
  /* Zoom In */
  .zoomIn {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration}, 
                transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
    transform: scale(1);
  }

  .zoomOut {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration}, 
                transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
    transform: scale(0.5);
  }

  @starting-style .zoomIn {
    opacity: 0;
    transform: scale(0.5);
  }
`;

// Legacy exports for backward compatibility
export const zoomIn = zoomInClasses;
export const zoomOut = zoomInClasses;

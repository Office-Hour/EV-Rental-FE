import { AnimationCurves, AnimationDurations } from './dafaults';

// -----------------------------------------------------------------------------------------------------
// @ Fade animations using Angular 20's built-in animate API
// -----------------------------------------------------------------------------------------------------

/**
 * Modern fade animations using Angular 20's built-in animate API
 *
 * Usage:
 * ```html
 * @if (isVisible()) {
 *   <div animate.enter="fadeIn" animate.leave="fadeOut">
 *     Content here
 *   </div>
 * }
 * ```
 */

// Fade In
export const fadeInClasses = {
  enter: 'fadeIn',
  leave: 'fadeOut',
};

// Fade In Top
export const fadeInTopClasses = {
  enter: 'fadeInTop',
  leave: 'fadeOutTop',
};

// Fade In Bottom
export const fadeInBottomClasses = {
  enter: 'fadeInBottom',
  leave: 'fadeOutBottom',
};

// Fade In Left
export const fadeInLeftClasses = {
  enter: 'fadeInLeft',
  leave: 'fadeOutLeft',
};

// Fade In Right
export const fadeInRightClasses = {
  enter: 'fadeInRight',
  leave: 'fadeOutRight',
};

// CSS styles for all fade animations
export const fadeStyles = `
  /* Fade In */
  .fadeIn {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
  }

  .fadeOut {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
  }

  @starting-style .fadeIn {
    opacity: 0;
  }

  /* Fade In Top */
  .fadeInTop {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration}, 
                transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .fadeOutTop {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration}, 
                transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
    transform: translate3d(0, -100%, 0);
  }

  @starting-style .fadeInTop {
    opacity: 0;
    transform: translate3d(0, -100%, 0);
  }

  /* Fade In Bottom */
  .fadeInBottom {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration}, 
                transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .fadeOutBottom {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration}, 
                transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
    transform: translate3d(0, 100%, 0);
  }

  @starting-style .fadeInBottom {
    opacity: 0;
    transform: translate3d(0, 100%, 0);
  }

  /* Fade In Left */
  .fadeInLeft {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration}, 
                transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .fadeOutLeft {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration}, 
                transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
    transform: translate3d(-100%, 0, 0);
  }

  @starting-style .fadeInLeft {
    opacity: 0;
    transform: translate3d(-100%, 0, 0);
  }

  /* Fade In Right */
  .fadeInRight {
    transition: opacity ${AnimationDurations.entering} ${AnimationCurves.deceleration}, 
                transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .fadeOutRight {
    transition: opacity ${AnimationDurations.exiting} ${AnimationCurves.acceleration}, 
                transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    opacity: 0;
    transform: translate3d(100%, 0, 0);
  }

  @starting-style .fadeInRight {
    opacity: 0;
    transform: translate3d(100%, 0, 0);
  }
`;

// Legacy exports for backward compatibility
export const fadeIn = fadeInClasses;
export const fadeInTop = fadeInTopClasses;
export const fadeInBottom = fadeInBottomClasses;
export const fadeInLeft = fadeInLeftClasses;
export const fadeInRight = fadeInRightClasses;
export const fadeOut = fadeInClasses;
export const fadeOutTop = fadeInTopClasses;
export const fadeOutBottom = fadeInBottomClasses;
export const fadeOutLeft = fadeInLeftClasses;
export const fadeOutRight = fadeInRightClasses;

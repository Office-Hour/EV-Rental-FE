import { AnimationCurves, AnimationDurations } from './dafaults';

// -----------------------------------------------------------------------------------------------------
// @ Slide animations using Angular 20's built-in animate API
// -----------------------------------------------------------------------------------------------------

/**
 * Modern slide animations using Angular 20's built-in animate API
 *
 * Usage:
 * ```html
 * @if (isVisible()) {
 *   <div animate.enter="slideInTop" animate.leave="slideOutTop">
 *     Content here
 *   </div>
 * }
 * ```
 */

// Slide In Top
export const slideInTopClasses = {
  enter: 'slideInTop',
  leave: 'slideOutTop',
};

// Slide In Bottom
export const slideInBottomClasses = {
  enter: 'slideInBottom',
  leave: 'slideOutBottom',
};

// Slide In Left
export const slideInLeftClasses = {
  enter: 'slideInLeft',
  leave: 'slideOutLeft',
};

// Slide In Right
export const slideInRightClasses = {
  enter: 'slideInRight',
  leave: 'slideOutRight',
};

// CSS styles for all slide animations
export const slideStyles = `
  /* Slide In Top */
  .slideInTop {
    transition: transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    transform: translate3d(0, 0, 0);
  }

  .slideOutTop {
    transition: transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    transform: translate3d(0, -100%, 0);
  }

  @starting-style .slideInTop {
    transform: translate3d(0, -100%, 0);
  }

  /* Slide In Bottom */
  .slideInBottom {
    transition: transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    transform: translate3d(0, 0, 0);
  }

  .slideOutBottom {
    transition: transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    transform: translate3d(0, 100%, 0);
  }

  @starting-style .slideInBottom {
    transform: translate3d(0, 100%, 0);
  }

  /* Slide In Left */
  .slideInLeft {
    transition: transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    transform: translate3d(0, 0, 0);
  }

  .slideOutLeft {
    transition: transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    transform: translate3d(-100%, 0, 0);
  }

  @starting-style .slideInLeft {
    transform: translate3d(-100%, 0, 0);
  }

  /* Slide In Right */
  .slideInRight {
    transition: transform ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    transform: translate3d(0, 0, 0);
  }

  .slideOutRight {
    transition: transform ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    transform: translate3d(100%, 0, 0);
  }

  @starting-style .slideInRight {
    transform: translate3d(100%, 0, 0);
  }
`;

// Legacy exports for backward compatibility
export const slideInTop = slideInTopClasses;
export const slideInBottom = slideInBottomClasses;
export const slideInLeft = slideInLeftClasses;
export const slideInRight = slideInRightClasses;
export const slideOutTop = slideInTopClasses;
export const slideOutBottom = slideInBottomClasses;
export const slideOutLeft = slideInLeftClasses;
export const slideOutRight = slideInRightClasses;

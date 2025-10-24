import { AnimationCurves, AnimationDurations } from './dafaults';

// -----------------------------------------------------------------------------------------------------
// @ Expand / collapse animation classes
// -----------------------------------------------------------------------------------------------------

/**
 * Modern expand/collapse animation using Angular 20's built-in animate API
 *
 * Usage:
 * ```html
 * @if (isExpanded()) {
 *   <div animate.enter="expand" animate.leave="collapse">
 *     Content here
 *   </div>
 * }
 * ```
 */
export const expandCollapseClasses = {
  enter: 'expand',
  leave: 'collapse',
};

// CSS classes to be used with animate.enter and animate.leave
export const expandCollapseStyles = `
  .expand {
    transition: height ${AnimationDurations.entering} ${AnimationCurves.deceleration};
    height: auto;
    overflow: visible;
  }

  .collapse {
    transition: height ${AnimationDurations.exiting} ${AnimationCurves.acceleration};
    height: 0;
    overflow: hidden;
  }

  @starting-style .expand {
    height: 0;
    overflow: hidden;
  }
`;

export { expandCollapseClasses as expandCollapse };

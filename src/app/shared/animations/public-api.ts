// Modern Angular 20 animation exports using built-in animate API
import { expandCollapse, expandCollapseStyles } from './expand-collapse';
import {
  fadeIn,
  fadeInTop,
  fadeInBottom,
  fadeInLeft,
  fadeInRight,
  fadeOut,
  fadeOutTop,
  fadeOutBottom,
  fadeOutLeft,
  fadeOutRight,
  fadeStyles,
} from './fade';
import { shake, shakeStyles } from './shake';
import {
  slideInTop,
  slideInBottom,
  slideInLeft,
  slideInRight,
  slideOutTop,
  slideOutBottom,
  slideOutLeft,
  slideOutRight,
  slideStyles,
} from './slide';
import { zoomIn, zoomOut, zoomStyles } from './zoom';

// Re-export all animations
export { expandCollapse, expandCollapseStyles };
export {
  fadeIn,
  fadeInTop,
  fadeInBottom,
  fadeInLeft,
  fadeInRight,
  fadeOut,
  fadeOutTop,
  fadeOutBottom,
  fadeOutLeft,
  fadeOutRight,
  fadeStyles,
};
export { shake, shakeStyles };
export {
  slideInTop,
  slideInBottom,
  slideInLeft,
  slideInRight,
  slideOutTop,
  slideOutBottom,
  slideOutLeft,
  slideOutRight,
  slideStyles,
};
export { zoomIn, zoomOut, zoomStyles };

// Combined styles for easy import
export const allAnimationStyles = `
  /* Import all animation styles */
  ${expandCollapseStyles}
  ${fadeStyles}
  ${shakeStyles}
  ${slideStyles}
  ${zoomStyles}
`;

// Legacy animation array for backward compatibility
export const sharedAnimations = [
  expandCollapse,
  fadeIn,
  fadeInTop,
  fadeInBottom,
  fadeInLeft,
  fadeInRight,
  fadeOut,
  fadeOutTop,
  fadeOutBottom,
  fadeOutLeft,
  fadeOutRight,
  shake,
  slideInTop,
  slideInBottom,
  slideInLeft,
  slideInRight,
  slideOutTop,
  slideOutBottom,
  slideOutLeft,
  slideOutRight,
  zoomIn,
  zoomOut,
];

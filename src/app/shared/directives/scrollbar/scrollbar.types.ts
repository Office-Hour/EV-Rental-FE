/**
 * Modern TypeScript interfaces for scrollbar functionality
 */

// PerfectScrollbar type declaration
declare namespace PerfectScrollbar {
  interface Options {
    wheelSpeed?: number;
    wheelPropagation?: boolean;
    swipeEasing?: boolean;
    minScrollbarLength?: number;
    maxScrollbarLength?: number;
    scrollingThreshold?: number;
    useBothWheelAxes?: boolean;
    suppressScrollX?: boolean;
    suppressScrollY?: boolean;
    scrollXMarginOffset?: number;
    scrollYMarginOffset?: number;
    handlers?: string[];
    textarea?: HTMLElement;
    emulatedTouch?: boolean;
    scrollbar?: {
      class?: string;
      style?: string;
    };
    rail?: {
      class?: string;
      style?: string;
    };
    theme?: string;
  }

  interface Geometry {
    x: number;
    y: number;
    w: number;
    h: number;
    isRtl: boolean;
    isBottomVisible: boolean;
    isRightVisible: boolean;
    contentWidth: number;
    contentHeight: number;
  }

  interface Position {
    x: number;
    y: number;
  }
}

export interface ScrollbarGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScrollbarPosition {
  x: number | 'start' | 'end';
  y: number | 'start' | 'end';
}

export interface ScrollbarConfig {
  enabled: boolean;
  options: PerfectScrollbar.Options;
}

export interface ScrollbarState {
  isInitialized: boolean;
  isVisible: boolean;
  geometry: ScrollbarGeometry | null;
  position: ScrollbarPosition | null;
}

/**
 * Modern scrollbar geometry class with better type safety
 */
export class ScrollbarGeometryImpl implements ScrollbarGeometry {
  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number,
  ) {}

  /**
   * Create from Perfect Scrollbar geometry
   */
  static fromPerfectScrollbar(geometry: any): ScrollbarGeometryImpl {
    return new ScrollbarGeometryImpl(
      geometry.x || 0,
      geometry.y || 0,
      geometry.w || 0,
      geometry.h || 0,
    );
  }

  /**
   * Check if geometry is valid
   */
  isValid(): boolean {
    return this.w > 0 && this.h > 0;
  }

  /**
   * Get aspect ratio
   */
  getAspectRatio(): number {
    return this.w / this.h;
  }
}

/**
 * Modern scrollbar position class with better type safety
 */
export class ScrollbarPositionImpl implements ScrollbarPosition {
  constructor(
    public x: number | 'start' | 'end',
    public y: number | 'start' | 'end',
  ) {}

  /**
   * Create from Perfect Scrollbar position
   */
  static fromPerfectScrollbar(position: any): ScrollbarPositionImpl {
    return new ScrollbarPositionImpl(position.x || 0, position.y || 0);
  }

  /**
   * Check if position is at start
   */
  isAtStart(): boolean {
    return this.x === 'start' || this.x === 0;
  }

  /**
   * Check if position is at end
   */
  isAtEnd(): boolean {
    return this.x === 'end';
  }
}

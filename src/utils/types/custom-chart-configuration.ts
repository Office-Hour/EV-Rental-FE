import { ChartConfiguration, ChartOptions, ChartType, DefaultDataPoint } from 'chart.js';

export interface VerticalHoverLineOptions {
  color?: string;
}

export interface HoverSegmentOptions {
  color?: string;
  indexAxis?: 'x' | 'y';
}

type PluginsOf<TType extends ChartType> =
  ChartOptions<TType> extends { plugins?: infer P } ? NonNullable<P> : never;

export type CustomPluginOptionsByType<TType extends ChartType> = PluginsOf<TType> & {
  verticalHoverLine?: VerticalHoverLineOptions;
  hoverSegment?: HoverSegmentOptions;
};

export type CustomChartOptions<TType extends ChartType = ChartType> = Omit<
  ChartOptions<TType>,
  'plugins'
> & {
  plugins?: CustomPluginOptionsByType<TType>;
};

export type CustomChartConfiguration<
  TType extends ChartType = ChartType,
  TData = DefaultDataPoint<TType>,
  TLabel = unknown,
> = Omit<ChartConfiguration<TType, TData, TLabel>, 'options'> & {
  options?: CustomChartOptions<TType>;
};

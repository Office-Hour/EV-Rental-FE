import { Chart, ChartType, Plugin } from 'chart.js';
import { VerticalHoverLineOptions, HoverSegmentOptions } from '../types/custom-chart-configuration';

export const verticalHoverLinePlugin: Plugin<ChartType, VerticalHoverLineOptions> = {
  id: 'verticalHoverLine',
  beforeDatasetsDraw: (chart: Chart, _args: { cancelable: true }, options) => {
    const {
      ctx,
      chartArea: { top, bottom },
    } = chart;
    ctx.save();

    const data = chart.getDatasetMeta(0).data;

    data.forEach((item) => {
      if (item.active) {
        ctx.beginPath();
        ctx.strokeStyle = options.color ?? '#66666650';
        ctx.moveTo(item.x, top);
        ctx.lineTo(item.x, bottom);
        ctx.stroke();
      }
    });
  },
};

let hoverValue: number | undefined;

export const hoverSegmentPlugin: Plugin<ChartType, HoverSegmentOptions> = {
  id: 'hoverSegment',
  beforeDatasetsDraw(chart, _args, options) {
    const {
      ctx,
      chartArea: { top, width, height, left },
      scales: { x, y },
    } = chart;
    ctx.save();

    const segment = options.indexAxis === 'x' ? width / (x.max + 1) : height / (y.max + 1);

    ctx.fillStyle = options.color ?? '#66666650';

    if (hoverValue !== undefined) {
      if (options.indexAxis === 'x') {
        ctx.fillRect(x.getPixelForValue(hoverValue) - segment / 2, top, segment, height);
      } else {
        ctx.fillRect(left, y.getPixelForValue(hoverValue) - segment / 2, width, segment);
      }
    }
  },
  afterEvent(chart, args, options) {
    const { x, y } = chart.scales;

    if (args.inChartArea) {
      if (options.indexAxis === 'x' && args.event.x !== null) {
        hoverValue = x.getValueForPixel(args.event.x);
      } else if (options.indexAxis === 'y' && args.event.y !== null) {
        hoverValue = y.getValueForPixel(args.event.y);
      }
    } else {
      hoverValue = undefined;
    }
    args.changed = true;
  },
};

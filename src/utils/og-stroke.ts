/**
 * 手绘线条的两个原语（等宽直线看着太机械，卡片上的线条都带手抖与笔压）：
 *
 * - `handStroke`：等宽折线 + 法线方向的手抖（短笔触：光芒线、箭头）；
 * - `brushStroke`：带粗细变化的填充路径（长笔触：下划线、箭杆），落笔重、收笔轻，
 *   可给 1 个（二次）或 2 个（三次）控制点画弧；
 *
 * 抖动用确定性伪随机（mulberry32）：同一个 seed 每次构建产出完全相同的图，
 * 否则产物会在每次构建时漂移、缓存与对比都失去意义。
 */

export type Point = readonly [number, number];

export interface HandOptions {
  /** 抖动种子：同一处装饰不要复用 */
  readonly seed?: number;
  /** 抖动幅度（px），沿法线方向 */
  readonly amp?: number;
  /** 折线段数：越多越像手抖，越少越像直线 */
  readonly segments?: number;
}

export interface BrushOptions {
  readonly seed?: number;
  /** 最大线宽（px）；两端按落笔压力收细 */
  readonly width?: number;
  /** 中段垂直偏移（px），正负决定弓向哪边 */
  readonly sag?: number;
  /** 低频手抖幅度（px） */
  readonly wobble?: number;
  /** 收笔比例：0 等宽，0.5 两端各细一半 */
  readonly taper?: number;
  /** 控制点：1 个 → 二次贝塞尔；2 个 → 三次贝塞尔；不给就是直线 */
  readonly controls?: readonly Point[];
}

const DEFAULT_SEED = 1;
const DEFAULT_HAND_AMP = 1.6;
const DEFAULT_HAND_SEGMENTS = 3;
/** 笔触采样点数：26 段在这个尺度（线宽 2–4px、长度 ~600px）已经看不出折线 */
const BRUSH_STEPS = 26;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** SVG 坐标留两位小数就够（更长的数字只是让 SVG 变大） */
const round2 = (value: number): number => Math.round(value * 100) / 100;

const point = ([x, y]: Point): string => `${round2(x)},${round2(y)}`;

/** 等宽手绘线：两端点固定，中段沿法线抖动 */
export function handStroke(from: Point, to: Point, options: HandOptions = {}): string {
  const { seed = DEFAULT_SEED, amp = DEFAULT_HAND_AMP, segments = DEFAULT_HAND_SEGMENTS } = options;
  const random = mulberry32(seed);
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0) || 1;
  const normal: Point = [-(y1 - y0) / length, (x1 - x0) / length];
  const points: string[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const jitter = index === 0 || index === segments ? 0 : (random() - 0.5) * 2 * amp;
    points.push(point([x0 + (x1 - x0) * t + normal[0] * jitter, y0 + (y1 - y0) * t + normal[1] * jitter]));
  }
  return `M ${points.join(" L ")}`;
}

/**
 * 手绘笔触：把线画成一条闭合填充路径。
 * 中心线 = 直线 / 二次 / 三次贝塞尔 + 低频正弦手抖，线宽沿长度按落笔压力收放。
 */
export function brushStroke(from: Point, to: Point, options: BrushOptions = {}): string {
  const { seed = DEFAULT_SEED, width = 2.6, sag = 0, wobble = 0.9, taper = 0.5, controls = [] } = options;
  const center = curvePoints(from, controls, to);
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0) || 1;
  const normal: Point = [-(y1 - y0) / length, (x1 - x0) / length];
  const random = mulberry32(seed);
  const phase = [random() * Math.PI * 2, random() * Math.PI * 2];
  const widened = center.map(([x, y], index) => {
    const t = index / (center.length - 1);
    const offset =
      sag * Math.sin(Math.PI * t) +
      wobble * Math.sin(Math.PI * 2 * t + phase[0]) +
      wobble * 0.45 * Math.sin(Math.PI * 5 * t + phase[1]);
    const half = (width / 2) * (1 - taper * Math.abs(2 * t - 1) ** 1.4);
    return {
      left: point([x + normal[0] * (offset + half), y + normal[1] * (offset + half)]),
      right: point([x + normal[0] * (offset - half), y + normal[1] * (offset - half)]),
    };
  });
  const outline = [...widened.map((item) => item.left), ...widened.map((item) => item.right).reverse()];
  return `M ${outline.join(" L ")} Z`;
}

function linePoints(from: Point, to: Point): Point[] {
  const [x0, y0] = from;
  const [x1, y1] = to;
  return Array.from({ length: BRUSH_STEPS + 1 }, (_, index) => {
    const t = index / BRUSH_STEPS;
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as Point;
  });
}

/**
 * 曲线采样（够密的折线 + 上面的手抖 = 手画的弧）：
 * 没有控制点 → 直线；1 个 → 二次贝塞尔（圆滑的弧）；2 个 → 三次贝塞尔（能画出一段竖直再拐弯的钩）。
 */
function curvePoints(from: Point, controls: readonly Point[], to: Point): Point[] {
  if (controls.length === 0) return linePoints(from, to);
  if (controls.length === 1) return quadraticPoints(from, controls[0], to);
  if (controls.length === 2) return cubicPoints(from, controls[0], controls[1], to);
  throw new Error(`brushStroke 最多两个控制点，收到 ${controls.length} 个`);
}

function quadraticPoints(from: Point, control: Point, to: Point): Point[] {
  const [x0, y0] = from;
  const [cx, cy] = control;
  const [x1, y1] = to;
  return sample(BRUSH_STEPS, (t) => {
    const inverse = 1 - t;
    return [
      inverse * inverse * x0 + 2 * inverse * t * cx + t * t * x1,
      inverse * inverse * y0 + 2 * inverse * t * cy + t * t * y1,
    ];
  });
}

function cubicPoints(from: Point, first: Point, second: Point, to: Point): Point[] {
  const [x0, y0] = from;
  const [x1, y1] = first;
  const [x2, y2] = second;
  const [x3, y3] = to;
  return sample(BRUSH_STEPS, (t) => {
    const inverse = 1 - t;
    const a = inverse ** 3;
    const b = 3 * inverse * inverse * t;
    const c = 3 * inverse * t * t;
    const d = t ** 3;
    return [a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3];
  });
}

function sample(steps: number, at: (t: number) => Point): Point[] {
  return Array.from({ length: steps + 1 }, (_, index) => at(index / steps));
}

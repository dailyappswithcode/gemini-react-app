export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TranslationItem {
  originalText: string;
  translatedText: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface ViewState {
  scale: number;
  x: number;
  y: number;
}

export enum AppState {
  IDLE,
  CAMERA,
  PROCESSING,
  VIEWING,
  ERROR
}

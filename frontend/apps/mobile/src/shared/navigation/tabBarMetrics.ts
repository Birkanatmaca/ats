export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_FLOAT_GAP = 12;
export const TAB_BAR_HORIZONTAL_INSET = 16;
export const TAB_BAR_CENTER_CIRCLE = 76;
export const TAB_BAR_CENTER_SLOT = 88;
/** Yuvarlağın bar üstünden dışarı taşan kısmı (container yüksekliğine eklenmez) */
export const TAB_BAR_CENTER_OVERHANG = TAB_BAR_CENTER_CIRCLE / 2 - 2;

/** İçerik için tab bar üstünde bırakılacak boşluk */
export function tabBarClearance(safeBottom = 0): number {
  return safeBottom + TAB_BAR_FLOAT_GAP + TAB_BAR_HEIGHT + 8;
}

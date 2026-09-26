/**
 * BBOS 品牌标识 —— Buckyball 风格的球体 + 节点。
 *
 * 纯 SVG,无依赖,跟随 currentColor。
 */
export const BuckyballMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="BBOS"
  >
    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="6" fill="currentColor" />
    <circle cx="16" cy="6" r="2" fill="currentColor" />
    <circle cx="16" cy="26" r="2" fill="currentColor" />
    <circle cx="6" cy="16" r="2" fill="currentColor" />
    <circle cx="26" cy="16" r="2" fill="currentColor" />
  </svg>
);

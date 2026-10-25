import './BrandLogo.css';

export function BrandLogo({ className = '', iconOnly = false, light = false }) {
  return (
    <svg
      className={`brand-logo${light ? ' brand-logo-light' : ''} ${className}`}
      viewBox={iconOnly ? '160 180 500 366' : '160 180 1852 366'}
      width={iconOnly ? 41 : 152}
      height="30"
      role="img"
      aria-label="CartNest"
      focusable="false"
    >
      <image href="/branding/cartnest-logo.png" width="2172" height="724" />
    </svg>
  );
}

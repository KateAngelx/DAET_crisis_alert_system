const LOGO_SRC = "/icons/icons.svg";

export function BrandLogo({ size = 32, className = "" }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Daet Municipal Tourism Office"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

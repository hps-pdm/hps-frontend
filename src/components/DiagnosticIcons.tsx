"use client";

type IconProps = {
  size?: number;
  color?: string;
};

export function MisalignmentIcon({ size = 32, color = "#cbd5e1" }: IconProps) {
  // Two misaligned bars
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left bar */}
      <rect
        x="16"
        y="8"
        width="8"
        height="40"
        fill={color}
        transform="rotate(-5 16 8)"
      />
      {/* Right bar */}
      <rect
        x="36"
        y="12"
        width="8"
        height="40"
        fill={color}
        transform="rotate(8 36 12)"
      />
    </svg>
  );
}

export function LoosenessIcon({ size = 32, color = "#cbd5e1" }: IconProps) {
  // Base line + tilted block
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base line */}
      <rect x="10" y="46" width="44" height="4" fill={color} />
      {/* Tilted block */}
      <rect
        x="20"
        y="20"
        width="18"
        height="22"
        fill={color}
        transform="rotate(-15 20 20)"
      />
    </svg>
  );
}

export function ImbalanceIcon({ size = 32, color = "#cbd5e1" }: IconProps) {
  // Large disk with eccentric masses
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Big circle */}
      <circle cx="32" cy="32" r="18" fill={color} />
      {/* Inner offset hole */}
      <circle cx="40" cy="32" r="6" fill="#111827" />
      
    </svg>
  );
}

export function BearingIcon({ size = 32, color = "#cbd5e1" }: IconProps) {
  // Outer race + inner race + balls
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle
        cx="32"
        cy="32"
        r="18"
        stroke={color}
        strokeWidth="4"
        fill="none"
      />
      {/* Inner ring */}
      <circle
        cx="32"
        cy="32"
        r="8"
        stroke={color}
        strokeWidth="4"
        fill="none"
      />
      {/* Balls */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 13; // radius of ball circle
        const bx = 32 + r * Math.cos(angle);
        const by = 32 + r * Math.sin(angle);
        return <circle key={i} cx={bx} cy={by} r={3} fill={color} />;
      })}
    </svg>
  );
}

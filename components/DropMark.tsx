export function DropMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="drop-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a9ec7" />
          <stop offset="60%" stopColor="#1e6091" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <radialGradient id="drop-highlight" cx="0.3" cy="0.3" r="0.4">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path
        d="M24 4 C24 4, 8 22, 8 32 A16 16 0 0 0 40 32 C40 22, 24 4, 24 4 Z"
        fill="url(#drop-grad)"
      />
      <ellipse cx="18" cy="22" rx="5" ry="7" fill="url(#drop-highlight)" />
    </svg>
  );
}

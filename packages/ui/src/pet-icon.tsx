import React from "react";

export function PetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="5.3" cy="10.1" rx="1.9" ry="2.4" transform="rotate(-24 5.3 10.1)" />
      <ellipse cx="9.8" cy="6.2" rx="1.9" ry="2.5" transform="rotate(-10 9.8 6.2)" />
      <ellipse cx="14.2" cy="6.2" rx="1.9" ry="2.5" transform="rotate(10 14.2 6.2)" />
      <ellipse cx="18.7" cy="10.1" rx="1.9" ry="2.4" transform="rotate(24 18.7 10.1)" />
      <path d="M12 11.2c-2.1 0-3.1 2-5.1 3.7-1.6 1.4-1.6 3.6 0 4.5 1.9 1 3.4-.5 5.1-.5s3.2 1.5 5.1.5c1.6-.9 1.6-3.1 0-4.5-2-1.7-3-3.7-5.1-3.7Z" />
    </svg>
  );
}

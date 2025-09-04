import type { SVGProps } from 'react';

export const SuccessTickSvg = ({ ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="80"
    height="80"
    fill="none"
    viewBox="0 0 80 80"
    {...props}
  >
    <circle
      cx="40"
      cy="40"
      r="39.5"
      fill="#2ED164"
      fillOpacity="0.3"
      stroke="#2ED164"
      opacity="0.1"
    ></circle>
    <circle
      cx="40"
      cy="40"
      r="31.5"
      fill="#2ED164"
      fillOpacity="0.3"
      stroke="#2ED164"
      opacity="0.2"
    ></circle>
    <circle
      cx="40"
      cy="40"
      r="23.5"
      fill="#2ED164"
      fillOpacity="0.3"
      stroke="#2ED164"
      opacity="0.3"
    ></circle>
    <path
      fill="#2ED164"
      d="M46.667 28.453A13.334 13.334 0 1 1 26.673 40.43L26.667 40l.006-.432a13.332 13.332 0 0 1 19.994-11.114m-1.724 7.937a1.333 1.333 0 0 0-1.76-.11l-.126.11-4.39 4.39-1.724-1.724-.126-.11a1.334 1.334 0 0 0-1.87 1.87l.11.126 2.667 2.666.125.111a1.33 1.33 0 0 0 1.635 0l.125-.11 5.334-5.334.11-.125a1.333 1.333 0 0 0-.11-1.76"
    ></path>
  </svg>
);

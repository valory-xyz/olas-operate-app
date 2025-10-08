import { SVGProps } from 'react';

export const LockSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill={props.fill ?? '#5E10A2'}
      d="M12 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4"
    ></path>
    <path
      fill={props.fill ?? '#5E10A2'}
      fillRule="evenodd"
      d="m12 2 .248.006A5 5 0 0 1 17 7v3a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3V7a5 5 0 0 1 5-5M7 12a1 1 0 0 0-1 1v6l.005.099A1 1 0 0 0 7 20h10a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm5-8a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-2.703-2.985z"
      clipRule="evenodd"
    ></path>
  </svg>
);

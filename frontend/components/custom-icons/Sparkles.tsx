import { SVGProps } from 'react';

export const SparklesSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill={props.fill ?? '#7E22CE'}
      d="M18 15a1 1 0 0 1 1 1 1 1 0 0 0 1 1 1 1 0 1 1 0 2 1 1 0 0 0-1 1 1 1 0 1 1-2 0 1 1 0 0 0-1-1 1 1 0 1 1 0-2 1 1 0 0 0 1-1 1 1 0 0 1 1-1"
    ></path>
    <path
      fill={props.fill ?? '#7E22CE'}
      fillRule="evenodd"
      d="M9 5a1 1 0 0 1 1 1 5 5 0 0 0 5 5 1 1 0 1 1 0 2 5 5 0 0 0-5 5 1 1 0 1 1-2 0 5 5 0 0 0-5-5 1 1 0 1 1 0-2 5 5 0 0 0 5-5 1 1 0 0 1 1-1m0 4.604A7 7 0 0 1 6.604 12 7 7 0 0 1 9 14.395 7 7 0 0 1 11.395 12 7 7 0 0 1 9 9.604"
      clipRule="evenodd"
    ></path>
    <path
      fill={props.fill ?? '#7E22CE'}
      d="M18 3a1 1 0 0 1 1 1 1 1 0 0 0 1 1 1 1 0 1 1 0 2 1 1 0 0 0-1 1 1 1 0 1 1-2 0 1 1 0 0 0-1-1 1 1 0 1 1 0-2l.099-.005A1 1 0 0 0 17 4a1 1 0 0 1 1-1"
    ></path>
  </svg>
);

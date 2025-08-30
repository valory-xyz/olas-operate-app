import { SVGProps } from 'react';

export const CopySvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <g
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.2"
      clipPath="url(#clip0_5556_2495)"
    >
      <path d="M6 10c0-1.886 0-2.828.586-3.414S8.114 6 10 6h.667c1.885 0 2.828 0 3.414.586s.586 1.528.586 3.414v.667c0 1.885 0 2.828-.586 3.414s-1.529.586-3.414.586H10c-1.886 0-2.828 0-3.414-.586S6 12.552 6 10.667z"></path>
      <path d="M11.333 6c-.001-1.972-.031-2.993-.605-3.692a2.7 2.7 0 0 0-.37-.37c-.737-.605-1.833-.605-4.025-.605-2.191 0-3.287 0-4.025.605q-.203.167-.37.37c-.605.738-.605 1.833-.605 4.025s0 3.287.606 4.025q.166.203.37.37c.698.574 1.72.603 3.691.605"></path>
    </g>
    <defs>
      <clipPath id="clip0_5556_2495">
        <path fill="#fff" d="M0 0h16v16H0z"></path>
      </clipPath>
    </defs>
  </svg>
);

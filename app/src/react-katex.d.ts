declare module 'react-katex' {
  import type { ReactNode } from 'react';

  export interface MathProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
  }

  export const InlineMath: (props: MathProps) => ReactNode;
  export const BlockMath: (props: MathProps) => ReactNode;
}

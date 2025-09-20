declare module 'lucide-react-native' {
  import * as React from 'react';

  export interface LucideProps {
    color?: string;
    size?: number | string;
    strokeWidth?: number | string;
    style?: any;
  }

  export const icons: Record<string, React.ComponentType<LucideProps>>;
}


import { Typography } from 'antd';
import { CSSProperties, ReactNode } from 'react';

const { Title } = Typography;

type CardTitleProps = {
  className?: string;
  children: ReactNode;
  align?: CSSProperties['textAlign'];
};

export const CardTitle = ({
  className,
  children,
  align = 'center',
}: CardTitleProps) => (
  <Title
    level={4}
    className={className}
    style={{
      textAlign: align,
      fontSize: 20,
      fontWeight: 500,
      marginTop: 20,
      marginBottom: 24,
    }}
  >
    {children}
  </Title>
);

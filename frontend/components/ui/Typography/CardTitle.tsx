import { Typography } from 'antd';
import { ReactNode } from 'react';

const { Title } = Typography;

type CardTitleProps = {
  className?: string;
  children: ReactNode;
};

export const CardTitle = ({ className, children }: CardTitleProps) => (
  <Title
    level={4}
    className={className}
    style={{
      fontSize: 20,
      fontWeight: 500,
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 24,
    }}
  >
    {children}
  </Title>
);

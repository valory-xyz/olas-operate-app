import { Typography } from 'antd';

const { Title } = Typography;

export const Title5 = ({
  children,
  ...props
}: {
  children: React.ReactNode;
} & React.ComponentProps<typeof Title>) => {
  const { style, className, ...rest } = props;
  return (
    <Title
      className={`m-0 ${className}`}
      level={5}
      style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 500, ...style }}
      {...rest}
    >
      {children}
    </Title>
  );
};

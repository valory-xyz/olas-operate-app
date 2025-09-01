import { Typography } from 'antd';

const { Title } = Typography;

export const Title3 = ({
  children,
  ...props
}: {
  children: React.ReactNode;
} & React.ComponentProps<typeof Title>) => {
  const { style, className, ...rest } = props;
  return (
    <Title
      level={4}
      style={{ fontSize: 24, fontWeight: 500, marginTop: 12, ...style }}
      className={`${className}`}
      {...rest}
    >
      {children}
    </Title>
  );
};

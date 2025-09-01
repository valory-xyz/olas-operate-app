import { Typography } from 'antd';

const { Title } = Typography;

export const Title4 = ({ children }: { children: React.ReactNode }) => (
  <Title
    className="text-neutral-primary"
    level={4}
    style={{ fontWeight: 500, margin: '12px 0' }}
  >
    {children}
  </Title>
);

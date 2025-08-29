import { Typography } from 'antd';

const { Title } = Typography;

export const Title3 = ({ children }: { children: React.ReactNode }) => (
  <Title level={4} style={{ fontSize: 24, fontWeight: 500, marginTop: 12 }}>
    {children}
  </Title>
);

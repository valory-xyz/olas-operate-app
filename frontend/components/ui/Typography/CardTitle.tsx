import { Typography } from 'antd';

const { Title } = Typography;

export const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <Title
    level={4}
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

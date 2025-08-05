import './App.css';

import { Card, Input, Layout, Select, Space, Typography } from 'antd';
import { useRouter } from 'next/router';
import { ChangeEvent, useEffect, useState } from 'react';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

type Environment = 'STAGING' | 'PRODUCTION';

const apiKeyFromQuery = '';
const envFromQuery = 'STAGING';

export default function OuterIframe() {
  const router = useRouter();
  const [environment, setEnvironment] = useState<Environment>('STAGING');
  const [apiKey, setApiKey] = useState<string>('');

  // Initialize state from URL query parameters once router is ready
  useEffect(() => {
    if (!router.isReady) return;

    // const envFromQuery = router.query.environment as Environment;
    // const apiKeyFromQuery = router.query.apiKey as string;

    if (
      envFromQuery &&
      (envFromQuery === 'STAGING' || envFromQuery === 'PRODUCTION')
    ) {
      setEnvironment(envFromQuery);
    }

    if (apiKeyFromQuery) {
      setApiKey(apiKeyFromQuery);
    }
  }, [router.isReady, router.query]);

  const handleEnvironmentChange = (value: Environment) => {
    setEnvironment(value);
    // Update URL with new environment
    router.push(
      {
        query: {
          ...router.query,
          environment: value,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleApiChange = (e: ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    // Update URL with new API key
    router.push(
      {
        query: {
          ...router.query,
          apiKey: e.target.value,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const apiUrl =
    environment === 'STAGING'
      ? `https://transak-double-iframe-supporter.vercel.app/staging?environment=${environment}`
      : `https://transak-double-iframe-supporter.vercel.app/production?environment=${environment}`;

  const finalUrl = `${apiUrl}${apiKey ? `&apiKey=${apiKey}` : ''}`;

  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        <Card
          title="On-Ramp Configuration"
          bordered
          style={{ marginBottom: '24px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>Select Environment:</Text>
              <Select
                value={environment}
                onChange={handleEnvironmentChange}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Option value="STAGING">Staging</Option>
                <Option value="PRODUCTION">Production</Option>
              </Select>
            </div>

            <div>
              <Text>API Key:</Text>
              <Input
                placeholder="Enter API key"
                value={apiKey}
                onChange={handleApiChange}
                style={{ marginTop: '8px' }}
              />
            </div>
          </Space>
        </Card>

        <div
          style={{
            width: '100%',
            height: 'calc(100vh - 250px)',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <iframe
            style={{ width: '100%', height: '100%', border: 'none' }}
            src={finalUrl}
            allow="camera;microphone;payment"
          />
        </div>
      </Content>
    </Layout>
  );
}

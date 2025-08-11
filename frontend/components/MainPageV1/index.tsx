import { Layout } from 'antd';

import { Sidebar } from './Sidebar';

const { Content } = Layout;

export const Main = () => {
  return (
    <Layout>
      <Sidebar />
      <Content>Main page content</Content>
    </Layout>
  );
};

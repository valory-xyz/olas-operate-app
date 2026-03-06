import { Button } from 'antd';

type AgentBusyButtonProps = {
  text: string;
};

export const AgentBusyButton = ({ text }: AgentBusyButtonProps) => (
  <Button type="primary" size="large" ghost disabled loading>
    {text}
  </Button>
);

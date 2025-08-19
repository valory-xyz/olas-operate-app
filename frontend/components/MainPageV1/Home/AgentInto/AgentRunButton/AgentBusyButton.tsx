import { Button } from 'antd';

type AgentBusyButtonProps = {
  text: string;
};

export const AgentBusyButton = ({ text }: AgentBusyButtonProps) => (
  <Button type="default" size="large" ghost disabled loading>
    {text}
  </Button>
);

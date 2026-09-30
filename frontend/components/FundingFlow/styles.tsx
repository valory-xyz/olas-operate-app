import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import { ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';

const { Text } = Typography;

/** A full-width section of the flow card, separated from the next by a rule. */
export const CardRow = styled(Flex)`
  padding: 16px 24px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};

  &:last-child {
    border-bottom: none;
  }
`;

export type BannerTone = 'info' | 'progress' | 'success' | 'error';

const BANNER_COLORS: Record<BannerTone, { background: string; text: string }> =
  {
    info: { background: COLOR.PURPLE_LIGHT_2, text: COLOR.TEXT_INFO },
    progress: { background: COLOR.PURPLE_LIGHT_3, text: COLOR.PURPLE },
    success: {
      background: COLOR.BG.SUCCESS.DEFAULT,
      text: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
    },
    error: {
      background: COLOR.BG.ERROR.DEFAULT,
      text: COLOR.TEXT_COLOR.ERROR.DEFAULT,
    },
  };

const BannerRow = styled(CardRow)<{ $tone: BannerTone }>`
  background: ${({ $tone }) => BANNER_COLORS[$tone].background};
  color: ${({ $tone }) => BANNER_COLORS[$tone].text};
  justify-content: center;
  align-items: center;
  text-align: center;
`;

export const Banner = ({
  tone,
  icon,
  children,
}: {
  tone: BannerTone;
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <BannerRow $tone={tone} gap={8} vertical>
    <Flex gap={8} align="center">
      {icon}
      {children}
    </Flex>
  </BannerRow>
);

export const TokenIcon = ({
  src,
  alt,
  size = 20,
}: {
  src?: string;
  alt: string;
  size?: number;
}) => (src ? <Image src={src} alt={alt} width={size} height={size} /> : null);

/** A pill button for a chain or token choice. */
export const OptionButton = ({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    size="large"
    onClick={onClick}
    disabled={disabled}
    icon={icon ? <TokenIcon src={icon} alt={label} /> : undefined}
  >
    {label}
  </Button>
);

/** "Chain: <icon> Base [Change]" */
export const SelectionRow = ({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon?: string;
  value: string;
  onChange?: () => void;
}) => (
  <CardRow justify="space-between" align="center">
    <Flex gap={8} align="center">
      <Text className="text-neutral-tertiary">{label}:</Text>
      <TokenIcon src={icon} alt={value} />
      <Text>{value}</Text>
    </Flex>
    {onChange && (
      <Button size="small" onClick={onChange}>
        Change
      </Button>
    )}
  </CardRow>
);

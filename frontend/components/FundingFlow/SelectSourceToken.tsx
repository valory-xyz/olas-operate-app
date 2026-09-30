import { Flex, Typography } from 'antd';

import { MiddlewareChain } from '@/constants';
import { Address } from '@/types/Address';

import {
  OTHER_TOKEN,
  SELECT_TOKEN_FOOTER,
  SELECT_TOKEN_LABEL,
} from './constants';
import { CardRow, OptionButton } from './styles';
import { getTokenImage, getTokenMeta } from './utils';

const { Text } = Typography;

type SelectSourceTokenProps = {
  chain: MiddlewareChain;
  tokens: Address[];
  disabled?: boolean;
  onSelect: (token: Address) => void;
  onOther: () => void;
};

export const SelectSourceToken = ({
  chain,
  tokens,
  disabled,
  onSelect,
  onOther,
}: SelectSourceTokenProps) => (
  <>
    <CardRow vertical gap={12}>
      <Text>{SELECT_TOKEN_LABEL}</Text>
      <Flex gap={8} wrap>
        {tokens.map((token) => {
          const symbol = getTokenMeta(chain, token)?.symbol ?? token;
          return (
            <OptionButton
              key={token}
              icon={getTokenImage(symbol)}
              label={symbol}
              disabled={disabled}
              onClick={() => onSelect(token)}
            />
          );
        })}
        <OptionButton
          label={OTHER_TOKEN}
          disabled={disabled}
          onClick={onOther}
        />
      </Flex>
    </CardRow>
    <CardRow justify="center">
      <Text className="text-neutral-tertiary">{SELECT_TOKEN_FOOTER}</Text>
    </CardRow>
  </>
);

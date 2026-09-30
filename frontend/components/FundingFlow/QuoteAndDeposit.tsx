import { Button, Flex, QRCode, Skeleton, Typography } from 'antd';
import { TbCopy } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { FundingRun } from '@/types/FundingRun';
import { copyToClipboard } from '@/utils/copyToClipboard';

import {
  COPY_FAILED,
  DEPOSIT_INSTRUCTION,
  QR_CAPTION,
  QUOTE_COPY,
} from './constants';
import { FailureDetails } from './FailureDetails';
import { QuoteCountdown } from './QuoteCountdown';
import { Banner, CardRow, TokenIcon } from './styles';
import {
  formatBaseUnits,
  getChainImage,
  getChainName,
  getTokenImage,
} from './utils';

const { Text, Title } = Typography;

const AddressBox = styled(Flex)`
  border: 1px solid ${COLOR.BORDER_GRAY};
  border-radius: 8px;
  overflow: hidden;

  > * {
    padding: 6px 12px;
  }
`;

const AddressText = styled(Text)`
  flex: 1;
  min-width: 0;
  background: ${COLOR.GRAY_1};
  border-left: 1px solid ${COLOR.BORDER_GRAY};
  border-right: 1px solid ${COLOR.BORDER_GRAY};
`;

const QrBox = styled(Flex)`
  background: ${COLOR.GRAY_1};
  border-radius: 12px;
  padding: 4px;

  .ant-qrcode {
    background: ${COLOR.WHITE};
  }
`;

const GettingQuote = () => (
  <>
    <Banner tone="progress">{QUOTE_COPY.gettingQuote}</Banner>
    <CardRow vertical gap={16}>
      <Flex gap={16} align="center">
        <Skeleton.Button active size="large" />
        <Skeleton.Input active size="small" />
      </Flex>
      <Skeleton.Input active size="small" block />
    </CardRow>
  </>
);

type QuoteFailedProps = {
  onRetry: () => void;
  isRetrying: boolean;
  /** The middleware's copy for the failure; the app's is only a fallback. */
  message?: string | null;
  reason?: string;
};

const QuoteFailed = ({
  onRetry,
  isRetrying,
  message,
  reason,
}: QuoteFailedProps) => (
  <>
    <Banner tone="progress">{QUOTE_COPY.gettingQuote}</Banner>
    <CardRow>
      <FailureDetails
        title={message || QUOTE_COPY.failedTitle}
        description={message ? [] : [reason || QUOTE_COPY.failedDescription]}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    </CardRow>
  </>
);

const ReceiptBanner = ({ run }: { run: FundingRun }) => {
  const { quote, source } = run;
  if (!quote) return null;
  const received = BigInt(quote.received_amount);
  const outstanding = BigInt(quote.outstanding_amount);

  if (received === BigInt(0)) {
    return <Banner tone="info">{QUOTE_COPY.waiting}</Banner>;
  }
  if (outstanding === BigInt(0)) {
    return (
      <Banner tone="success">
        {`${formatBaseUnits(quote.received_amount, source.decimals)} ${source.symbol} received!`}
      </Banner>
    );
  }
  return (
    <Banner tone="info">
      {`${formatBaseUnits(quote.received_amount, source.decimals)} ${source.symbol} received`}
    </Banner>
  );
};

type QuoteAndDepositProps = {
  /** `null` while the first run is being created. */
  run: FundingRun | null;
  /** Creating the run failed outright, before any run existed. */
  createError: Error | null;
  onRetryCreate: () => void;
  onRefreshQuote: () => void;
  isRefreshing: boolean;
};

export const QuoteAndDeposit = ({
  run,
  createError,
  onRetryCreate,
  onRefreshQuote,
  isRefreshing,
}: QuoteAndDepositProps) => {
  const message = useMessageApi();
  const address = run?.source.deposit_address;

  const handleCopy = () => {
    if (!address) return;
    copyToClipboard(address)
      .then(() => message.success('Address copied!'))
      .catch(() => message.error(COPY_FAILED));
  };

  if (!run) {
    return createError ? (
      <QuoteFailed
        onRetry={onRetryCreate}
        isRetrying={false}
        reason={createError.message}
      />
    ) : (
      <GettingQuote />
    );
  }
  if (run.status === 'QUOTE_FAILED') {
    return (
      <QuoteFailed
        onRetry={onRefreshQuote}
        isRetrying={isRefreshing}
        message={run.quote_message}
      />
    );
  }
  // No address is ever shown without a quote.
  if (!run.quote || !address) return <GettingQuote />;

  const { source, quote } = run;
  const chainName = getChainName(source.chain);

  return (
    <>
      <ReceiptBanner run={run} />
      <CardRow vertical gap={16}>
        <Flex justify="space-between" align="center">
          <Flex gap={8} align="center">
            <TokenIcon
              src={getTokenImage(source.symbol)}
              alt={source.symbol}
              size={28}
            />
            <Title level={3} className="m-0">
              {formatBaseUnits(quote.outstanding_amount, source.decimals)}
            </Title>
            <Text className="text-lg">{source.symbol}</Text>
          </Flex>
          <QuoteCountdown
            nextRefreshAt={quote.next_refresh_at}
            onRefresh={onRefreshQuote}
            isRefreshing={isRefreshing}
          />
        </Flex>
        <Text className="text-sm text-neutral-tertiary">
          {DEPOSIT_INSTRUCTION(chainName)}
        </Text>
        <AddressBox align="center">
          <Flex gap={6} align="center">
            <TokenIcon
              src={getChainImage(source.chain)}
              alt={chainName}
              size={16}
            />
            <Text className="text-sm">{chainName}</Text>
          </Flex>
          <AddressText className="text-sm" ellipsis>
            {address}
          </AddressText>
          <Button
            type="text"
            size="small"
            icon={<TbCopy />}
            onClick={handleCopy}
          >
            Copy
          </Button>
        </AddressBox>
        <QrBox gap={16} align="center">
          <QRCode value={address} size={120} bordered={false} />
          <Flex vertical>
            {QR_CAPTION(source.symbol, chainName).map((line) => (
              <Text key={line} className="text-sm text-neutral-tertiary">
                {line}
              </Text>
            ))}
          </Flex>
        </QrBox>
      </CardRow>
    </>
  );
};

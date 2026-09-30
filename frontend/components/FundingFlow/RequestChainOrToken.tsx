import { Button, Flex, Input, Typography } from 'antd';
import { useState } from 'react';

import { MiddlewareChain } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { FundingRequestService } from '@/service/FundingRequest';

import {
  REQUEST_ACKNOWLEDGEMENT,
  REQUEST_COPY,
  REQUEST_FAILED,
  SELECT_CHAIN_FOOTER,
  SELECT_TOKEN_FOOTER,
} from './constants';
import { CardRow } from './styles';

const { Text } = Typography;

/** pearl-api rejects longer names. */
const MAX_REQUEST_LENGTH = 64;

type RequestChainOrTokenProps =
  | { kind: 'chain'; contextChain?: undefined; onDone: () => void }
  | { kind: 'token'; contextChain: MiddlewareChain; onDone: () => void };

export const RequestChainOrToken = (props: RequestChainOrTokenProps) => {
  const { kind, onDone } = props;
  const message = useMessageApi();
  const [requestedName, setRequestedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = REQUEST_COPY[kind];

  const handleSubmit = async () => {
    const name = requestedName.trim();
    if (!name) return;
    setIsSubmitting(true);
    const submissionId = crypto.randomUUID();
    const result = await FundingRequestService.submit(
      props.kind === 'chain'
        ? {
            submissionId,
            kind: 'chain',
            requestedName: name,
            contextChain: null,
          }
        : {
            submissionId,
            kind: 'token',
            requestedName: name,
            contextChain: props.contextChain,
          },
    );
    setIsSubmitting(false);
    if (!result.success) {
      message.error(REQUEST_FAILED);
      return;
    }
    message.success(REQUEST_ACKNOWLEDGEMENT);
    onDone();
  };

  return (
    <>
      <CardRow vertical gap={16}>
        <Text>{copy.description}</Text>
        <Input
          size="large"
          placeholder={copy.placeholder}
          value={requestedName}
          maxLength={MAX_REQUEST_LENGTH}
          onChange={(event) => setRequestedName(event.target.value)}
          onPressEnter={handleSubmit}
        />
        <Flex gap={8} justify="flex-end">
          <Button onClick={onDone} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!requestedName.trim()}
          >
            {copy.action}
          </Button>
        </Flex>
      </CardRow>
      <CardRow justify="center">
        <Text className="text-neutral-tertiary">
          {kind === 'chain' ? SELECT_CHAIN_FOOTER : SELECT_TOKEN_FOOTER}
        </Text>
      </CardRow>
    </>
  );
};

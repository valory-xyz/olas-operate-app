import { ReactNode } from 'react';

import {
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
  SupportedMiddlewareChain,
  UNICODE_SYMBOLS,
} from '@/constants';
import { Address } from '@/types';
import { truncateAddress } from '@/utils';

type AddressLinkProps = {
  address: Address;
  middlewareChain: SupportedMiddlewareChain;
  prefix?: ReactNode;
  hideLinkArrow?: boolean;
};

export const AddressLink = ({
  address,
  hideLinkArrow = false,
  prefix,
  middlewareChain,
}: AddressLinkProps) => {
  if (!address) return null;
  if (!middlewareChain) return null;

  return (
    <a
      target="_blank"
      href={`${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[middlewareChain]}/address/${address}`}
    >
      {prefix ? (
        <>
          &nbsp;
          {prefix}
        </>
      ) : (
        truncateAddress(address)
      )}

      {hideLinkArrow ? null : (
        <>
          &nbsp;
          {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </>
      )}
    </a>
  );
};

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
  truncate?: boolean;
};

export const AddressLink = ({
  address,
  hideLinkArrow = false,
  prefix,
  middlewareChain,
  truncate = true,
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
      ) : truncate ? (
        truncateAddress(address)
      ) : (
        address
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

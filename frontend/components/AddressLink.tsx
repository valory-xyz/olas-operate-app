import { ReactNode } from 'react';

import { SupportedMiddlewareChain } from '@/constants/chains';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import { truncateAddress } from '@/utils/truncate';

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

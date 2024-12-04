import { MiddlewareChain } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import { truncateAddress } from '@/utils/truncate';

type AddressLinkProps = { address?: Address; hideLinkArrow?: boolean };

export const AddressLink = ({
  address,
  hideLinkArrow = false,
}: AddressLinkProps) => {
  if (!address) return null;

  return (
    <a
      target="_blank"
      href={`${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChain.GNOSIS]}/address/${address}`}
    >
      {truncateAddress(address)}

      {hideLinkArrow ? null : (
        <>
          &nbsp;
          {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </>
      )}
    </a>
  );
};

import { MiddlewareChain } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
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
      href={`${EXPLORER_URL[MiddlewareChain.OPTIMISM]}/address/${address}`}
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

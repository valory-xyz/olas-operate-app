import { MiddlewareChain } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import { truncateAddress } from '@/utils/truncate';

type AddressLinkProps = {
  address?: Address;
  hideLinkArrow?: boolean;

  // TODO: mark as required once balance breakdown is updated.
  // and remove the default value
  middlewareChain?: MiddlewareChain;
};

export const AddressLink = ({
  address,
  hideLinkArrow = false,
  middlewareChain = MiddlewareChain.GNOSIS,
}: AddressLinkProps) => {
  if (!address) return null;
  if (!middlewareChain) return null;

  return (
    <a
      target="_blank"
      href={`${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[middlewareChain]}/address/${address}`}
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

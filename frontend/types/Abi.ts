import { JsonFragment } from '@ethersproject/abi';
import { Fragment } from 'ethers/lib/utils';

export type Abi = JsonFragment[] | string[] | Fragment[];

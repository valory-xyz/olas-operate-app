import type { NextApiRequest, NextApiResponse } from 'next';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coinId } = req.query as { coinId?: string };

  if (!coinId) {
    return res.status(400).json({ error: 'coinId is required' });
  }

  try {
    const params = new URLSearchParams({ ids: coinId, vs_currencies: 'usd' });
    const requestUrl = `${COINGECKO_API_BASE}/simple/price?${params.toString()}`;

    const headers: Record<string, string> = { accept: 'application/json' };
    if (COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;

    const response = await fetch(requestUrl, { method: 'GET', headers });
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream error ${response.status}` });
    }
    const data = await response.json();
    const price: number =
      typeof data?.[coinId]?.usd === 'number' ? data[coinId].usd : 0;
    return res.status(200).json({ price });
  } catch (error) {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

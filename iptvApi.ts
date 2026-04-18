import axios from 'axios';

import { buildPlayerApiUrl } from '@/src/lib/api';

type ExtraParams = Record<string, string | number | boolean | null | undefined>;

export const getIptvData = async (
  url: string,
  user: string,
  pass: string,
  action: string,
  extraParams: ExtraParams = {}
) => {
  try {
    const finalUrl = buildPlayerApiUrl(url);

    const response = await axios.get(finalUrl, {
      params: {
        username: user.trim(),
        password: pass.trim(),
        action,
        ...extraParams,
      },
      timeout: 30000,
    });

    return response.data ?? null;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.error('O tempo de resposta do servidor KingIPTV excedeu 30s.');
    } else {
      console.error('Erro na comunicacao com a API:', error.message);
    }

    return null;
  }
};

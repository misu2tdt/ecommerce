import {
  PaymentProviderAmbiguousError,
  PaymentProviderRejectedError,
} from '../provider-errors';

export abstract class MomoHttpClient {
  abstract postJson(
    url: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<unknown>;
}

export class FetchMomoHttpClient extends MomoHttpClient {
  async postJson(
    url: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PaymentProviderAmbiguousError(
        'MoMo create-payment outcome is unknown',
      );
    }

    if (!response.ok) {
      if (response.status >= 500)
        throw new PaymentProviderAmbiguousError(
          'MoMo create-payment outcome is unknown',
        );
      throw new PaymentProviderRejectedError('MoMo rejected create-payment');
    }
    try {
      return await response.json();
    } catch {
      throw new PaymentProviderAmbiguousError(
        'MoMo create-payment response was unreadable',
      );
    }
  }
}

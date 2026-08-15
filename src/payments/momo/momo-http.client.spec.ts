import {
  PaymentProviderAmbiguousError,
  PaymentProviderRejectedError,
} from '../provider-errors';
import { FetchMomoHttpClient } from './momo-http.client';

describe('FetchMomoHttpClient', () => {
  const originalFetch = global.fetch;
  const client = new FetchMomoHttpClient();

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses JSON POST without exposing response internals', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ resultCode: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      client.postJson('https://momo.test/create', { safe: true }, 30_000),
    ).resolves.toEqual({ resultCode: 0 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://momo.test/create',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ safe: true }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('treats network and server failures as ambiguous, but 4xx as rejected', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    await expect(
      client.postJson('https://momo.test/create', {}, 30_000),
    ).rejects.toBeInstanceOf(PaymentProviderAmbiguousError);

    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      client.postJson('https://momo.test/create', {}, 30_000),
    ).rejects.toBeInstanceOf(PaymentProviderAmbiguousError);

    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 400 }));
    await expect(
      client.postJson('https://momo.test/create', {}, 30_000),
    ).rejects.toBeInstanceOf(PaymentProviderRejectedError);
  });
});

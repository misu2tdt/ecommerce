import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MomoIpnDto } from './momo-ipn.dto';

describe('MomoIpnDto identifier limits', () => {
  it('accepts the current 52-character opaque order and request identifiers', async () => {
    const errors = await validate(
      plainToInstance(MomoIpnDto, validPayload('x'.repeat(52))),
    );

    expect(errors).toEqual([]);
  });

  it('rejects identifiers longer than the 64-character provider limit', async () => {
    const errors = await validate(
      plainToInstance(MomoIpnDto, validPayload('x'.repeat(65))),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['orderId', 'requestId']),
    );
  });
});

function validPayload(identifier: string) {
  return {
    partnerCode: 'test-partner',
    orderId: identifier,
    requestId: identifier,
    amount: 24990000,
    orderInfo: 'Provider payment callback',
    orderType: 'momo_wallet',
    transId: 123456,
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: 1_700_000_000_000,
    extraData: '',
    signature: '0'.repeat(64),
  };
}

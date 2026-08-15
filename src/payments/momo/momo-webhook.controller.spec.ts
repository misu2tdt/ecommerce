import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { MomoIpnService } from './momo-ipn.service';
import { MomoWebhookController } from './momo-webhook.controller';

describe('MomoWebhookController', () => {
  it('is public business delegation that responds with HTTP 204 metadata', async () => {
    const service = { process: jest.fn().mockResolvedValue(undefined) };
    const controller = new MomoWebhookController(
      service as unknown as MomoIpnService,
    );

    await expect(
      controller.receiveIpn({} as Parameters<typeof controller.receiveIpn>[0]),
    ).resolves.toBeUndefined();
    expect(service.process).toHaveBeenCalledTimes(1);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        MomoWebhookController.prototype.receiveIpn,
      ),
    ).toBe(204);
  });
});

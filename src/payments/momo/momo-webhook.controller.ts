import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import { MomoIpnService } from './momo-ipn.service';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('payments/webhooks')
@ApiTags('Payments - MoMo Webhook')
export class MomoWebhookController {
  constructor(private readonly momoIpnService: MomoIpnService) {}

  @Post('momo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Receive a MoMo IPN callback',
    description:
      'Public provider callback authenticated by MoMo HMAC signature. No JWT. Not intended for manual application-user calls.',
  })
  @ApiNoContentResponse({ description: 'Authentic callback accepted.' })
  @ApiUnauthorizedResponse({ description: 'Invalid MoMo HMAC signature.' })
  async receiveIpn(@Body() body: MomoIpnDto): Promise<void> {
    await this.momoIpnService.process(body);
  }
}

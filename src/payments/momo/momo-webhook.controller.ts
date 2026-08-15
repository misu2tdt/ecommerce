import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import { MomoIpnService } from './momo-ipn.service';

@Controller('payments/webhooks')
export class MomoWebhookController {
  constructor(private readonly momoIpnService: MomoIpnService) {}

  @Post('momo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async receiveIpn(@Body() body: MomoIpnDto): Promise<void> {
    await this.momoIpnService.process(body);
  }
}

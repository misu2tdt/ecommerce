import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.chatId = this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID') || '';
  }

  // ĐÂY CHÍNH LÀ CÁI HÀM MÀ TYPESCRIPT ĐANG TÌM KIẾM NÀY:
  async sendMessage(message: string) {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Thiếu Token hoặc Chat ID. Hãy kiểm tra lại file .env!');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        this.logger.error(`Lỗi gửi tin Telegram: ${response.statusText}`);
      } else {
        this.logger.log('Đã bắn tin nhắn Telegram thành công!');
      }
    } catch (error) {
      this.logger.error('Lỗi kết nối đến Telegram', error);
    }
  }
}
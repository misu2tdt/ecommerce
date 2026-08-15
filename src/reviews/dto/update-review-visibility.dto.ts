import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isVisible!: boolean;
}

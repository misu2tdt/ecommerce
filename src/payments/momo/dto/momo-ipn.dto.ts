import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MomoIpnDto {
  @ApiProperty({
    description: 'Provider-issued partner identifier.',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  partnerCode!: string;

  @ApiProperty({
    description: 'Opaque merchant order identifier.',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  orderId!: string;

  @ApiProperty({
    description: 'Opaque stable request identifier.',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  requestId!: string;

  @ApiProperty({
    type: 'integer',
    description: 'Integer VND received from MoMo.',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  orderInfo!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  orderType!: string;

  @ApiProperty({
    type: 'integer',
    description: 'MoMo transaction identifier.',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  transId!: number;

  @ApiProperty({ type: 'integer', description: 'MoMo result code.' })
  @IsInt()
  resultCode!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  message!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  payType!: string;

  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt()
  @Min(0)
  responseTime!: number;

  @ApiProperty({ maxLength: 4096 })
  @IsString()
  @MaxLength(4096)
  extraData!: string;

  @ApiProperty({
    description: 'Provider-generated HMAC signature; no secret is transmitted.',
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  signature!: string;
}

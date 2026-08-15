import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class MomoIpnDto {
  @IsString()
  @MaxLength(50)
  partnerCode!: string;

  @IsString()
  @MaxLength(50)
  orderId!: string;

  @IsString()
  @MaxLength(50)
  requestId!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @MaxLength(500)
  orderInfo!: string;

  @IsString()
  @MaxLength(100)
  orderType!: string;

  @IsInt()
  @Min(0)
  transId!: number;

  @IsInt()
  resultCode!: number;

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsString()
  @MaxLength(100)
  payType!: string;

  @IsInt()
  @Min(0)
  responseTime!: number;

  @IsString()
  @MaxLength(4096)
  extraData!: string;

  @IsString()
  @MaxLength(128)
  signature!: string;
}

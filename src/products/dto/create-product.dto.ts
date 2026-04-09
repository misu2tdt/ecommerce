export class CreateProductDto {
  name!: string;
  description?: string; // Dấu ? nghĩa là không bắt buộc (Optional)
  price!: number;
  stock!: number;
}
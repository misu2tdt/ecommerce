// Đây là cái giỏ hàng nhỏ chứa từng món
export class OrderItemDto {
  productId!: number;
  quantity!: number;
}

// Đây là cái đơn hàng tổng gửi lên server
export class CreateOrderDto {
  userId!: number; // Tạm thời khách phải tự gửi ID của họ (Sau này học JWT Auth thì cái này tự lấy từ Token ẩn)
  items!: OrderItemDto[]; // Mảng chứa danh sách các món hàng
}
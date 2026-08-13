export interface StoredImage {
  url: string;
  storageKey: string;
}

export interface ProductImageUpload {
  buffer: Buffer;
  mimetype: string;
}

export abstract class ImageStorageService {
  abstract uploadProductImage(
    productId: number,
    file: ProductImageUpload,
  ): Promise<StoredImage>;

  abstract deleteImage(storageKey: string): Promise<void>;
}

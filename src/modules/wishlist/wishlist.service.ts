import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './wishlist-item.entity';
import { Product } from '../catalog/products/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem) private wishlistRepo: Repository<WishlistItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async getWishlist(userId: string): Promise<Product[]> {
    const items = await this.wishlistRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (!items.length) return [];
    const productIds = items.map((i) => i.productId);
    const products = await this.productRepo.findBy(productIds.map((id) => ({ id })));
    // Preserve wishlist order
    const map = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => map.get(id)).filter(Boolean) as Product[];
  }

  async addToWishlist(userId: string, productId: string): Promise<boolean> {
    const existing = await this.wishlistRepo.findOneBy({ userId, productId });
    if (existing) return true;
    await this.wishlistRepo.save(this.wishlistRepo.create({ userId, productId }));
    return true;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    await this.wishlistRepo.delete({ userId, productId });
    return true;
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const count = await this.wishlistRepo.countBy({ userId, productId });
    return count > 0;
  }

  async getWishlistProductIds(userId: string): Promise<string[]> {
    const items = await this.wishlistRepo.find({ where: { userId }, select: ['productId'] });
    return items.map((i) => i.productId);
  }
}

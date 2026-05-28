import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';
import { Product } from '../../catalog/products/product.entity';
import { CartType } from './dto/cart.type';

const CART_TTL = 86400; // 24 hours

@Injectable()
export class CartService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<void> {
    await this.redis.hincrby(this.cartKey(userId), productId, quantity);
    await this.redis.expire(this.cartKey(userId), CART_TTL);
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    await this.redis.hdel(this.cartKey(userId), productId);
    await this.redis.expire(this.cartKey(userId), CART_TTL);
  }

  async getCart(userId: string): Promise<CartType> {
    const raw = await this.redis.hgetall(this.cartKey(userId));
    if (!raw || Object.keys(raw).length === 0) return { items: [], total: 0 };

    const productIds = Object.keys(raw);
    const products = await this.productRepo.findBy({ id: In(productIds) });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items = productIds.map((id) => {
      const product = productMap.get(id) ?? null;
      const quantity = parseInt(raw[id], 10);
      const price = product ? parseFloat(String(product.price)) : 0;
      return { productId: id, product, quantity, subtotal: price * quantity };
    });

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    return { items, total };
  }

  async clearCart(userId: string): Promise<void> {
    await this.redis.del(this.cartKey(userId));
  }

  async getCartItems(userId: string): Promise<Array<{ productId: string; quantity: number }>> {
    const raw = await this.redis.hgetall(this.cartKey(userId));
    return Object.entries(raw ?? {})
      .map(([productId, qty]) => ({ productId, quantity: parseInt(qty, 10) }))
      .filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
  }
}

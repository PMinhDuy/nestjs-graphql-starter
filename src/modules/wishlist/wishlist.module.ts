import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistItem } from './wishlist-item.entity';
import { WishlistService } from './wishlist.service';
import { WishlistResolver } from './wishlist.resolver';
import { Product } from '../catalog/products/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, Product])],
  providers: [WishlistService, WishlistResolver],
  exports: [WishlistService],
})
export class WishlistModule {}

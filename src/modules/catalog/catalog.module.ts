import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products/product.entity';
import { Category } from './categories/category.entity';
import { S3Module } from './s3/s3.module';
import { ProductsService } from './products/products.service';
import { ProductsResolver } from './products/products.resolver';
import { CategoriesService } from './categories/categories.service';
import { CategoriesResolver } from './categories/categories.resolver';
import { CategoriesDataLoader } from './categories/categories.dataloader';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    S3Module,
  ],
  providers: [
    ProductsService,
    ProductsResolver,
    CategoriesService,
    CategoriesResolver,
    CategoriesDataLoader,
  ],
  exports: [ProductsService, CategoriesService],
})
export class CatalogModule {}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Product } from './product.entity';
import { S3Service } from '../s3/s3.service';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductsArgs } from './dto/products.args';
import { PaginatedProducts } from './dto/paginated-products.type';
import { UploadUrlResponse } from './dto/upload-url-response.type';

const ALLOWED_SORT_COLUMNS = ['price', 'name', 'createdAt'] as const;
const ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private repo: Repository<Product>,
    private s3Service: S3Service,
  ) {}

  async requestUploadUrl(filename: string, contentType: string): Promise<UploadUrlResponse> {
    if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType as typeof ALLOWED_IMAGE_CONTENT_TYPES[number])) {
      throw new BadRequestException(`Content type "${contentType}" is not allowed. Allowed: ${ALLOWED_IMAGE_CONTENT_TYPES.join(', ')}`);
    }
    const key = `products/${randomUUID()}/${filename}`;
    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType);
    return { uploadUrl, key };
  }

  async create(input: CreateProductInput): Promise<Product> {
    const product = this.repo.create({ ...input, imageKeys: input.imageKeys ?? [] });
    return this.repo.save(product);
  }

  async findAll(args: ProductsArgs): Promise<PaginatedProducts> {
    const qb = this.repo.createQueryBuilder('p').where('p.isActive = true');

    if (args.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${args.search}%` });
    }
    if (args.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: args.categoryId });
    }

    // Whitelist sort columns to prevent SQL injection
    const sortCol = args.sortBy && ALLOWED_SORT_COLUMNS.includes(args.sortBy as typeof ALLOWED_SORT_COLUMNS[number])
      ? args.sortBy
      : 'createdAt';
    const sortOrder = args.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`p.${sortCol}`, sortOrder);

    const [items, total] = await qb.skip(args.offset).take(args.limit).getManyAndCount();
    return { items, total, hasMore: args.offset + items.length < total };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id, isActive: true });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  // Admin-only: fetch regardless of isActive (for update/delete)
  async findOneAdmin(id: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = await this.findOneAdmin(id);
    Object.assign(product, input);
    return this.repo.save(product);
  }

  async remove(id: string): Promise<boolean> {
    const product = await this.findOneAdmin(id);
    await this.repo.remove(product);
    return true;
  }
}

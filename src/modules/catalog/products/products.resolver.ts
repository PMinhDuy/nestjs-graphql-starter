import { Resolver, Query, Mutation, Args, ResolveField, Parent, ID, Int } from '@nestjs/graphql';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { ProductsService } from './products.service';
import { S3Service } from '../s3/s3.service';
import { CategoriesDataLoader } from '../categories/categories.dataloader';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { ProductsArgs } from './dto/products.args';
import { PaginatedProducts } from './dto/paginated-products.type';
import { UploadUrlResponse } from './dto/upload-url-response.type';
import { Roles, Public } from '../../../common/decorators';
import { UserRole } from '../../users/user.entity';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(
    private productsService: ProductsService,
    private s3Service: S3Service,
    private categoriesDataLoader: CategoriesDataLoader,
  ) {}

  @Public()
  @Query(() => PaginatedProducts)
  products(@Args() args: ProductsArgs): Promise<PaginatedProducts> {
    return this.productsService.findAll(args);
  }

  @Public()
  @Query(() => Product)
  product(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Mutation(() => UploadUrlResponse)
  @Roles(UserRole.ADMIN)
  requestProductUploadUrl(
    @Args('filename') filename: string,
    @Args('contentType') contentType: string,
  ): Promise<UploadUrlResponse> {
    return this.productsService.requestUploadUrl(filename, contentType);
  }

  @Mutation(() => Product)
  @Roles(UserRole.ADMIN)
  createProduct(@Args('input') input: CreateProductInput): Promise<Product> {
    return this.productsService.create(input);
  }

  @Mutation(() => Product)
  @Roles(UserRole.ADMIN)
  updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductInput,
  ): Promise<Product> {
    return this.productsService.update(id, input);
  }

  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  removeProduct(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.productsService.remove(id);
  }

  // Resolves S3 keys → signed download URLs — never expose raw keys to clients
  @ResolveField(() => [String])
  async imageUrls(@Parent() product: Product): Promise<string[]> {
    if (!product.imageKeys?.length) return [];
    return Promise.all(product.imageKeys.map((key) => this.s3Service.getDownloadUrl(key)));
  }

  @ResolveField(() => Category)
  category(@Parent() product: Product): Promise<Category> {
    return this.categoriesDataLoader.batchCategories.load(product.categoryId) as Promise<Category>;
  }

  @Public()
  @ResolveField(() => [Product])
  relatedProducts(
    @Parent() product: Product,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 4 }) limit = 4,
  ): Promise<Product[]> {
    return this.productsService.findRelated(product.id, product.categoryId, limit);
  }

  @Roles(UserRole.ADMIN)
  @Query(() => PaginatedProducts)
  adminProducts(@Args() args: ProductsArgs): Promise<PaginatedProducts> {
    return this.productsService.findAllAdmin(args);
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => Int)
  bulkUpdateProducts(
    @Args('ids', { type: () => [ID] }) ids: string[],
    @Args('isActive') isActive: boolean,
  ): Promise<number> {
    return this.productsService.bulkUpdate(ids, isActive);
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => Int)
  bulkDeleteProducts(
    @Args('ids', { type: () => [ID] }) ids: string[],
  ): Promise<number> {
    return this.productsService.bulkDelete(ids);
  }
}

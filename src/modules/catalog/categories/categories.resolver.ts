import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Category } from './category.entity';
import { CategoriesService } from './categories.service';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { Roles, Public } from '../../../common/decorators';
import { UserRole } from '../../users/user.entity';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Query(() => [Category])
  categories(): Promise<Category[]> {
    return this.categoriesService.findTrees();
  }

  @Public()
  @Query(() => Category)
  category(@Args('id', { type: () => ID }) id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Mutation(() => Category)
  @Roles(UserRole.ADMIN)
  createCategory(@Args('input') input: CreateCategoryInput): Promise<Category> {
    return this.categoriesService.create(input);
  }

  @Mutation(() => Category)
  @Roles(UserRole.ADMIN)
  updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoriesService.update(id, input);
  }

  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  removeCategory(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.categoriesService.remove(id);
  }
}

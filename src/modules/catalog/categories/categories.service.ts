import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, TreeRepository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private repo: TreeRepository<Category>,
  ) {}

  findTrees(): Promise<Category[]> {
    return this.repo.findTrees({ depth: 5 });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.repo.findOneBy({ id });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  findByIds(ids: string[]): Promise<Category[]> {
    return this.repo.findBy({ id: In(ids) });
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const category = this.repo.create({ name: input.name, description: input.description });
    if (input.parentId) {
      category.parent = await this.findOne(input.parentId);
    }
    return this.repo.save(category);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, input);
    return this.repo.save(category);
  }

  async remove(id: string): Promise<boolean> {
    const categoryWithChildren = await this.repo.findDescendantsTree(await this.findOne(id));
    if (categoryWithChildren.children?.length) {
      throw new BadRequestException('Cannot delete a category that has subcategories');
    }
    await this.repo.remove(categoryWithChildren);
    return true;
  }
}

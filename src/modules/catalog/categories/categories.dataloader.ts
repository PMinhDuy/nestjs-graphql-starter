import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

@Injectable({ scope: Scope.REQUEST })
export class CategoriesDataLoader {
  readonly batchCategories: DataLoader<string, Category>;

  constructor(private categoriesService: CategoriesService) {
    this.batchCategories = new DataLoader<string, Category>(async (ids: readonly string[]) => {
      const categories = await this.categoriesService.findByIds([...ids]);
      const map = new Map(categories.map((c) => [c.id, c]));
      return ids.map((id) => map.get(id) ?? new Error(`Category ${id} not found`));
    });
  }
}

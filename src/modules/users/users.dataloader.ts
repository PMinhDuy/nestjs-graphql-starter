import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Injectable({ scope: Scope.REQUEST })
export class UsersDataLoader {
  constructor(private usersService: UsersService) {}

  readonly batchUsers = new DataLoader<string, User>(
    async (ids: readonly string[]) => {
      const users = await this.usersService.findByIds([...ids]);
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? new Error(`User ${id} not found`));
    },
  );
}

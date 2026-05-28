import { Resolver, Query } from '@nestjs/graphql';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../../common/decorators';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}

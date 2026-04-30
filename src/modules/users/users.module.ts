import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UsersDataLoader } from './users.dataloader';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver, UsersDataLoader],
  exports: [UsersService, UsersDataLoader],
})
export class UsersModule {}

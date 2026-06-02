import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsResolver } from './payments.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  providers: [PaymentsService, PaymentsResolver],
  controllers: [PaymentsController],
})
export class PaymentsModule {}

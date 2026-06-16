import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsResolver } from './payments.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Payment])],
  providers: [PaymentsService, PaymentsResolver],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}

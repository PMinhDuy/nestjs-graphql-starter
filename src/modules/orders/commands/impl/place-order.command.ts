export class PlaceOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly shippingAddressId: string,
  ) {}
}

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UploadUrlResponse {
  @Field()
  uploadUrl: string;

  @Field()
  key: string;
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Returns whatever the Passport strategy's validate() attached to req.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().user,
);

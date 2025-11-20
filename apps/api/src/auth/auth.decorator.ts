import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthContext } from "./auth.types";

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.auth as AuthContext | undefined;
});

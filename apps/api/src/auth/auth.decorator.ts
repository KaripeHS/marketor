import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { AuthContext } from "./auth.types";

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.auth as AuthContext | undefined;
});

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

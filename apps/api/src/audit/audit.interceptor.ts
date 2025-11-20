import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthContext } from "../auth/auth.types";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const auth = request.auth as AuthContext | undefined;
    const action = `${request.method} ${request.url}`;

    return next.handle().pipe(
      tap({
        next: async () => {
          if (auth) {
            await this.prisma.auditLog.create({
              data: {
                actorId: auth.userId,
                tenantId: auth.tenantId,
                action,
                targetType: request.route?.path,
                meta: {
                  method: request.method
                }
              }
            });
          }
        }
      })
    );
  }
}

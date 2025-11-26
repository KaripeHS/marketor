import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import { AuthContext } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles are required, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const auth: AuthContext = request.auth;

        if (!auth || !auth.role) {
            throw new ForbiddenException("No role assigned");
        }

        const hasRole = requiredRoles.includes(auth.role);
        if (!hasRole) {
            throw new ForbiddenException(`Requires one of: ${requiredRoles.join(", ")}`);
        }

        return true;
    }
}

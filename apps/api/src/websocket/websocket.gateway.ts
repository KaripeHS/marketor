import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

export interface RealtimeNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    timestamp: Date;
}

export interface RoomJoinRequest {
    tenantId: string;
    userId: string;
}

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
    },
    namespace: "/realtime",
})
export class WebsocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(WebsocketGateway.name);
    private readonly userSockets: Map<string, Set<string>> = new Map();

    @WebSocketServer()
    server!: Server;

    afterInit() {
        this.logger.log("WebSocket gateway initialized");
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Remove from all user tracking
        for (const [userId, socketIds] of this.userSockets.entries()) {
            socketIds.delete(client.id);
            if (socketIds.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    @SubscribeMessage("join")
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: RoomJoinRequest
    ) {
        const { tenantId, userId } = data;

        // Join tenant room for broadcasts
        if (tenantId) {
            client.join(`tenant:${tenantId}`);
            this.logger.debug(`Client ${client.id} joined tenant:${tenantId}`);
        }

        // Join user-specific room for direct messages
        if (userId) {
            client.join(`user:${userId}`);
            this.logger.debug(`Client ${client.id} joined user:${userId}`);

            // Track user sockets
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(client.id);
        }

        return { success: true, rooms: [...client.rooms] };
    }

    @SubscribeMessage("leave")
    handleLeave(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: RoomJoinRequest
    ) {
        const { tenantId, userId } = data;

        if (tenantId) {
            client.leave(`tenant:${tenantId}`);
            this.logger.debug(`Client ${client.id} left tenant:${tenantId}`);
        }

        if (userId) {
            client.leave(`user:${userId}`);
            this.userSockets.get(userId)?.delete(client.id);
        }

        return { success: true };
    }

    // Send notification to a specific user
    sendToUser(userId: string, event: string, data: RealtimeNotification) {
        this.server.to(`user:${userId}`).emit(event, data);
        this.logger.debug(`Sent ${event} to user:${userId}`);
    }

    // Send notification to all users in a tenant
    sendToTenant(tenantId: string, event: string, data: RealtimeNotification) {
        this.server.to(`tenant:${tenantId}`).emit(event, data);
        this.logger.debug(`Sent ${event} to tenant:${tenantId}`);
    }

    // Broadcast to all connected clients
    broadcast(event: string, data: RealtimeNotification) {
        this.server.emit(event, data);
        this.logger.debug(`Broadcast ${event}`);
    }

    // Check if a user is online
    isUserOnline(userId: string): boolean {
        return (this.userSockets.get(userId)?.size ?? 0) > 0;
    }

    // Get count of online users in a tenant
    getOnlineUsersInTenant(tenantId: string): number {
        const room = this.server.sockets.adapter.rooms.get(`tenant:${tenantId}`);
        return room?.size ?? 0;
    }
}

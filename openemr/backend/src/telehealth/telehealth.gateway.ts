import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebRTC signaling gateway for video consultations (telehealth).
 *
 * Browsers cannot connect to each other directly without first exchanging
 * session descriptions (SDP offers/answers) and ICE candidates. This gateway is
 * a lightweight relay for exactly those signalling messages — the actual audio
 * and video flow peer-to-peer over WebRTC and never pass through the server.
 *
 * Two participants (patient + physician) share a room code (e.g. ``vc-1a2b3c4d``)
 * that is minted when a *video* booking request is created
 * (see BookingsService.createRequest). Either side opens ``/video/<room>``.
 *
 * Namespace ``/telehealth``. It reuses the same engine.io path as the messaging
 * gateway (``/messaging/socket.io``) so the existing nginx ``location /messaging/``
 * proxy carries the handshake in production — no extra proxy rule required.
 */
@WebSocketGateway({
    namespace: '/telehealth',
    path: '/messaging/socket.io',
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:8082'],
        credentials: true,
    },
})
export class TelehealthGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    private server!: Server;

    private readonly logger = new Logger(TelehealthGateway.name);

    /** room code → set of connected socket ids. */
    private readonly rooms = new Map<string, Set<string>>();
    /** socket id → room code (so we can clean up on disconnect). */
    private readonly socketRoom = new Map<string, string>();

    handleConnection(client: Socket): void {
        this.logger.log(`telehealth client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        const room = this.socketRoom.get(client.id);
        if (!room) return;
        this.removeFromRoom(client, room);
        // Broadcast from the server: the socket has already left its rooms by the
        // time `disconnect` fires, so it cannot address them itself.
        this.server?.to(room).emit('telehealth:peer-left', { id: client.id });
        this.logger.log(`telehealth client left room ${room}: ${client.id}`);
    }

    /**
     * Join a room. The caller is told whether it should *initiate* the offer:
     * when someone is already waiting in the room the newcomer becomes the
     * initiator, otherwise the first joiner waits to be called.
     */
    @SubscribeMessage('telehealth:join')
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { room?: string; role?: string },
    ): { ok: boolean; room?: string; peers?: number; initiator?: boolean } {
        const room = String(body?.room || '').trim();
        if (!room) return { ok: false };

        client.join(room);
        const peers = this.rooms.get(room) || new Set<string>();
        const initiator = peers.size >= 1;
        peers.add(client.id);
        this.rooms.set(room, peers);
        this.socketRoom.set(client.id, room);

        // Let whoever is already in the room know a peer arrived.
        client.to(room).emit('telehealth:peer-joined', {
            id: client.id,
            role: body?.role || 'peer',
        });
        this.logger.log(
            `telehealth join: ${client.id} (${body?.role || 'peer'}) → ${room} (peers=${peers.size})`,
        );
        return { ok: true, room, peers: peers.size, initiator };
    }

    /** Relay an SDP / ICE payload to the other participant(s) in the room. */
    @SubscribeMessage('telehealth:signal')
    handleSignal(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { room?: string; data?: unknown },
    ): { ok: boolean } {
        const room = String(
            body?.room || this.socketRoom.get(client.id) || '',
        ).trim();
        if (!room) return { ok: false };
        client.to(room).emit('telehealth:signal', {
            from: client.id,
            data: body?.data,
        });
        return { ok: true };
    }

    /** Explicit leave (hang up) — mirrors handleDisconnect. */
    @SubscribeMessage('telehealth:leave')
    handleLeave(@ConnectedSocket() client: Socket): { ok: boolean } {
        const room = this.socketRoom.get(client.id);
        if (room) {
            this.removeFromRoom(client, room);
            client.to(room).emit('telehealth:peer-left', { id: client.id });
        }
        return { ok: true };
    }

    /** How many participants are currently waiting/connected in a room. */
    @SubscribeMessage('telehealth:status')
    handleStatus(
        @MessageBody() body: { room?: string },
    ): { room: string; peers: number } {
        const room = String(body?.room || '').trim();
        return { room, peers: this.rooms.get(room)?.size || 0 };
    }

    private removeFromRoom(client: Socket, room: string): void {
        client.leave(room);
        const peers = this.rooms.get(room);
        peers?.delete(client.id);
        if (peers && peers.size === 0) this.rooms.delete(room);
        this.socketRoom.delete(client.id);
    }
}

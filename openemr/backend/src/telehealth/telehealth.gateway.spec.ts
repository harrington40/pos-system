import { Socket } from 'socket.io';
import { TelehealthGateway } from './telehealth.gateway';

/**
 * The gateway is a thin relay for WebRTC signalling, so the behaviours worth
 * pinning down are: who is told to initiate the offer, and that offers/answers
 * are broadcast to the room (i.e. reach the *other* participant).
 *
 * `socket.to(room).emit(...)` delivers to everyone in the room except the sender,
 * so the mocks below record every broadcast (sender + room) in a shared log and
 * the assertions read from that log — matching how a second peer actually hears.
 */
type Broadcast = { from: string; room: string; event: string; payload: any };

describe('TelehealthGateway', () => {
    let broadcasts: Broadcast[];
    let gateway: TelehealthGateway;

    function mockSocket(id: string): Socket {
        const socket = {
            id,
            join: jest.fn(),
            leave: jest.fn(),
            to: (room: string) => ({
                emit: (event: string, payload: unknown) =>
                    broadcasts.push({ from: id, room, event, payload }),
            }),
        };
        return socket as unknown as Socket;
    }

    beforeEach(() => {
        broadcasts = [];
        gateway = new TelehealthGateway();
        (gateway as unknown as { server: unknown }).server = {
            to: (room: string) => ({
                emit: (event: string, payload: unknown) =>
                    broadcasts.push({ from: 'server', room, event, payload }),
            }),
        };
    });

    const emitted = (event: string) => broadcasts.filter((b) => b.event === event);

    it('tells the FIRST joiner to wait rather than initiate', () => {
        const res = gateway.handleJoin(mockSocket('s1'), { room: 'vc-1', role: 'patient' });
        expect(res).toEqual({ ok: true, room: 'vc-1', peers: 1, initiator: false });
    });

    it('makes the SECOND joiner the initiator and notifies the waiting peer', () => {
        gateway.handleJoin(mockSocket('s1'), { room: 'vc-1', role: 'patient' });

        const res = gateway.handleJoin(mockSocket('s2'), { room: 'vc-1', role: 'physician' });

        expect(res).toEqual({ ok: true, room: 'vc-1', peers: 2, initiator: true });
        expect(emitted('telehealth:peer-joined')).toContainEqual({
            from: 's2',
            room: 'vc-1',
            event: 'telehealth:peer-joined',
            payload: { id: 's2', role: 'physician' },
        });
    });

    it('rejects a join without a room', () => {
        expect(gateway.handleJoin(mockSocket('s1'), {})).toEqual({ ok: false });
    });

    it('relays offers/answers/ICE to the room', () => {
        const socket = mockSocket('s1');
        gateway.handleJoin(socket, { room: 'vc-9' });

        const data = { type: 'offer', sdp: 'v=0' };
        expect(gateway.handleSignal(socket, { room: 'vc-9', data })).toEqual({ ok: true });

        expect(emitted('telehealth:signal')).toContainEqual({
            from: 's1',
            room: 'vc-9',
            event: 'telehealth:signal',
            payload: { from: 's1', data },
        });
    });

    it('falls back to the socket\u2019s room when the payload omits it', () => {
        const socket = mockSocket('s1');
        gateway.handleJoin(socket, { room: 'vc-3' });

        gateway.handleSignal(socket, { data: { type: 'answer' } });

        expect(emitted('telehealth:signal')[0].room).toBe('vc-3');
    });

    it('reports how many participants are waiting in a room', () => {
        gateway.handleJoin(mockSocket('s1'), { room: 'vc-2' });
        expect(gateway.handleStatus({ room: 'vc-2' })).toEqual({ room: 'vc-2', peers: 1 });
        expect(gateway.handleStatus({ room: 'vc-empty' })).toEqual({ room: 'vc-empty', peers: 0 });
    });

    it('frees the room when the last participant leaves', () => {
        const socket = mockSocket('s1');
        gateway.handleJoin(socket, { room: 'vc-4' });

        gateway.handleLeave(socket);

        expect(socket.leave).toHaveBeenCalledWith('vc-4');
        expect(emitted('telehealth:peer-left')).toContainEqual({
            from: 's1',
            room: 'vc-4',
            event: 'telehealth:peer-left',
            payload: { id: 's1' },
        });
        expect(gateway.handleStatus({ room: 'vc-4' }).peers).toBe(0);
    });

    it('cleans up on disconnect and warns the remaining peer', () => {
        const a = mockSocket('a');
        gateway.handleJoin(a, { room: 'vc-5' });
        gateway.handleJoin(mockSocket('b'), { room: 'vc-5' });

        gateway.handleDisconnect(a);

        expect(emitted('telehealth:peer-left')).toContainEqual({
            from: 'server',
            room: 'vc-5',
            event: 'telehealth:peer-left',
            payload: { id: 'a' },
        });
        expect(gateway.handleStatus({ room: 'vc-5' }).peers).toBe(1);
    });
});

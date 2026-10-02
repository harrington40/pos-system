import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RnWorkbenchService } from './rn-workbench.service';
import { MessageProducer } from '../messaging/message-producer.service';

/**
 * The workbench turns chart signals into a shift board. The tests pin the
 * behaviours a nurse depends on: a fall/Braden score is computed server-side,
 * I/O is validated, and an escalation always files a task.
 */
describe('RnWorkbenchService', () => {
    function build(responder: (sql: string) => unknown) {
        const queries: string[] = [];
        const dataSource = {
            query<T = unknown>(sql: string): Promise<T> {
                queries.push(sql);
                return Promise.resolve(responder(sql) as T);
            },
        };
        return { dataSource, queries };
    }

    async function service(
        dataSource: unknown,
        messages: unknown = {
            produceMessage: async () => ({ eventId: 'evt', topic: 't' }),
        },
    ) {
        const module = await Test.createTestingModule({
            providers: [
                RnWorkbenchService,
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: MessageProducer, useValue: messages },
            ],
        }).compile();
        return module.get(RnWorkbenchService);
    }

    describe('saveSafety', () => {
        it('scores a Morse fall assessment instead of trusting the body', async () => {
            const { dataSource } = build(() => ({ insertId: 5 }));
            const r = await (
                await service(dataSource)
            ).saveSafety(
                17,
                'fall',
                {
                    historyOfFalling: true,
                    ambulatoryAid: 15,
                    ivLine: true,
                    gait: 10,
                } as never,
                12,
            );
            expect(r).toMatchObject({ kind: 'fall', score: 70, level: 'high' });
        });

        it('rejects an unknown assessment kind', async () => {
            const { dataSource } = build(() => ({ insertId: 1 }));
            await expect(
                (await service(dataSource)).saveSafety(17, 'nonsense', {} as never),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('addIO', () => {
        it('rejects a bad kind or non-positive volume', async () => {
            const { dataSource } = build(() => ({ insertId: 1 }));
            await expect(
                (await service(dataSource)).addIO(17, { kind: 'x', volumeMl: 100 }),
            ).rejects.toBeInstanceOf(BadRequestException);
            await expect(
                (await service(dataSource)).addIO(17, {
                    kind: 'intake',
                    volumeMl: 0,
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('records a valid intake', async () => {
            const { dataSource } = build(() => ({ insertId: 9 }));
            const r = await (
                await service(dataSource)
            ).addIO(17, { kind: 'intake', volumeMl: 250 });
            expect(r).toMatchObject({ id: 9, kind: 'intake', volumeMl: 250 });
        });
    });

    describe('escalate', () => {
        it('files a high-priority escalation task for the responsible nurse', async () => {
            const { dataSource, queries } = build((sql) => {
                if (sql.includes('FROM patient_data'))
                    return [
                        { assigned_nurse_id: 12, fname: 'Test', lname: 'Patient' },
                    ];
                if (sql.includes('INSERT INTO nurse_tasks')) return { insertId: 7 };
                return { affectedRows: 1 };
            });
            const task = await (
                await service(dataSource)
            ).escalate(17, 'NEWS2 rising', 99);
            expect(task).toMatchObject({ kind: 'escalation', priority: 10 });
            expect(
                queries.some((q) => q.includes('INSERT INTO nurse_tasks')),
            ).toBe(true);
        });

        it('404s an unknown patient', async () => {
            const { dataSource } = build(() => []);
            await expect(
                (await service(dataSource)).escalate(999, 'x', 1),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('completeTask', () => {
        it('404s when nothing was updated', async () => {
            const { dataSource } = build(() => ({ affectedRows: 0 }));
            await expect(
                (await service(dataSource)).completeTask(3),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('getWorkbench', () => {
        it('surfaces a never-observed patient as a first-set task', async () => {
            const { dataSource } = build((sql) => {
                if (sql.includes('FROM form_vitals')) return [];
                if (sql.includes('FROM patient_flags')) return [];
                if (sql.includes('FROM nurse_tasks')) return [];
                if (sql.includes('FROM users u')) return [];
                return [];
            });
            const wb = await (
                await service(dataSource)
            ).getWorkbench(12, [
                {
                    pid: 17,
                    fname: 'Test',
                    lname: 'Patient',
                    room: '101A',
                    acuity_level: 'urgent',
                    last_vital_date: null,
                    bps: null,
                    bpd: null,
                    pulse: null,
                    temperature: null,
                    respiration: null,
                    oxygen_saturation: null,
                },
            ]);
            expect(wb.vitalsDue).toHaveLength(1);
            expect(
                (wb.vitalsDue[0] as { state: string }).state,
            ).toBe('never');
        });
    });

    describe('escalate paging', () => {
        it('pages the assigned nurse through the messaging producer', async () => {
            const pages: any[] = [];
            const messages = {
                produceMessage: async (dto: any) => {
                    pages.push(dto);
                    return { eventId: 'e', topic: 't' };
                },
            };
            const { dataSource } = build((sql) => {
                if (sql.includes('FROM patient_data'))
                    return [
                        {
                            assigned_nurse_id: 12,
                            charge_nurse_id: null,
                            room: '101A',
                            fname: 'Test',
                            lname: 'Patient',
                        },
                    ];
                if (sql.includes('INSERT INTO nurse_tasks')) return { insertId: 7 };
                return { affectedRows: 1 };
            });
            await (await service(dataSource, messages)).escalate(
                17,
                'NEWS2 rising',
                99,
            );
            expect(pages).toHaveLength(1);
            expect(pages[0]).toMatchObject({ priority: 'STAT', recipientId: 12, pid: 17 });
        });
    });

    describe('getChecklist', () => {
        it('derives admission items from chart signals', async () => {
            const { dataSource } = build((sql) => {
                if (sql.includes('public_id FROM patient_data'))
                    return [{ public_id: 'P123' }];
                if (sql.includes('booking_requests'))
                    return [
                        {
                            allergies: 0,
                            vitals: 0,
                            vitals_today: 0,
                            mar_orders: 0,
                            mar_active: 0,
                            falls: 0,
                            braden: 0,
                            code_status: 0,
                            upcoming: 0,
                        },
                    ];
                return [{}];
            });
            const list = await (
                await service(dataSource)
            ).getChecklist(17, 'admission');
            const byKey = Object.fromEntries(
                list.items.map((i: any) => [i.key, i.done]),
            );
            expect(byKey.identity).toBe(true);
            expect(byKey.allergies).toBe(false);
        });
    });
});

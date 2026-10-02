import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RnWorkbenchService } from './rn-workbench.service';

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

    async function service(dataSource: unknown) {
        const module = await Test.createTestingModule({
            providers: [
                RnWorkbenchService,
                { provide: getDataSourceToken(), useValue: dataSource },
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
});

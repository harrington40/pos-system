import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { NursingService } from './nursing.service';
import { SmartRoutingService } from './smart-routing.service';
import { MedicationAdministrationService } from '../medication-administration/medication-administration.service';
import { RnWorkbenchService } from './rn-workbench.service';

/**
 * A nurse-aide intake is written as `pending` (the registrar still has to
 * approve it and assign a provider). The nurse dashboard used to select only
 * `status = 'active'`, so the chart the aide had just created never appeared
 * on their own dashboard. These tests pin the pending-visibility contract.
 */
describe('NursingService.getNurseDashboard', () => {
    const pendingPatient = {
        id: 4,
        pid: 21,
        fname: 'Massa',
        lname: 'Kollie',
        DOB: '1994-03-02',
        sex: 'F',
        status: 'pending',
        room: null,
        acuity_level: null,
        acuity_score: null,
        is_assigned: 0,
    };

    async function dashboard(patientRows: unknown[]) {
        const queries: { sql: string; params?: unknown[] }[] = [];
        const dataSource = {
            query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
                queries.push({ sql, params });
                // 1) signed-in nurse, 2) ward patients, 3) shared notes.
                if (sql.includes('FROM users')) {
                    return Promise.resolve([
                        {
                            id: 7,
                            username: 'aide',
                            fname: 'Fatu',
                            lname: 'Kamara',
                            title: 'Nurse Aide',
                        },
                    ] as T);
                }
                if (sql.includes('FROM patient_data pd')) {
                    return Promise.resolve(patientRows as T);
                }
                return Promise.resolve([] as T);
            },
        };

        const module = await Test.createTestingModule({
            providers: [
                NursingService,
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: SmartRoutingService, useValue: {} },
                {
                    provide: MedicationAdministrationService,
                    useValue: { getDashboard: async () => null },
                },
                {
                    provide: RnWorkbenchService,
                    useValue: { getWorkbench: async () => null },
                },
            ],
        }).compile();

        const result = await module
            .get(NursingService)
            .getNurseDashboard(7);
        return { result, queries };
    }

    it('includes pending intake charts in the ward query', async () => {
        const { result, queries } = await dashboard([pendingPatient]);
        const wardQuery = queries.find((q) =>
            q.sql.includes('FROM patient_data pd'),
        );

        expect(wardQuery).toBeDefined();
        expect(wardQuery!.sql).toContain("pd.status IN ('active', 'pending')");
        expect(wardQuery!.sql).toContain('pd.status,');
        expect(result.patients).toEqual([pendingPatient]);
    });

    it('still reports the patient status so the UI can flag approval', async () => {
        const { result } = await dashboard([pendingPatient]);
        expect(result.patients[0]).toHaveProperty('status', 'pending');
    });
});

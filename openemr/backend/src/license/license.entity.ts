import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export type LicenseTier = 'basic' | 'professional' | 'enterprise';
export type LicenseStatus =
    | 'active'
    | 'expired'
    | 'revoked'
    | 'superseded';

@Entity('licenses')
export class License {
    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * The license key (e.g. OPENRX-B6B0B-28C001-1A2B3C4D-9E8F7A6B).
     *
     * 37 characters in the current fixed-width format, so the column must be
     * wider than that. It was varchar(30) to suit the earlier format, which
     * made activation fail with ER_DATA_TOO_LONG and a 500 out of
     * POST /api/license/activate. The table is not covered by a migration or by
     * synchronize, so an existing database has to be widened by hand.
     */
    @Column({ length: 64, unique: true })
    licenseKey!: string;

    /** Subscription tier */
    @Column({ length: 20, default: 'basic' })
    tier!: LicenseTier;

    /** When the license was activated */
    @Column({ type: 'datetime', nullable: true })
    activatedAt!: Date | null;

    /** When the license expires */
    @Column({ type: 'datetime' })
    expiresAt!: Date;

    /** License status */
    @Column({ length: 20, default: 'active' })
    status!: LicenseStatus;

    /** Optional: customer name / organization */
    @Column({ length: 255, default: '' })
    customerName!: string;

    /** Optional: max users allowed */
    @Column({ type: 'int', default: 5 })
    maxUsers!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

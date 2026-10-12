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

    /** The license key (e.g. OPENRX-B6B0B-28C001-1A2B3C4D-9E8F7A6B) */
    @Column({ length: 30, unique: true })
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

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PatientsService } from './patients.service';

/**
 * Public patient portal endpoints (no staff JWT required).
 *
 * Self-registration creates a patient record and returns the public Patient ID
 * (e.g. RX-2608-00001). Login verifies that ID against date of birth and
 * returns a short-lived portal token. The portal token is then used to fetch
 * the patient's own medical records.
 */
@Controller('portal')
export class PortalController {
  constructor(
    private readonly patients: PatientsService,
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Post('register')
  async register(@Body() dto: any) {
    const fname = String(dto.fname || '').trim();
    const lname = String(dto.lname || '').trim();
    if (!fname || !lname) {
      throw new BadRequestException('First and last name are required');
    }

    // Security measure: reject duplicate registrations before creating a new
    // record. A strong match (same name + DOB, or same phone) is blocked so a
    // patient cannot create multiple portal records for the same identity.
    const existing = await this.patients.findDuplicates(
      fname,
      lname,
      dto.DOB || '',
      dto.phone_contact || '',
    );
    const strongMatch = (existing || []).filter((p: any) => {
      const dobMatch = dto.DOB && p.DOB ? String(p.DOB).slice(0, 10) === dto.DOB : false;
      const nameMatch = `${p.fname} ${p.lname}`.toLowerCase().includes(fname.toLowerCase()) ||
        `${p.fname} ${p.lname}`.toLowerCase().includes(lname.toLowerCase());
      const phoneMatch = (dto.phone_contact || '').replace(/\D/g, '').length >= 6 &&
        String(p.phone_contact || '').replace(/\D/g, '') === (dto.phone_contact || '').replace(/\D/g, '');
      return (dobMatch && nameMatch) || phoneMatch;
    });
    if (strongMatch.length) {
      throw new ConflictException(
        'A patient record with these details already exists. Please sign in to the portal with your Patient ID, or contact the hospital for help.',
      );
    }

    const created = await this.patients.create(dto, 'Patient Portal');
    return {
      publicId: created.publicId,
      pid: created.pid,
      name: `${fname} ${lname}`,
    };
  }

  @Post('login')
  async login(@Body() body: { publicId?: string; dob?: string }) {
    const publicId = String(body.publicId || '').trim();
    if (!publicId) {
      throw new BadRequestException('Patient ID is required');
    }
    const rows = await this.patients.findByPublicId(publicId);
    if (!rows.length) {
      throw new NotFoundException('Patient not found. Please check your Patient ID.');
    }
    const p = rows[0];
    const toDateOnly = (d: any): string => {
      if (!d) return '';
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const patientDob = toDateOnly(p.DOB);
    if (body.dob && patientDob !== body.dob) {
      throw new UnauthorizedException('Date of birth does not match our records.');
    }

    const token = this.jwtService.sign({
      sub: p.pid,
      role: 'patient',
      publicId: p.public_id,
      name: `${p.fname} ${p.lname}`,
      dob: patientDob,
    });

    return {
      token,
      pid: p.pid,
      publicId: p.public_id,
      name: `${p.fname} ${p.lname}`,
      dob: patientDob,
    };
  }

  @Get('records')
  async records(@Req() req: any) {
    const pid = this.verifyPortalToken(req);
    const [appointments, medications, vitals, allergies, conditions, procedures] =
      await Promise.all([
        this.dataSource.query(
          `SELECT pc_eid, pc_eventDate, pc_startTime, pc_endTime, pc_title, pc_apptstatus
           FROM openemr_postcalendar_events WHERE pc_pid = ? ORDER BY pc_eventDate DESC LIMIT 50`,
          [pid],
        ),
        this.dataSource.query(
          `SELECT id, drug, dosage, quantity, route, refills, start_date, end_date, active, note
           FROM prescriptions WHERE patient_id = ? AND active = 1 ORDER BY start_date DESC LIMIT 50`,
          [pid],
        ),
        this.dataSource.query(
          `SELECT id, date, bps, bpd, pulse, respiration, temperature, oxygen_saturation, weight, height, bmi
           FROM form_vitals WHERE pid = ? ORDER BY date DESC LIMIT 50`,
          [pid],
        ),
        this.dataSource.query(
          `SELECT id, title AS allergen, comments AS reaction, date
           FROM lists WHERE pid = ? AND type = 'allergy' AND activity = 1 ORDER BY date DESC LIMIT 50`,
          [pid],
        ),
        this.dataSource.query(
          `SELECT id, title AS diagnosis, comments AS note, date
           FROM lists WHERE pid = ? AND type = 'medical_problem' ORDER BY date DESC LIMIT 50`,
          [pid],
        ),
        this.dataSource.query(
          `SELECT procedure_order_id AS id, date_ordered, order_status, patient_instructions
           FROM procedure_order WHERE patient_id = ? ORDER BY date_ordered DESC LIMIT 50`,
          [pid],
        ),
      ]);

    return {
      appointments,
      medications,
      vitals,
      allergies,
      conditions,
      procedures,
    };
  }

  private verifyPortalToken(req: any): number {
    const auth = String(req.headers?.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) throw new UnauthorizedException('Not authenticated');
    try {
      const payload = this.jwtService.verify(token);
      if (payload?.role !== 'patient' || !payload?.sub) {
        throw new Error('Not a patient session');
      }
      return Number(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}

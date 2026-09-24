import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async appointmentStats(startDate?: string, endDate?: string) {
    const params: any[] = [];
    let where = '';
    if (startDate) { where += ' AND pc_eventDate >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND pc_eventDate <= ?'; params.push(endDate); }

    const [rows] = await this.dataSource.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT pc_pid) as uniquePatients
       FROM openemr_postcalendar_events WHERE 1=1${where}`, params,
    );
    const byStatus = await this.dataSource.query(
      `SELECT pc_apptstatus as status, COUNT(*) as count
       FROM openemr_postcalendar_events WHERE 1=1${where}
       GROUP BY pc_apptstatus`, params,
    );
    return { ...rows, byStatus };
  }

  async encounterStats(startDate?: string, endDate?: string) {
    const params: any[] = [];
    let where = '';
    if (startDate) { where += ' AND date >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND date <= ?'; params.push(endDate); }

    const [rows] = await this.dataSource.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT pid) as uniquePatients
       FROM form_encounter WHERE 1=1${where}`, params,
    );
    const byClass = await this.dataSource.query(
      `SELECT class_code, COUNT(*) as count FROM form_encounter WHERE 1=1${where}
       GROUP BY class_code`, params,
    );
    return { ...rows, byClass };
  }

  async patientStats() {
    const [total] = await this.dataSource.query(`SELECT COUNT(*) as total FROM patient_data`);
    const bySex = await this.dataSource.query(
      `SELECT sex, COUNT(*) as count FROM patient_data GROUP BY sex`,
    );
    const byStatus = await this.dataSource.query(
      `SELECT status, COUNT(*) as count FROM patient_data GROUP BY status`,
    );
    return { ...total, bySex, byStatus };
  }

  async financialStats() {
    const [txn] = await this.dataSource.query(`SELECT COUNT(*) as transactionCount FROM transactions`);
    const [claims] = await this.dataSource.query(`SELECT COUNT(*) as claimCount FROM claims`);
    const [encounters] = await this.dataSource.query(`SELECT COUNT(*) as encounterCount FROM form_encounter`);
    return { ...txn, ...claims, ...encounters };
  }
}

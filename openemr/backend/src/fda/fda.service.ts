import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const FDA_BASE = 'https://api.fda.gov';

@Injectable()
export class FdaService {
  private readonly logger = new Logger(FdaService.name);

  constructor(
    private readonly http: HttpService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  // ── Drug API ──────────────────────────────────────────────

  async searchDrugs(query: { term?: string; brand?: string; limit?: number }) {
    try {
      const search = query.term || query.brand || 'aspirin';
      const url = `${FDA_BASE}/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(search)}"+OR+openfda.generic_name:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return this.mapDrugResults(data, query.term);
    } catch (err: any) {
      return this.handleError('FDA drug search', err);
    }
  }

  async getDrugAdverseEvents(drugName: string, limit = 10) {
    try {
      const url = `${FDA_BASE}/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&limit=${limit}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA drug adverse events', err);
    }
  }

  async getDrugRecalls(drugName?: string, limit = 10) {
    try {
      const search = drugName ? `product_description:"${encodeURIComponent(drugName)}"` : '_exists_:product_description';
      const url = `${FDA_BASE}/drug/enforcement.json?search=${search}&limit=${limit}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA drug recalls', err);
    }
  }

  // ── Device API ────────────────────────────────────────────

  async searchDevices(query: { term?: string; limit?: number }) {
    try {
      const search = query.term || 'pacemaker';
      const url = `${FDA_BASE}/device/classification.json?search=device_name:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA device search', err);
    }
  }

  async getDeviceRecalls(deviceName?: string, limit = 10) {
    try {
      const search = deviceName ? `product_description:"${encodeURIComponent(deviceName)}"` : '_exists_:product_description';
      const url = `${FDA_BASE}/device/enforcement.json?search=${search}&limit=${limit}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA device recalls', err);
    }
  }

  async getDeviceAdverseEvents(deviceName?: string, limit = 10) {
    try {
      const search = deviceName ? `device.brand_name:"${encodeURIComponent(deviceName)}"` : '_exists_:device.brand_name';
      const url = `${FDA_BASE}/device/event.json?search=${search}&limit=${limit}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA device adverse events', err);
    }
  }

  // ── Food API ──────────────────────────────────────────────

  async searchFood(query: { term?: string; limit?: number }) {
    try {
      const search = query.term || 'peanut';
      const url = `${FDA_BASE}/food/enforcement.json?search=product_description:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA food search', err);
    }
  }

  async getFoodAdverseEvents(foodName?: string, limit = 10) {
    try {
      const search = foodName || 'peanut';
      const url = `${FDA_BASE}/food/event.json?search=products.name_brand:"${encodeURIComponent(search)}"&limit=${limit}`;
      const { data } = await firstValueFrom(this.http.get(url, { validateStatus: () => true }));
      return data;
    } catch (err: any) {
      return this.handleError('FDA food adverse events', err);
    }
  }

  // ── Cosmetic API ──────────────────────────────────────────

  async searchCosmetics(query: { term?: string; limit?: number }) {
    try {
      const search = query.term || 'shampoo';
      const url = `${FDA_BASE}/other/substance.json?search=substance_name:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url, { validateStatus: () => true }));
      return data;
    } catch (err: any) {
      return this.handleError('FDA cosmetic search', err);
    }
  }

  // ── Tobacco API ───────────────────────────────────────────

  async searchTobacco(query: { term?: string; limit?: number }) {
    try {
      const search = query.term || 'cigarette';
      const url = `${FDA_BASE}/tobacco/problem.json?search=product_description:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url));
      return data;
    } catch (err: any) {
      return this.handleError('FDA tobacco search', err);
    }
  }

  // ── Other API ─────────────────────────────────────────────

  async searchOther(query: { term?: string; limit?: number }) {
    try {
      const search = query.term || 'vitamin';
      const url = `${FDA_BASE}/other/substance.json?search=substance_name:"${encodeURIComponent(search)}"&limit=${query.limit || 10}`;
      const { data } = await firstValueFrom(this.http.get(url, { validateStatus: () => true }));
      return data;
    } catch (err: any) {
      return this.handleError('FDA other search', err);
    }
  }

  // ── Transparency API ──────────────────────────────────────

  async searchTransparency(query: { type?: string; term?: string; limit?: number }) {
    try {
      const term = query.term || '';
      let url: string;
      switch (query.type) {
        case 'warning':
          url = `${FDA_BASE}/other/warningletter.json?search=letter_type:"${encodeURIComponent(term)}"&limit=${query.limit || 10}`;
          break;
        case 'recall':
          url = `${FDA_BASE}/food/enforcement.json?search=report_date:[20200101+TO+20261231]&limit=${query.limit || 10}`;
          break;
        default:
          url = `${FDA_BASE}/other/inspection.json?search=_exists_:classification&limit=${query.limit || 10}`;
      }
      const { data } = await firstValueFrom(this.http.get(url, { validateStatus: () => true }));
      return data;
    } catch (err: any) {
      return this.handleError('FDA transparency search', err);
    }
  }

  // ── Smart Algorithms ─────────────────────────────────────

  async smartDrugLookup(drugName: string) {
    // FDA drug label
    let fdaData: any = { results: [] };
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${FDA_BASE}/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+OR+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`),
      );
      fdaData = data;
    } catch { /* ignore */ }

    // Patients on this drug
    let patientsOnDrug: any[] = [];
    let interactionWarnings: string[] = [];
    let allergyWarnings: string[] = [];
    try {
      patientsOnDrug = await this.dataSource.query(
        `SELECT p.pid, p.fname, p.lname, p.DOB, p.sex, pr.drug, pr.dosage, pr.start_date, pr.active
         FROM prescriptions pr JOIN patient_data p ON pr.patient_id = p.pid
         WHERE pr.drug LIKE ? AND pr.active = 1 ORDER BY p.lname LIMIT 20`,
        [`%${drugName}%`],
      );

      for (const patient of patientsOnDrug) {
        const otherDrugs = await this.dataSource.query(
          `SELECT drug FROM prescriptions WHERE patient_id = ? AND drug NOT LIKE ? AND active = 1`,
          [patient.pid, `%${drugName}%`],
        );
        if (otherDrugs.length > 0) {
          interactionWarnings.push(`${patient.fname} ${patient.lname} (PID ${patient.pid}) also takes: ${otherDrugs.map((d: any) => d.drug).join(', ')}`);
        }
      }

      for (const patient of patientsOnDrug) {
        const allergies = await this.dataSource.query(
          `SELECT title FROM lists WHERE pid = ? AND type = 'allergy' AND title LIKE ?`,
          [patient.pid, `%${drugName}%`],
        );
        if (allergies.length > 0) {
          allergyWarnings.push(`⚠️ ${patient.fname} ${patient.lname} (PID ${patient.pid}) has an allergy to "${allergies[0].title}"`);
        }
      }
    } catch { /* ignore */ }

    // FDA adverse events
    let adverseEvents: any = { results: [] };
    try {
      const { data: ae } = await firstValueFrom(
        this.http.get(`${FDA_BASE}/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&count=patient.reaction.reactionmeddrapt.exact`),
      );
      adverseEvents = ae;
    } catch { /* ignore */ }

    return {
      drugName,
      fda: fdaData.results?.[0] || null,
      patientsOnDrug,
      patientCount: patientsOnDrug.length,
      interactionWarnings,
      allergyWarnings,
      topAdverseReactions: adverseEvents.results?.slice(0, 10) || [],
    };
  }

  async smartDeviceLookup(deviceName: string) {
    let recalls: any = { results: [] };
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${FDA_BASE}/device/enforcement.json?search=product_description:"${encodeURIComponent(deviceName)}"&limit=5`),
      );
      recalls = data;
    } catch { /* ignore */ }

    let matchingProcedures: any[] = [];
    try {
      matchingProcedures = await this.dataSource.query(
        `SELECT pd.pid, pd.fname, pd.lname, pd.DOB, b.code_text, b.date
         FROM billing b JOIN patient_data pd ON b.pid = pd.pid
         WHERE b.code_text LIKE ? ORDER BY b.date DESC LIMIT 20`,
        [`%${deviceName}%`],
      );
    } catch { /* ignore */ }

    return {
      deviceName,
      fdaRecalls: recalls.results || [],
      recallCount: recalls.results?.length || 0,
      matchingProcedures,
      patientCount: matchingProcedures.length,
    };
  }

  // ── Helpers ─────────────────────────────────────────────

  private mapDrugResults(data: any, term?: string) {
    const results = (data.results || []).map((r: any) => ({
      brandName: r.openfda?.brand_name?.[0] || 'Unknown',
      genericName: r.openfda?.generic_name?.[0] || '',
      manufacturer: r.openfda?.manufacturer_name?.[0] || '',
      indications: r.indications_and_usage?.[0] || '',
      warnings: r.warnings?.[0]?.substring(0, 500) || '',
      adverseReactions: r.adverse_reactions?.[0]?.substring(0, 300) || '',
      dosage: r.dosage_and_administration?.[0]?.substring(0, 300) || '',
      route: r.openfda?.route?.[0] || '',
    }));
    return { term, total: data.meta?.results?.total || 0, results };
  }

  private handleError(context: string, err: any) {
    const msg = err instanceof AxiosError ? `HTTP ${err.response?.status} ${err.message}` : String(err);
    this.logger.error(`${context}: ${msg}`);
    return { error: `Failed to fetch ${context}`, message: msg.substring(0, 200), results: [] };
  }
}

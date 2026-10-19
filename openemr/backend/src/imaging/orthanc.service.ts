import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** One DICOM instance exposed to the viewer through the backend bridge. */
export interface OrthancInstance {
  id: number;
  source: 'orthanc';
  pid: number;
  type: 'xray';
  originalName: string;
  mimeType: 'application/dicom';
  sizeBytes: number;
  description: string;
  uploadedBy: string;
  createdAt: string;
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  modality: string;
  seriesDescription: string;
  seriesNumber: string;
  instanceNumber: string;
}

export interface OrthancStudyList {
  configured: boolean;
  items: OrthancInstance[];
  warnings: string[];
}

type DicomJson = Record<string, { Value?: unknown[] }>;

const UID_PATTERN = /^[0-9]+(?:\.[0-9]+)+$/;
const MAX_STUDIES = 20;
const MAX_SERIES_PER_STUDY = 25;
const MAX_INSTANCES = 500;

/**
 * Authenticated backend bridge to Orthanc's DICOMweb/WADO endpoints.
 *
 * Browser clients never receive Orthanc credentials. They call the existing
 * authenticated OpenRx imaging endpoints, and this service performs QIDO-RS
 * queries and WADO-URI retrieval server-side.
 */
@Injectable()
export class OrthancService {
  private readonly logger = new Logger(OrthancService.name);

  constructor(private readonly config: ConfigService) {}

  private get url(): string {
    return (this.config.get<string>('ORTHANC_URL') || '').replace(/\/+$/, '');
  }

  private get username(): string {
    return this.config.get<string>('ORTHANC_USERNAME') || '';
  }

  private get password(): string {
    return this.config.get<string>('ORTHANC_PASSWORD') || '';
  }

  private get timeoutMs(): number {
    const configured = Number(this.config.get<string>('ORTHANC_TIMEOUT_MS'));
    return Number.isFinite(configured) && configured > 0 ? configured : 15000;
  }

  isConfigured(): boolean {
    return (
      this.url.length > 0 &&
      this.username.length > 0 &&
      this.config.get<string>('ORTHANC_DICOMWEB_ENABLED') !== 'false'
    );
  }

  status() {
    return {
      configured: this.isConfigured(),
      dicomwebEnabled: this.isConfigured(),
      // Never return credentials or the authenticated URL.
      warning: this.isConfigured()
        ? null
        : 'ORTHANC_URL/ORTHANC_USERNAME are not configured. PACS studies are unavailable.',
    };
  }

  private assertUid(value: string, name: string): string {
    if (!value || value.length > 64 || !UID_PATTERN.test(value)) {
      throw new BadRequestException(`Invalid DICOM ${name}.`);
    }
    return value;
  }

  private async request(path: string, accept: string): Promise<Response> {
    const auth = Buffer.from(
      `${this.username}:${this.password}`,
      'utf8',
    ).toString('base64');
    return fetch(`${this.url}${path}`, {
      headers: {
        Accept: accept,
        Authorization: `Basic ${auth}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  private async getDicomJson(path: string): Promise<DicomJson[]> {
    const response = await this.request(path, 'application/dicom+json');
    if (response.status === 204) return [];
    if (!response.ok) {
      throw new Error(`Orthanc returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as unknown;
    return Array.isArray(body) ? (body as DicomJson[]) : [];
  }

  private static text(ds: DicomJson, tag: string): string {
    const value = ds?.[tag]?.Value?.[0];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  }

  /**
   * QIDO-RS study/series/instance discovery for one OpenEMR patient.
   *
   * DICOM PatientID must match the OpenEMR `pid` used by the viewer. Results
   * are capped so a misconfigured PACS cannot exhaust the API or browser.
   */
  async listStudies(patientId: string): Promise<OrthancStudyList> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        items: [],
        warnings: [this.status().warning as string],
      };
    }
    if (!patientId || !/^[A-Za-z0-9._-]{1,64}$/.test(patientId)) {
      throw new BadRequestException('Invalid patient id.');
    }

    const warnings: string[] = [];
    const items: OrthancInstance[] = [];
    try {
      const studyQuery = new URLSearchParams({
        PatientID: patientId,
        limit: String(MAX_STUDIES),
      });
      const studies = await this.getDicomJson(
        `/dicom-web/studies?${studyQuery.toString()}`,
      );
      if (studies.length >= MAX_STUDIES) {
        warnings.push(`Study list limited to ${MAX_STUDIES}.`);
      }

      for (const study of studies.slice(0, MAX_STUDIES)) {
        const studyUid = OrthancService.text(study, '0020000D');
        if (!studyUid) continue;
        const studyDescription = OrthancService.text(study, '00081030');
        const studyDate = OrthancService.text(study, '00080020');
        const patientIdFromStudy =
          OrthancService.text(study, '00100020') || patientId;
        const seriesList = await this.getDicomJson(
          `/dicom-web/studies/${encodeURIComponent(
            studyUid,
          )}/series?limit=${MAX_SERIES_PER_STUDY}`,
        );

        for (const series of seriesList.slice(0, MAX_SERIES_PER_STUDY)) {
          const seriesUid = OrthancService.text(series, '0020000E');
          if (!seriesUid) continue;
          const seriesDescription = OrthancService.text(series, '0008103E');
          const seriesNumber = OrthancService.text(series, '00200011');
          const modality = OrthancService.text(series, '00080060') || 'OT';
          const instances = await this.getDicomJson(
            `/dicom-web/studies/${encodeURIComponent(
              studyUid,
            )}/series/${encodeURIComponent(
              seriesUid,
            )}/instances?limit=${MAX_INSTANCES}`,
          );

          for (const instance of instances) {
            if (items.length >= MAX_INSTANCES) {
              warnings.push(`Instance list limited to ${MAX_INSTANCES}.`);
              break;
            }
            const sopInstanceUid = OrthancService.text(instance, '00080018');
            if (!sopInstanceUid) continue;
            const instanceNumber = OrthancService.text(instance, '00200013');
            const id = -(items.length + 1);
            const label = studyDescription || seriesDescription || studyUid;
            items.push({
              id,
              source: 'orthanc',
              pid: /^\d+$/.test(patientIdFromStudy)
                ? Number(patientIdFromStudy)
                : 0,
              type: 'xray',
              originalName: `${label} · ${
                seriesDescription || seriesUid
              } · ${instanceNumber || sopInstanceUid}`,
              mimeType: 'application/dicom',
              sizeBytes: 0,
              description: studyDescription || seriesDescription || '',
              uploadedBy: 'Orthanc',
              createdAt: studyDate,
              studyInstanceUid: studyUid,
              seriesInstanceUid: seriesUid,
              sopInstanceUid,
              modality,
              seriesDescription,
              seriesNumber,
              instanceNumber,
            });
          }
          if (items.length >= MAX_INSTANCES) break;
        }
        if (items.length >= MAX_INSTANCES) break;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Orthanc error';
      this.logger.warn(`Orthanc study query failed: ${message}`);
      warnings.push('Orthanc could not be queried.');
    }

    return { configured: true, items, warnings };
  }

  /**
   * WADO-RS retrieval. The plugin returns multipart/related even for one
   * instance, so the DICOM part is extracted before it reaches Cornerstone.
   */
  async getInstanceFile(
    studyUid: string,
    seriesUid: string,
    sopInstanceUid: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.isConfigured()) {
      throw new BadGatewayException('Orthanc is not configured.');
    }
    const study = this.assertUid(studyUid, 'StudyInstanceUID');
    const series = this.assertUid(seriesUid, 'SeriesInstanceUID');
    const instance = this.assertUid(sopInstanceUid, 'SOPInstanceUID');

    try {
      const response = await this.request(
        `/dicom-web/studies/${encodeURIComponent(
          study,
        )}/series/${encodeURIComponent(
          series,
        )}/instances/${encodeURIComponent(instance)}`,
        'multipart/related; type="application/dicom"',
      );
      if (!response.ok) {
        throw new Error(`Orthanc returned HTTP ${response.status}`);
      }
      const body = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || '';
      return {
        buffer: OrthancService.extractDicomPart(body, contentType),
        contentType: 'application/dicom',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Orthanc error';
      this.logger.warn(`Orthanc instance retrieval failed: ${message}`);
      throw new BadGatewayException('Orthanc could not retrieve the study.');
    }
  }

  /** Extract the first application/dicom body part from a WADO-RS response. */
  static extractDicomPart(body: Buffer, contentType: string): Buffer {
    const boundary = /boundary="?([^";]+)"?/i.exec(contentType)?.[1];
    if (!boundary) return body;

    const headerEnd = body.indexOf('\r\n\r\n');
    if (headerEnd < 0) {
      throw new Error('Malformed multipart DICOM response.');
    }
    const start = headerEnd + 4;
    const end = body.indexOf(Buffer.from(`\r\n--${boundary}`), start);
    if (end <= start) {
      throw new Error('Multipart DICOM response had no body part.');
    }
    return body.subarray(start, end);
  }
}

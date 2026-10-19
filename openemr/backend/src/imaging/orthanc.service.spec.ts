import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrthancService } from './orthanc.service';

function service(values: Record<string, string>): OrthancService {
  const config = {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return new OrthancService(config);
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/dicom+json' }),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('OrthancService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports an unconfigured bridge without exposing credentials', () => {
    const status = service({}).status();
    expect(status.configured).toBe(false);
    expect(status.warning).toContain('not configured');
    expect(JSON.stringify(status)).not.toContain('password');
  });

  it('maps QIDO-RS studies, series and instances to viewer items', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            '0020000D': { Value: ['1.2.3'] },
            '00081030': { Value: ['Head CT'] },
            '00080020': { Value: ['20261019'] },
            '00100020': { Value: ['17'] },
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            '0020000E': { Value: ['1.2.3.4'] },
            '0008103E': { Value: ['Axial'] },
            '00200011': { Value: [1] },
            '00080060': { Value: ['CT'] },
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            '00080018': { Value: ['1.2.3.4.5'] },
            '00200013': { Value: [7] },
          },
        ]),
      );

    const result = await service({
      ORTHANC_URL: 'https://orthanc.example.test/orthanc',
      ORTHANC_USERNAME: 'openrx',
      ORTHANC_PASSWORD: 'test',
    }).listStudies('17');

    expect(result.configured).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      source: 'orthanc',
      studyInstanceUid: '1.2.3',
      seriesInstanceUid: '1.2.3.4',
      sopInstanceUid: '1.2.3.4.5',
      modality: 'CT',
      instanceNumber: '7',
      pid: 17,
    });
    const mockFetch = global.fetch as unknown as jest.Mock;
    const [url, init] = mockFetch.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toContain(
      'https://orthanc.example.test/orthanc/dicom-web/studies?PatientID=17',
    );
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('openrx:test').toString('base64')}`,
    );
  });

  it('rejects UID path injection', async () => {
    const svc = service({
      ORTHANC_URL: 'https://orthanc.example.test/orthanc',
      ORTHANC_USERNAME: 'openrx',
    });
    await expect(
      svc.getInstanceFile('../admin', '1.2', '1.3'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('extracts the DICOM body from a WADO-RS multipart response', () => {
    const boundary = 'test-boundary';
    const dicom = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/dicom\r\n\r\n`),
      dicom,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    expect(
      OrthancService.extractDicomPart(
        body,
        `multipart/related; type="application/dicom"; boundary="${boundary}"`,
      ),
    ).toEqual(dicom);
  });
});

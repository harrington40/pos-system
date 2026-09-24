import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';

const CATEGORIES = [
  { key: 'drugs', label: 'Drugs', icon: 'bi-capsule', desc: 'FDA drug labels, adverse events, recalls' },
  { key: 'devices', label: 'Devices', icon: 'bi-cpu', desc: 'Medical device classifications, recalls' },
  { key: 'food', label: 'Food', icon: 'bi-egg-fried', desc: 'Food recalls, adverse events' },
  { key: 'cosmetics', label: 'Cosmetics', icon: 'bi-palette', desc: 'Cosmetic product safety data' },
  { key: 'tobacco', label: 'Tobacco', icon: 'bi-exclamation-triangle', desc: 'Tobacco product problem reports' },
  { key: 'other', label: 'Other', icon: 'bi-box', desc: 'Other FDA-regulated substances' },
  { key: 'transparency', label: 'Transparency', icon: 'bi-eye', desc: 'FDA inspections, warning letters, compliance' },
];

export default function FdaLookupPage() {
  const [category, setCategory] = useState('drugs');
  const [searchTerm, setSearchTerm] = useState('');
  const [smartSearch, setSmartSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['fda', category, searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return null;
      const r = await nestClient.get(`/fda/${category}`, { params: { term: searchTerm, limit: 10 } });
      return r.data;
    },
    enabled: searchTerm.length >= 2,
  });

  const { data: smartData, isLoading: smartLoading } = useQuery({
    queryKey: ['fda-smart', smartSearch],
    queryFn: async () => {
      if (!smartSearch.trim()) return null;
      const [drugRes] = await Promise.all([
        nestClient.get('/fda/smart/drug', { params: { drug: smartSearch } }),
      ]);
      return { drug: drugRes.data };
    },
    enabled: smartSearch.length >= 2,
  });

  return (
    <div className="glass-page position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f5faff 45%, #d1fae5 100%)', borderRadius: '20px', minHeight: '100vh', padding: '16px' }}>
      <div className="position-absolute rounded-circle" style={{ width: '340px', height: '340px', top: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(13,110,253,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '400px', height: '400px', bottom: '8%', left: '-120px', background: 'radial-gradient(circle, rgba(0,201,167,0.30), transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}></div>
      <style>{`
        .glass-page .card {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.60) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: 0 22px 45px rgba(10,37,64,0.20), 0 6px 14px rgba(10,37,64,0.10) !important;
          transition: transform .25s ease, box-shadow .25s ease, background .25s ease;
        }
        .glass-page .card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.70) !important;
          box-shadow: 0 30px 60px rgba(10,37,64,0.28), 0 10px 20px rgba(10,37,64,0.14) !important;
        }
        .glass-page .card .card-header,
        .glass-page .card-header {
          background: rgba(255,255,255,0.35) !important;
          border-bottom: 1px solid rgba(255,255,255,0.6) !important;
        }
        .glass-page .table thead.table-light {
          background: rgba(255,255,255,0.35) !important;
        }
      `}</style>

      <div className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #198754 60%, #00c9a7 100%)', zIndex: 1 }}>
        <div className="position-absolute end-0 top-0 opacity-10" style={{ fontSize: '6rem', transform: 'rotate(10deg) translate(20px,-10px)' }}><i className="bi bi-shield-check"></i></div>
        <div className="position-relative">
          <h3 className="mb-1 fw-bold"><i className="bi bi-shield-check me-2"></i>FDA Regulatory Lookup</h3>
          <p className="mb-0 text-white text-opacity-75 small">Search FDA databases for drug labels, device recalls, food safety, and more — powered by openFDA.gov</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`btn btn-sm ${category === cat.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setCategory(cat.key)}
            title={cat.desc}
          >
            <i className={`bi ${cat.icon} me-1`}></i>{cat.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        {/* Simple Search */}
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-header bg-white py-2">
              <h6 className="mb-0"><i className="bi bi-search me-2"></i>Search {CATEGORIES.find(c => c.key === category)?.label}</h6>
            </div>
            <div className="card-body">
              <div className="input-group mb-3">
                <input
                  className="form-control"
                  placeholder={`Search ${category}...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-primary" disabled={!searchTerm}>
                  <i className="bi bi-search"></i>
                </button>
              </div>

              {isLoading && <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"/></div>}
              {error && <div className="alert alert-danger small">Failed to fetch FDA data</div>}

              {data?.results?.length > 0 && (
                <div>
                  <small className="text-muted">{data.total || data.results.length} results</small>
                  {data.results.slice(0, 10).map((r: any, i: number) => (
                    <div key={i} className="card bg-light mb-2 border-0">
                      <div className="card-body py-2 small">
                        {r.brandName && <div><strong>{r.brandName}</strong> {r.genericName && <span className="text-muted">({r.genericName})</span>}</div>}
                        {r.device_name && <div><strong>{r.device_name}</strong></div>}
                        {r.product_description && <div><strong>{r.product_description}</strong></div>}
                        {r.manufacturer && <div className="text-muted">{r.manufacturer}</div>}
                        {r.indications && <div className="mt-1"><span className="fw-semibold">Indications:</span> {r.indications.substring(0, 200)}</div>}
                        {r.warnings && <div className="mt-1 text-danger"><span className="fw-semibold">Warnings:</span> {r.warnings.substring(0, 200)}</div>}
                        {r.recall_number && <div className="mt-1"><span className="badge bg-danger me-1">Recall</span> {r.reason_for_recall?.substring(0, 150)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data && !data.results?.length && searchTerm.length >= 2 && (
                <p className="text-muted small">No results found for "{searchTerm}"</p>
              )}
            </div>
          </div>
        </div>

        {/* Smart Lookup */}
        <div className="col-md-5">
          <div className="card shadow-sm border-primary">
            <div className="card-header bg-primary text-white py-2">
              <h6 className="mb-0"><i className="bi bi-lightbulb me-2"></i>Smart Drug Lookup</h6>
            </div>
            <div className="card-body">
              <p className="small text-muted">Cross-references FDA data with your patients — finds interactions, allergies, and adverse events.</p>
              <div className="input-group mb-3">
                <input
                  className="form-control form-control-sm"
                  placeholder="Enter drug name..."
                  value={smartSearch}
                  onChange={e => setSmartSearch(e.target.value)}
                />
              </div>

              {smartLoading && <div className="text-center py-2"><div className="spinner-border spinner-border-sm text-primary"/></div>}

              {smartData?.drug && (
                <div className="small">
                  {smartData.drug.allergyWarnings?.length > 0 && (
                    <div className="alert alert-danger py-2 mb-2">
                      <i className="bi bi-exclamation-octagon me-1"></i>
                      {smartData.drug.allergyWarnings.map((w: string, i: number) => <div key={i}>{w}</div>)}
                    </div>
                  )}

                  {smartData.drug.interactionWarnings?.length > 0 && (
                    <div className="alert alert-warning py-2 mb-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      <strong>Potential Drug Interactions:</strong>
                      {smartData.drug.interactionWarnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
                    </div>
                  )}

                  <div className="mb-2">
                    <span className="badge bg-info me-1">{smartData.drug.patientCount} patients</span>
                    on this medication in the system
                  </div>

                  {smartData.drug.topAdverseReactions?.length > 0 && (
                    <div className="mt-2">
                      <strong>Top Adverse Reactions:</strong>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {smartData.drug.topAdverseReactions.map((r: any, i: number) => (
                          <span key={i} className="badge bg-light text-dark border">{r.term} ({r.count})</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {smartData.drug.patientsOnDrug?.length > 0 && (
                    <div className="mt-3">
                      <strong>Patients on this drug:</strong>
                      {smartData.drug.patientsOnDrug.map((p: any, i: number) => (
                        <div key={i} className="text-muted">• {p.fname} {p.lname} (PID {p.pid}) — {p.dosage}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

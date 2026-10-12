import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import nestClient from '../../api/nest-client';

interface TableInfo {
  name: string;
  rows: number;
  comment: string;
}

interface ColumnInfo {
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  COLUMN_KEY: string;
  EXTRA: string;
}

export default function DbAdminPage() {
  const { t } = useTranslation();
  const [selectedTable, setSelectedTable] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState('');
  const [queryRunning, setQueryRunning] = useState(false);

  const { data: tables = [] } = useQuery<TableInfo[]>({
    queryKey: ['db-tables'],
    queryFn: async () => {
      const r = await nestClient.get('/db-admin/tables');
      return r.data;
    },
  });

  const { data: columns = [] } = useQuery<ColumnInfo[]>({
    queryKey: ['db-columns', selectedTable],
    queryFn: async () => {
      const r = await nestClient.get(`/db-admin/describe/${selectedTable}`);
      return r.data;
    },
    enabled: !!selectedTable,
  });

  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ['db-rows', selectedTable],
    queryFn: async () => {
      const r = await nestClient.get(`/db-admin/browse/${selectedTable}`);
      return r.data;
    },
    enabled: !!selectedTable,
  });

  const runQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryRunning(true);
    setQueryError('');
    try {
      const r = await nestClient.post('/db-admin/query', { sql: sqlQuery });
      if (r.data.error) {
        setQueryError(r.data.error);
        setQueryResult(null);
      } else {
        setQueryResult(r.data);
        setQueryError('');
      }
    } catch (err: any) {
      setQueryError(err.response?.data?.error || t('admin.db.queryFailed'));
    }
    setQueryRunning(false);
  };

  const totalRows = tables.reduce((sum, t) => sum + (t.rows || 0), 0);

  return (
    <div>
      <h3 className="mb-3">
        <i className="bi bi-database me-2 text-primary"></i>
        {t('admin.db.title')}
      </h3>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card bg-primary bg-opacity-10 border-primary text-center">
            <div className="card-body py-3">
              <div className="fs-3 fw-bold text-primary">{tables.length}</div>
              <small className="text-muted">{t('admin.db.tables')}</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success bg-opacity-10 border-success text-center">
            <div className="card-body py-3">
              <div className="fs-3 fw-bold text-success">{totalRows.toLocaleString()}</div>
              <small className="text-muted">{t('admin.db.totalRows')}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Table List */}
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0"><i className="bi bi-list me-2"></i>{t('admin.db.tables')}</h6>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="table table-sm table-hover mb-0">
                <thead><tr><th>{t('admin.db.tableCol')}</th><th className="text-end">{t('admin.db.rowsCol')}</th></tr></thead>
                <tbody>
                  {tables.map((tbl) => (
                    <tr
                      key={tbl.name}
                      className={selectedTable === tbl.name ? 'table-active' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTable(tbl.name)}
                    >
                      <td className="small">
                        <i className="bi bi-table me-1 text-muted"></i>
                        {tbl.name}
                      </td>
                      <td className="text-end small text-muted">{tbl.rows.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table Details */}
        <div className="col-md-8">
          {selectedTable ? (
            <>
              {/* Columns */}
              <div className="card shadow-sm mb-3">
                <div className="card-header bg-white d-flex justify-content-between">
                  <h6 className="mb-0">
                    <i className="bi bi-table me-2"></i>
                    {selectedTable}
                  </h6>
                  <small className="text-muted">{t('admin.db.columns', { count: columns.length })}</small>
                </div>
                <div className="card-body p-0" style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <table className="table table-sm mb-0 small">
                    <thead>
                      <tr>
                        <th>{t('admin.db.columnCol')}</th><th>{t('admin.db.typeCol')}</th><th>{t('admin.db.nullCol')}</th><th>{t('admin.db.keyCol')}</th><th>{t('admin.db.defaultCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((c) => (
                        <tr key={c.COLUMN_NAME}>
                          <td className="fw-semibold">{c.COLUMN_NAME}</td>
                          <td><code>{c.COLUMN_TYPE}</code></td>
                          <td>{c.IS_NULLABLE === 'YES' ? '✓' : ''}</td>
                          <td>{c.COLUMN_KEY === 'PRI' ? <span className="badge bg-warning text-dark">PK</span> : c.COLUMN_KEY === 'MUL' ? <span className="badge bg-info">FK</span> : ''}</td>
                          <td className="text-muted">{c.COLUMN_DEFAULT ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Rows */}
              <div className="card shadow-sm">
                <div className="card-header bg-white">
                  <h6 className="mb-0"><i className="bi bi-database me-2"></i>{t('admin.db.dataTitle')}</h6>
                </div>
                <div className="card-body p-0" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {rows.length > 0 ? (
                    <table className="table table-sm mb-0 small">
                      <thead>
                        <tr>
                          {Object.keys(rows[0]).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {v === null ? <i>NULL</i> : String(v).slice(0, 100)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 text-muted small">{t('admin.db.noRows')}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5 text-muted">
                <i className="bi bi-arrow-left-circle" style={{ fontSize: '2rem' }}></i>
                <p className="mt-2">{t('admin.db.noSelection')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQL Query Console */}
      <div className="card shadow-sm mt-4">
        <div className="card-header bg-dark text-white">
          <h6 className="mb-0">
            <i className="bi bi-terminal me-2"></i>{t('admin.db.sqlConsole')}
            <small className="text-white-50 ms-2">{t('admin.db.sqlHint')}</small>
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-10">
              <textarea
                className="form-control form-control-sm"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                rows={3}
                placeholder={t('admin.db.sqlPlaceholder')}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) runQuery();
                }}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary btn-sm w-100 h-100"
                onClick={runQuery}
                disabled={queryRunning || !sqlQuery.trim()}
              >
                {queryRunning ? '...' : t('admin.db.run')}
              </button>
            </div>
          </div>

          {queryError && (
            <div className="alert alert-danger small py-2 mt-2 mb-0">
              {queryError}
            </div>
          )}

          {queryResult && (
            <div className="mt-3">
              <small className="text-muted">{t('admin.db.resultRows', { count: queryResult.count })}</small>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                <table className="table table-sm small mt-1 mb-0">
                  <thead>
                    <tr>
                      {queryResult.rows.length > 0 && Object.keys(queryResult.rows[0]).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row: any, i: number) => (
                      <tr key={i}>
                        {Object.values(row).map((v: any, j: number) => (
                          <td key={j} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v === null ? <i className="text-muted">NULL</i> : String(v).slice(0, 100)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

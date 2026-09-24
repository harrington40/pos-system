/** Basic patient record from the OpenEMR API */
export interface Patient {
  id?: number;
  pid?: number;
  uuid: string;
  fname: string;
  lname: string;
  mname?: string;
  dob: string;
  sex: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  provider?: string;
  provider_name?: string;
  pubpid?: string;
  public_id?: string;
  status?: string;
  chart_shared?: boolean;
  image?: string;
  regdate?: string;
  created_by?: number;
}

/** Parameters for searching patients */
export interface PatientSearchParams {
  search?: string;
  fname?: string;
  lname?: string;
  dob?: string;
  limit?: number;
  offset?: number;
}

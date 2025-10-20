export type EncryptedToken = {
  ciphertext: string;
  iv: string;
  createdAt: number;
};

export type VisiblePosting = {
  id?: string | null;
  equipment?: string | null;
  origin: {
    city: string;
    state: string;
  };
  destination: {
    city: string;
    state: string;
  };
  totalMileage?: number | null;
  deadheadMileage?: number | null;
  rate?: number | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  weight?: number | null;
  postedDate?: string | null;
  broker: {
    name: string;
    phone?: string | null;
    email?: string | null;
    mcNumber?: string | null;
  };
  notes?: string | null;
};

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type CompanyProfile = {
  name: string;
  mc: string;
  phone: string;
};

export type IdentityProfile = {
  loginEmail: string;
  senderEmail: string;
};

export type OperationsSettings = {
  deadheadRadius: number;
};

export type TmsSettings = {
  url: string;
  token?: EncryptedToken | null;
};

export type Settings = {
  company: CompanyProfile;
  identity: IdentityProfile;
  emailTemplate: EmailTemplate;
  operations: OperationsSettings;
  tms: TmsSettings;
  allowedHosts: string[];
  telemetryEnabled: boolean;
};

export type BgMsg =
  | { type: 'COMPUTE_RPM'; posting: VisiblePosting; settings: Settings }
  | { type: 'COPY_POSTING'; posting: VisiblePosting; asJson: boolean }
  | { type: 'OPEN_MAILTO'; posting: VisiblePosting; settings: Settings }
  | { type: 'OPEN_TEL'; posting: VisiblePosting }
  | { type: 'SEND_TMS'; posting: VisiblePosting; settings: Settings; notes?: string }
  | { type: 'CHECK_HOST'; url: string }
  | { type: 'TELEMETRY'; event: TelemetryEvent };

export type UiMsg =
  | { type: 'TOGGLE_DRAWER'; open?: boolean }
  | { type: 'TOAST'; variant: 'info' | 'success' | 'error'; message: string }
  | { type: 'HOST_BLOCKED' }
  | { type: 'SETTINGS_UPDATED'; settings: Settings }
  | { type: 'RPM_RESULT'; rpm: number; deadhead: number };

export type TelemetryEvent = {
  action: 'compute' | 'copy' | 'email' | 'call' | 'send_tms' | 'toggle_drawer';
  durationMs: number;
  success: boolean;
  timestamp: number;
};

export type TmsPayload = {
  source: 'DAT';
  record: VisiblePosting;
  company: CompanyProfile & { senderEmail: string };
  notes?: string;
};

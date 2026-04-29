const configuredApiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
export const apiBase = configuredApiBase === "/" ? "" : configuredApiBase;

export const workspaceId = "11111111-1111-1111-1111-111111111111";
export const userId = "22222222-2222-2222-2222-222222222222";
export const authTokenKey = "calbook.authToken";
export const authUserKey = "calbook.authUser";

export type AppointmentType = {
  id: string;
  assignedUserId: string;
  name: string;
  description?: string;
  slug: string;
  durationMinutes: number;
  locationType: "Online" | "Phone" | "InPerson" | "Custom";
  locationValue?: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maximumBookingWindowDays: number;
  serviceIntervalMinutes: number;
  lookBusyPercentage: number;
  timezone: string;
  isActive: boolean;
};

export type AvailabilityRule = {
  id?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone?: string;
};

export type Slot = {
  startUtc: string;
  endUtc: string;
  displayStart: string;
};

export type Booking = {
  id: string;
  appointmentTypeId: string;
  status: string;
  startUtc: string;
  endUtc: string;
  customerName: string;
  customerEmail: string;
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  source?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, ContactCustomField>;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type ContactCustomField = {
  type: string;
  value: string | string[] | boolean;
  options?: string[];
};

export type ContactTask = {
  id: string;
  contactId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "Open" | "Done";
  createdAtUtc?: string;
  completedAtUtc?: string;
};

export type ContactActivity = {
  id: string;
  contactId: string;
  type: string;
  title: string;
  description?: string;
  occurredAtUtc: string;
  metadata?: Record<string, string>;
};

export type PipelineStage = {
  id: string;
  name: string;
  order: number;
};

export type Pipeline = {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  isDefault?: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type Opportunity = {
  id: string;
  pipelineId: string;
  stageId: string;
  contactId?: string;
  contactName?: string;
  title: string;
  value: number;
  currency: string;
  status: "Open" | "Won" | "Lost";
  expectedCloseDate?: string;
  source?: string;
  notes?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type AutomationTrigger = {
  type: string;
  filters?: Record<string, string>;
};

export type AutomationAction = {
  id: string;
  type: string;
  config: Record<string, string>;
};

export type AutomationRule = {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  triggers?: AutomationTrigger[];
  actions: AutomationAction[];
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type UnavailabilityDate = {
  date: string;
  reason?: string;
};

export type AuthUser = {
  email: string;
  workspaceSlug: string;
  workspaceName: string;
  userId: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ThemeConfig = {
  preset: string;
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  displayFont: string;
  bodyFont: string;
};

export function getAuthToken() {
  return localStorage.getItem(authTokenKey);
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(authUserKey);
  return raw ? JSON.parse(raw) as AuthUser : null;
}

export function saveAuth(auth: AuthResponse) {
  localStorage.setItem(authTokenKey, auth.token);
  localStorage.setItem(authUserKey, JSON.stringify(auth.user));
}

export function clearAuth() {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(authUserKey);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceId,
      "X-User-Id": userId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.text();
    let message = error || `${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(error) as { error?: string };
      message = parsed.error || message;
    } catch {
      // Keep the original response text when the API did not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

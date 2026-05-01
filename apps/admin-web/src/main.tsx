import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar, Check, Clock, Copy, ExternalLink, Lock, LogOut, MapPin, Megaphone, Plus, Save, Settings, Trash2, Users, Workflow } from "lucide-react";
import "./index.css";
import { activeSubAccountKey, api, apiBase, AppointmentType, AutomationAction, AutomationRule, AvailabilityRule, AuthResponse, AuthUser, Booking, Contact, ContactActivity, ContactCustomField, ContactTask, MarketingAccount, MarketingCampaign, MarketingTracking, Opportunity, Pipeline, SitePage, Slot, SubAccount, ThemeConfig, UnavailabilityDate, WhiteLabelSettings, WorkspaceRole, WorkspaceUser, clearAuth, getAuthUser, saveAuth, userId } from "./api";

const defaultAppointment: Omit<AppointmentType, "id" | "isActive"> = {
  assignedUserId: userId,
  name: "Strategy Session",
  description: "A focused session for new clients.",
  slug: "strategy-session",
  durationMinutes: 45,
  locationType: "Online",
  locationValue: "Meeting link provided after booking",
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 15,
  minimumNoticeMinutes: 120,
  maximumBookingWindowDays: 30,
  serviceIntervalMinutes: 15,
  lookBusyPercentage: 0,
  timezone: "Australia/Sydney"
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const themePresets: ThemeConfig[] = [
  { preset: "bright", primary: "#2563eb", secondary: "#34a853", accent: "#fbbc05", danger: "#ea4335", background: "#f6f7fb", surface: "#ffffff", text: "#16202a", muted: "#64748b", displayFont: "Plus Jakarta Sans", bodyFont: "Inter" },
  { preset: "clinic", primary: "#0f766e", secondary: "#38bdf8", accent: "#f59e0b", danger: "#dc2626", background: "#f4fbfa", surface: "#ffffff", text: "#102a2a", muted: "#5b7080", displayFont: "Plus Jakarta Sans", bodyFont: "Inter" },
  { preset: "creator", primary: "#7c3aed", secondary: "#ec4899", accent: "#f97316", danger: "#ef4444", background: "#fbf7ff", surface: "#ffffff", text: "#211633", muted: "#6b5d7a", displayFont: "Plus Jakarta Sans", bodyFont: "Inter" },
  { preset: "studio", primary: "#111827", secondary: "#06b6d4", accent: "#84cc16", danger: "#ef4444", background: "#f8fafc", surface: "#ffffff", text: "#111827", muted: "#64748b", displayFont: "Inter", bodyFont: "Inter" },
  { preset: "executive", primary: "#1e3a8a", secondary: "#64748b", accent: "#d97706", danger: "#b91c1c", background: "#f7f9fc", surface: "#ffffff", text: "#111827", muted: "#5b677a", displayFont: "Manrope", bodyFont: "Inter" },
  { preset: "wellness", primary: "#2f855a", secondary: "#14b8a6", accent: "#f4a261", danger: "#e76f51", background: "#f6fbf6", surface: "#ffffff", text: "#1d3028", muted: "#60756b", displayFont: "Lora", bodyFont: "DM Sans" },
  { preset: "fitness", primary: "#dc2626", secondary: "#111827", accent: "#facc15", danger: "#991b1b", background: "#fff7f7", surface: "#ffffff", text: "#171717", muted: "#6b7280", displayFont: "Montserrat", bodyFont: "Inter" },
  { preset: "luxury", primary: "#6d4c1d", secondary: "#111827", accent: "#c8a24a", danger: "#9f1239", background: "#fbfaf7", surface: "#ffffff", text: "#1f1b16", muted: "#746b5d", displayFont: "Playfair Display", bodyFont: "DM Sans" },
  { preset: "minimal", primary: "#0f172a", secondary: "#475569", accent: "#0ea5e9", danger: "#dc2626", background: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#64748b", displayFont: "Inter", bodyFont: "Inter" },
  { preset: "sunrise", primary: "#e11d48", secondary: "#f97316", accent: "#facc15", danger: "#be123c", background: "#fff7ed", surface: "#ffffff", text: "#2a1515", muted: "#795548", displayFont: "Poppins", bodyFont: "DM Sans" },
  { preset: "ocean", primary: "#0369a1", secondary: "#0f766e", accent: "#38bdf8", danger: "#e11d48", background: "#f0f9ff", surface: "#ffffff", text: "#102a43", muted: "#557086", displayFont: "Nunito Sans", bodyFont: "Inter" },
  { preset: "orchid", primary: "#9333ea", secondary: "#db2777", accent: "#22c55e", danger: "#f43f5e", background: "#faf5ff", surface: "#ffffff", text: "#2e123f", muted: "#7e6a92", displayFont: "Outfit", bodyFont: "DM Sans" },
  { preset: "sage", primary: "#4d7c0f", secondary: "#0f766e", accent: "#ca8a04", danger: "#b91c1c", background: "#f7fbef", surface: "#ffffff", text: "#1f2a17", muted: "#66765a", displayFont: "Lora", bodyFont: "Nunito Sans" },
  { preset: "slate", primary: "#334155", secondary: "#0ea5e9", accent: "#f97316", danger: "#ef4444", background: "#f8fafc", surface: "#ffffff", text: "#111827", muted: "#64748b", displayFont: "Manrope", bodyFont: "Inter" }
];

const defaultTheme = themePresets[0];
const fontOptions = ["Inter", "Plus Jakarta Sans", "Poppins", "DM Sans", "Manrope", "Montserrat", "Lora", "Playfair Display", "Nunito Sans", "Outfit"];

const emptyContact: Omit<Contact, "id"> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  timezone: "Australia/Sydney",
  source: "Manual",
  notes: "",
  tags: [],
  customFields: {}
};

const emptyTask = { title: "", description: "", dueDate: "" };
const emptyPipeline = { name: "", description: "", stages: [{ id: "stage-1-new-lead", name: "New Lead" }, { id: "stage-2-qualified", name: "Qualified" }, { id: "stage-3-proposal", name: "Proposal" }, { id: "stage-4-won", name: "Won" }] };
const emptyOpportunity = { title: "", value: 0, currency: "AUD", contactId: "", expectedCloseDate: "", source: "", notes: "" };
const automationTriggerOptions = [
  { value: "AppointmentBooked", label: "Appointment booked", module: "Scheduling" },
  { value: "BookingCancelled", label: "Booking cancelled", module: "Scheduling" },
  { value: "AppointmentStartsSoon", label: "Appointment starts soon", module: "Scheduling" },
  { value: "AppointmentTypeCreated", label: "Appointment type created", module: "Scheduling" },
  { value: "AvailabilityChanged", label: "Availability changed", module: "Scheduling" },
  { value: "ContactCreated", label: "Contact created", module: "Contacts" },
  { value: "ContactUpdated", label: "Contact updated", module: "Contacts" },
  { value: "ContactTagAdded", label: "Contact tag added", module: "Contacts" },
  { value: "PageVisited", label: "Booking page visited", module: "Tracking" },
  { value: "OpportunityCreated", label: "Opportunity created", module: "Opportunities" },
  { value: "OpportunityMoved", label: "Opportunity moved", module: "Opportunities" },
  { value: "PipelineCreated", label: "Pipeline created", module: "Opportunities" },
  { value: "AutomationStarted", label: "Automation started", module: "Automations" },
  { value: "ExternalWebhook", label: "External webhook received", module: "Automations" },
  { value: "RecurringSchedule", label: "Recurring schedule", module: "Automations" },
  { value: "SitePageCreated", label: "Site page created", module: "Sites" },
  { value: "SitePagePublished", label: "Site page published", module: "Sites" },
  { value: "SitePageVisited", label: "Site page visited", module: "Sites" },
  { value: "TaskCompleted", label: "Task completed", module: "Tasks" }
];
const automationActionOptions = [
  { value: "CreateTask", label: "Create task" },
  { value: "AddContactTag", label: "Add contact tag" },
  { value: "RemoveContactTag", label: "Remove contact tag" },
  { value: "SendEmail", label: "Send email" },
  { value: "InternalNotification", label: "Internal notification" },
  { value: "Webhook", label: "Webhook" },
  { value: "CallExternalApi", label: "Call external API" },
  { value: "CreateOpportunity", label: "Create opportunity" },
  { value: "MoveOpportunity", label: "Move opportunity" },
  { value: "TriggerEvent", label: "Trigger event" },
  { value: "SetData", label: "Set workflow data" },
  { value: "IfElse", label: "If / else condition" },
  { value: "Wait", label: "Wait" },
  { value: "Branch", label: "Branch" },
  { value: "Goal", label: "Goal" },
  { value: "StartAutomation", label: "Start another automation" },
  { value: "StopAutomation", label: "Stop automation" }
];

type AutomationFormAction = {
  id: string;
  type: string;
  configText: string;
  then?: AutomationFormAction[];
  else?: AutomationFormAction[];
  branches?: Array<{ id: string; label: string; steps: AutomationFormAction[] }>;
};

type AutomationForm = {
  name: string;
  description: string;
  triggers: Array<{ id: string; type: string; filterKey: string; filterValue: string }>;
  actions: AutomationFormAction[];
  isActive: boolean;
};

function configTextToObject(configText = "") {
  return Object.fromEntries(configText.split("\n").map((line) => {
    const [key, ...valueParts] = line.split("=");
    return [key.trim(), valueParts.join("=").trim()];
  }).filter(([key]) => key));
}

function configObjectToText(config: Record<string, string>) {
  return Object.entries(config ?? {}).map(([key, value]) => `${key}=${value}`).join("\n");
}

function updateConfigText(configText: string, key: string, value: string) {
  return configObjectToText({ ...configTextToObject(configText), [key]: value });
}

const emptyAutomation: AutomationForm = {
  name: "",
  description: "",
  triggers: [{ id: "trigger-1", type: "AppointmentBooked", filterKey: "", filterValue: "" }],
  actions: [
    { id: "action-1", type: "SendEmail", configText: "to={{contact.email}}\nsubject=Appointment confirmed: {{appointment.name}}\nbody=Hi {{contact.firstName}}, your appointment is booked for {{appointment.startAt}}." },
    { id: "action-2", type: "CreateOpportunity", configText: "pipelineId={{defaultPipeline.id}}\nstageId={{defaultStage.id}}\ntitle={{appointment.name}} - {{contact.fullName}}\nvalue=0\nsource=Appointment" },
    { id: "action-3", type: "Wait", configText: "until={{appointment.startAt}}\noffsetHours=-24" },
    { id: "action-4", type: "SendEmail", configText: "to={{contact.email}}\nsubject=Reminder: appointment tomorrow\nbody=We will see you at {{appointment.startAt}}." },
    { id: "action-5", type: "Wait", configText: "until={{appointment.startAt}}\noffsetMinutes=-10" },
    { id: "action-6", type: "SendEmail", configText: "to={{contact.email}}\nsubject=Starting soon\nbody=Your appointment starts in 10 minutes." }
  ],
  isActive: true
};
const emptySitePage: Omit<SitePage, "id"> = {
  name: "New Landing Page",
  slug: "new-landing-page",
  status: "Draft",
  template: "coach",
  seoTitle: "New Landing Page",
  seoDescription: "A focused landing page for your business.",
  theme: defaultTheme,
  sections: [
    { id: "hero", type: "hero", eyebrow: "For ambitious clients", headline: "Turn interest into booked calls", body: "A polished landing page for your offer, services, and next step.", buttonText: "Book a call", buttonUrl: "/book/myaurahub-test-workspace/discovery-call" },
    { id: "features", type: "features", headline: "What you get", body: "Clear outcomes, simple process, and a direct path to work together.", items: ["Personalized guidance", "Simple online booking", "Clear next steps"] },
    { id: "cta", type: "cta", headline: "Ready to start?", body: "Choose a time and we will map out the next best step.", buttonText: "Schedule now", buttonUrl: "/book/myaurahub-test-workspace/discovery-call" }
  ]
};
const siteSectionTypes: SitePage["sections"][number]["type"][] = ["hero", "text", "image", "columns", "split", "features", "cta"];
const sitePagePresets = [
  { id: "blank", label: "Blank page" },
  { id: "coach", label: "Coach" },
  { id: "performance", label: "Performance coach" },
  { id: "clinic", label: "Clinic" },
  { id: "personal", label: "Personal brand" }
];
const customFieldTypes = [
  { group: "Text input", options: [["text", "Single line"], ["multiline", "Multiline"], ["textList", "Text box list"]] },
  { group: "Values", options: [["number", "Number"], ["phone", "Phone"], ["currency", "Currency"]] },
  { group: "Options", options: [["dropdownSingle", "Dropdown (single)"], ["dropdownMultiple", "Dropdown (multiple)"], ["radio", "Radio"], ["checkbox", "Checkbox"]] },
  { group: "Others", options: [["date", "Date picker"], ["file", "File upload"], ["signature", "Signature"]] }
];
const permissionKeys = ["scheduling", "contacts", "opportunities", "automations", "sites", "settings", "team", "billing"];
const roleTemplates: Record<string, Record<string, boolean>> = {
  Owner: { scheduling: true, contacts: true, opportunities: true, automations: true, sites: true, settings: true, team: true, billing: true },
  Admin: { scheduling: true, contacts: true, opportunities: true, automations: true, sites: true, settings: true, team: true, billing: false },
  Manager: { scheduling: true, contacts: true, opportunities: true, automations: true, sites: true, settings: false, team: false, billing: false },
  Staff: { scheduling: true, contacts: true, opportunities: false, automations: false, sites: false, settings: false, team: false, billing: false },
  Viewer: { scheduling: true, contacts: true, opportunities: true, automations: true, sites: true, settings: false, team: false, billing: false }
};
const emptyTeamUser = { firstName: "", lastName: "", email: "", password: "", role: "Staff", permissions: roleTemplates.Staff, status: "Active" as "Active" | "Inactive" };
const emptyRole = { name: "", description: "", permissions: roleTemplates.Staff };
type SubAccountForm = {
  name: string;
  slug: string;
  ownerEmail: string;
  accessEmail: string;
  accessRole: string;
  status: "Active" | "Inactive";
  members: NonNullable<SubAccount["members"]>;
};
const emptySubAccount: SubAccountForm = { name: "", slug: "", ownerEmail: "", accessEmail: "", accessRole: "Admin", status: "Active", members: [] };
const emptyMarketingAccount = { provider: "Meta", accountName: "", accountId: "", status: "NeedsAuth" as "Connected" | "NeedsAuth" | "Disabled" };
const emptyCampaign = { name: "", channel: "Social", status: "Draft" as MarketingCampaign["status"], objective: "", audience: "", content: "", scheduledAt: "", accountIds: [] as string[], trackingCode: "" };

function Router() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const siteRoute = new URLSearchParams(window.location.search).get("site") || (pathParts.length === 2 && pathParts[0] !== "book" ? `${pathParts[0]}/${pathParts[1]}` : "");
  if (siteRoute) return <PublicSitePage siteRoute={siteRoute} />;
  return window.location.pathname.startsWith("/book/") ? <PublicBookingPage /> : <AdminApp />;
}

function AdminApp() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [sitePages, setSitePages] = useState<SitePage[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [marketingAccounts, setMarketingAccounts] = useState<MarketingAccount[]>([]);
  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>([]);
  const [marketingTracking, setMarketingTracking] = useState<MarketingTracking>({});
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelSettings>({ brandName: "", supportEmail: "", customDomain: "", logoUrl: "", agencyMode: true, resellerName: "", hidePoweredBy: false });
  const [teamForm, setTeamForm] = useState(emptyTeamUser);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [subAccountForm, setSubAccountForm] = useState(emptySubAccount);
  const [marketingAccountForm, setMarketingAccountForm] = useState(emptyMarketingAccount);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);
  const [editingTeamUserId, setEditingTeamUserId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingSubAccountId, setEditingSubAccountId] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [pipelineForm, setPipelineForm] = useState(emptyPipeline);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [opportunityModalStageId, setOpportunityModalStageId] = useState<string | null>(null);
  const [automationForm, setAutomationForm] = useState(emptyAutomation);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [automationView, setAutomationView] = useState<"list" | "editor">("list");
  const [automationZoom, setAutomationZoom] = useState(0.85);
  const [siteForm, setSiteForm] = useState<Omit<SitePage, "id">>(emptySitePage);
  const [editingSitePageId, setEditingSitePageId] = useState<string | null>(null);
  const [selectedSiteSectionId, setSelectedSiteSectionId] = useState(emptySitePage.sections[0].id);
  const [sitePageModalOpen, setSitePageModalOpen] = useState(false);
  const [siteView, setSiteView] = useState<"sites" | "pages" | "editor">("sites");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<Omit<Contact, "id">>(emptyContact);
  const [contactTasks, setContactTasks] = useState<ContactTask[]>([]);
  const [contactActivity, setContactActivity] = useState<ContactActivity[]>([]);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [customFieldDraft, setCustomFieldDraft] = useState({ name: "", type: "text", value: "", options: "" });
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityDate[]>([]);
  const [form, setForm] = useState(defaultAppointment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calendars" | "availability" | "bookings" | "schedulingSettings" | "contacts" | "opportunities" | "pipelines" | "automations" | "sites" | "marketing" | "team" | "settings" | "profile">("calendars");
  const [appointmentView, setAppointmentView] = useState<"list" | "editor">("list");
  const [contactView, setContactView] = useState<"list" | "editor">("list");
  const [pipelineView, setPipelineView] = useState<"list" | "editor">("list");
  const [marketingView, setMarketingView] = useState<"campaigns" | "accounts" | "tracking">("campaigns");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [savingTheme, setSavingTheme] = useState(false);
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours">("minutes");
  const [noticeUnit, setNoticeUnit] = useState<"minutes" | "hours">("hours");
  const [activeSubAccountId, setActiveSubAccountId] = useState(() => localStorage.getItem(activeSubAccountKey) ?? "agency");
  const activeSubAccount = subAccounts.find((account) => account.id === activeSubAccountId);
  const loadSequence = useRef(0);

  if (!authUser) {
    return <AuthPage onAuthenticated={setAuthUser} />;
  }

  async function load(contextSubAccountId = activeSubAccountId, sequence = loadSequence.current) {
    const scopedInit = { headers: { "X-Sub-Account-Id": contextSubAccountId === "agency" ? "" : contextSubAccountId } };
    const [appointmentData, bookingData, contactData, pipelineData, opportunityData, automationData, sitePageData, availabilityData, unavailableData, themeData, userData, roleData, subAccountData, whiteLabelData, marketingAccountData, campaignData, trackingData] = await Promise.all([
      api<AppointmentType[]>("/api/calendar/appointment-types", scopedInit),
      api<Booking[]>("/api/calendar/bookings", scopedInit),
      api<Contact[]>("/api/contacts", scopedInit),
      api<Pipeline[]>("/api/opportunities/pipelines", scopedInit),
      api<Opportunity[]>("/api/opportunities", scopedInit),
      api<AutomationRule[]>("/api/automations", scopedInit),
      api<SitePage[]>("/api/sites/pages", scopedInit),
      api<AvailabilityRule[]>("/api/calendar/availability/me", scopedInit),
      api<UnavailabilityDate[]>("/api/calendar/unavailability", scopedInit),
      api<ThemeConfig>("/api/workspace/theme"),
      api<WorkspaceUser[]>("/api/workspace/users").catch(() => []),
      api<WorkspaceRole[]>("/api/workspace/roles").catch(() => []),
      api<SubAccount[]>("/api/workspace/subaccounts").catch(() => []),
      api<WhiteLabelSettings>("/api/workspace/white-label").catch(() => ({ brandName: authUser?.workspaceName ?? "", agencyMode: true, hidePoweredBy: false })),
      api<MarketingAccount[]>("/api/marketing/accounts", scopedInit).catch(() => []),
      api<MarketingCampaign[]>("/api/marketing/campaigns", scopedInit).catch(() => []),
      api<MarketingTracking>("/api/marketing/tracking", scopedInit).catch(() => ({}))
    ]);
    if (sequence !== loadSequence.current) return;
    setAppointments(appointmentData);
    setBookings(bookingData);
    setContacts(contactData);
    setPipelines(pipelineData);
    setOpportunities(opportunityData);
    setAutomations(automationData);
    setSitePages(sitePageData);
    setSelectedPipelineId((current) => current || pipelineData[0]?.id || "");
    setRules(availabilityData.map((rule) => ({ ...rule, startTime: rule.startTime.slice(0, 5), endTime: rule.endTime.slice(0, 5) })));
    setUnavailability(unavailableData);
    setTheme(themeData);
    setWorkspaceUsers(userData);
    setWorkspaceRoles(roleData);
    setSubAccounts(subAccountData);
    setActiveSubAccountId((current) => {
      const next = current === "agency" || subAccountData.some((account) => account.id === current) ? current : "agency";
      localStorage.setItem(activeSubAccountKey, next);
      return next;
    });
    setWhiteLabel({ ...{ brandName: authUser?.workspaceName ?? "", supportEmail: "", customDomain: "", logoUrl: "", agencyMode: true, resellerName: "", hidePoweredBy: false }, ...whiteLabelData });
    setMarketingAccounts(marketingAccountData);
    setMarketingCampaigns(campaignData);
    setMarketingTracking(trackingData);
  }

  useEffect(() => {
    const sequence = ++loadSequence.current;
    load(activeSubAccountId, sequence).catch((error) => {
      if (sequence !== loadSequence.current) return;
      if (error.message.includes("401") || error.message.toLowerCase().includes("login required")) {
        clearAuth();
        setAuthUser(null);
      } else {
        setMessage(error.message);
      }
    });
  }, [authUser, activeSubAccountId]);

  function switchSubAccount(subAccountId: string) {
    setActiveSubAccountId(subAccountId);
    localStorage.setItem(activeSubAccountKey, subAccountId);
    setSelectedContactId(null);
    setContactView("list");
    setAppointmentView("list");
    setPipelineView("list");
    setAutomationView("list");
    setSiteView("sites");
  }

  async function saveAppointment() {
    if (!form.name.trim() || !form.slug.trim()) {
      setMessageTone("error");
      setMessage("Name and slug are required.");
      return;
    }

    setSavingAppointment(true);
    setMessage("");
    try {
      await api<AppointmentType>(editingId ? `/api/calendar/appointment-types/${editingId}` : "/api/calendar/appointment-types", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase()
        })
      });
      setMessageTone("success");
      setMessage(editingId ? "Appointment type updated. Customer calendar will use the new settings." : "Appointment type created.");
      setEditingId(null);
      setForm({ ...defaultAppointment, slug: `strategy-session-${Date.now().toString().slice(-5)}` });
      setAppointmentView("list");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save appointment type.");
    } finally {
      setSavingAppointment(false);
    }
  }

  async function toggleAppointmentActive(item: AppointmentType) {
    setMessage("");
    try {
      await api<AppointmentType>(`/api/calendar/appointment-types/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, isActive: !item.isActive })
      });
      setMessageTone("success");
      setMessage(item.isActive ? "Appointment type made inactive. Its public booking page is no longer available." : "Appointment type reactivated.");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update appointment status.");
    }
  }

  async function deleteAppointment(item: AppointmentType) {
    if (!window.confirm(`Delete "${item.name}" permanently? This is only allowed when it has no bookings.`)) return;
    setMessage("");
    try {
      await api(`/api/calendar/appointment-types/${item.id}`, { method: "DELETE" });
      setMessageTone("success");
      setMessage("Appointment type deleted.");
      if (editingId === item.id) {
        setEditingId(null);
        setForm(defaultAppointment);
      }
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not delete appointment type.");
    }
  }

  async function saveAvailability() {
    if (!authUser) return;
    setSavingAvailability(true);
    setMessage("");
    try {
      await api(`/api/calendar/users/${authUser.userId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ timezone: "Australia/Sydney", rules })
      });
      setMessageTone("success");
      setMessage("Availability saved. Customer calendar will use the updated hours.");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save availability.");
    } finally {
      setSavingAvailability(false);
    }
  }

  async function saveUnavailability() {
    await api("/api/calendar/unavailability", {
      method: "PUT",
      body: JSON.stringify({ dates: unavailability })
    });
    setMessage("Unavailable dates saved. Customer calendar will hide those dates.");
    await load();
  }

  async function saveTheme() {
    setSavingTheme(true);
    setMessage("");
    try {
      const saved = await api<ThemeConfig>("/api/workspace/theme", {
        method: "PUT",
        body: JSON.stringify(theme)
      });
      setTheme(saved);
      setMessageTone("success");
      setMessage("Theme saved. Public booking pages will use these brand settings.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save theme.");
    } finally {
      setSavingTheme(false);
    }
  }

  function editTeamUser(member: WorkspaceUser) {
    setEditingTeamUserId(member.id);
    setTeamForm({ firstName: member.firstName ?? "", lastName: member.lastName ?? "", email: member.email, password: "", role: member.role, permissions: member.permissions ?? roleTemplates[member.role] ?? roleTemplates.Staff, status: member.status });
  }

  async function saveTeamUser() {
    if (!teamForm.email.trim()) {
      setMessageTone("error");
      setMessage("Team member email is required.");
      return;
    }
    const saved = await api<WorkspaceUser>(editingTeamUserId ? `/api/workspace/users/${editingTeamUserId}` : "/api/workspace/users", {
      method: editingTeamUserId ? "PUT" : "POST",
      body: JSON.stringify(teamForm)
    });
    setWorkspaceUsers(editingTeamUserId ? workspaceUsers.map((item) => item.id === saved.id ? saved : item) : [...workspaceUsers, saved]);
    setTeamForm(emptyTeamUser);
    setEditingTeamUserId(null);
    setMessageTone("success");
    setMessage(saved.temporaryPassword ? `User saved. Temporary password: ${saved.temporaryPassword}` : "User saved.");
  }

  async function toggleTeamUser(member: WorkspaceUser) {
    const saved = await api<WorkspaceUser>(`/api/workspace/users/${member.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...member, status: member.status === "Active" ? "Inactive" : "Active" })
    });
    setWorkspaceUsers(workspaceUsers.map((item) => item.id === saved.id ? saved : item));
    setMessageTone("success");
    setMessage(saved.status === "Active" ? "User activated." : "User deactivated.");
  }

  async function saveWhiteLabel() {
    const saved = await api<WhiteLabelSettings>("/api/workspace/white-label", { method: "PUT", body: JSON.stringify(whiteLabel) });
    setWhiteLabel(saved);
    setMessageTone("success");
    setMessage("White-label settings saved.");
  }

  async function saveWorkspaceRole() {
    if (!roleForm.name.trim()) {
      setMessageTone("error");
      setMessage("Role name is required.");
      return;
    }
    const saved = await api<WorkspaceRole>(editingRoleId ? `/api/workspace/roles/${editingRoleId}` : "/api/workspace/roles", {
      method: editingRoleId ? "PUT" : "POST",
      body: JSON.stringify(roleForm)
    });
    setWorkspaceRoles(editingRoleId ? workspaceRoles.map((item) => item.id === saved.id ? saved : item) : [...workspaceRoles, saved]);
    setRoleForm(emptyRole);
    setEditingRoleId(null);
    setMessageTone("success");
    setMessage("Role saved.");
  }

  async function saveSubAccount() {
    if (!subAccountForm.name.trim()) {
      setMessageTone("error");
      setMessage("Subaccount name is required.");
      return;
    }
    const members = [...subAccountForm.members];
    const accessEmail = subAccountForm.accessEmail.trim().toLowerCase();
    if (accessEmail && !members.some((member) => member.email.toLowerCase() === accessEmail)) {
      members.push({ userId: "", email: accessEmail, role: subAccountForm.accessRole, permissions: roleTemplates[subAccountForm.accessRole] ?? roleTemplates.Staff });
    }
    const saved = await api<SubAccount>(editingSubAccountId ? `/api/workspace/subaccounts/${editingSubAccountId}` : "/api/workspace/subaccounts", {
      method: editingSubAccountId ? "PUT" : "POST",
      body: JSON.stringify({ ...subAccountForm, members, slug: subAccountForm.slug || slugifyLocal(subAccountForm.name) })
    });
    setSubAccounts(editingSubAccountId ? subAccounts.map((item) => item.id === saved.id ? saved : item) : [...subAccounts, saved]);
    setActiveSubAccountId(saved.id);
    localStorage.setItem(activeSubAccountKey, saved.id);
    setSubAccountForm(emptySubAccount);
    setEditingSubAccountId(null);
    setMessageTone("success");
    setMessage("Subaccount saved and selected.");
  }

  async function saveMarketingAccount() {
    if (!marketingAccountForm.accountName.trim()) {
      setMessageTone("error");
      setMessage("Account name is required.");
      return;
    }
    const saved = await api<MarketingAccount>("/api/marketing/accounts", { method: "POST", body: JSON.stringify(marketingAccountForm) });
    setMarketingAccounts([...marketingAccounts, saved]);
    setMarketingAccountForm(emptyMarketingAccount);
    setMessageTone("success");
    setMessage("Marketing account added.");
  }

  async function saveCampaign() {
    if (!campaignForm.name.trim()) {
      setMessageTone("error");
      setMessage("Campaign name is required.");
      return;
    }
    const saved = await api<MarketingCampaign>(editingCampaignId ? `/api/marketing/campaigns/${editingCampaignId}` : "/api/marketing/campaigns", {
      method: editingCampaignId ? "PUT" : "POST",
      body: JSON.stringify(campaignForm)
    });
    setMarketingCampaigns(editingCampaignId ? marketingCampaigns.map((item) => item.id === saved.id ? saved : item) : [saved, ...marketingCampaigns]);
    setCampaignForm(emptyCampaign);
    setEditingCampaignId(null);
    setMessageTone("success");
    setMessage("Campaign saved.");
  }

  async function saveMarketingTracking() {
    const saved = await api<MarketingTracking>("/api/marketing/tracking", { method: "PUT", body: JSON.stringify(marketingTracking) });
    setMarketingTracking(saved);
    setMessageTone("success");
    setMessage("Tracking settings saved.");
  }

  async function openContact(contact: Contact) {
    setSelectedContactId(contact.id);
    setContactForm({ ...emptyContact, ...contact, customFields: contact.customFields ?? {}, tags: contact.tags ?? [] });
    const [tasks, activity] = await Promise.all([
      api<ContactTask[]>(`/api/contacts/${contact.id}/tasks`),
      api<ContactActivity[]>(`/api/contacts/${contact.id}/activity`)
    ]);
    setContactTasks(tasks);
    setContactActivity(activity);
    setContactView("editor");
    setActiveTab("contacts");
  }

  function newContact() {
    setSelectedContactId(null);
    setContactForm(emptyContact);
    setContactTasks([]);
    setContactActivity([]);
    setTaskForm(emptyTask);
    setCustomFieldDraft({ name: "", type: "text", value: "", options: "" });
    setContactView("editor");
    setActiveTab("contacts");
  }

  async function saveContact() {
    setMessage("");
    try {
      const saved = await api<Contact>(selectedContactId ? `/api/contacts/${selectedContactId}` : "/api/contacts", {
        method: selectedContactId ? "PUT" : "POST",
        body: JSON.stringify(contactForm)
      });
      setMessageTone("success");
      setMessage(selectedContactId ? "Contact updated." : "Contact created.");
      await load();
      await openContact(saved);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save contact.");
    }
  }

  async function addContactTask() {
    if (!selectedContactId || !taskForm.title.trim()) return;
    try {
      const task = await api<ContactTask>(`/api/contacts/${selectedContactId}/tasks`, {
        method: "POST",
        body: JSON.stringify(taskForm)
      });
      setContactTasks([task, ...contactTasks]);
      setTaskForm(emptyTask);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not add task.");
    }
  }

  async function toggleTask(task: ContactTask) {
    const updated = await api<ContactTask>(`/api/contacts/${task.contactId}/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...task, status: task.status === "Done" ? "Open" : "Done" })
    });
    setContactTasks(contactTasks.map((item) => item.id === task.id ? updated : item));
  }

  function addCustomField() {
    const key = customFieldDraft.name.trim();
    if (!key) return;
    const options = customFieldDraft.options.split(",").map((option) => option.trim()).filter(Boolean);
    setContactForm({ ...contactForm, customFields: { ...(contactForm.customFields ?? {}), [key]: { type: customFieldDraft.type, value: defaultCustomFieldValue(customFieldDraft.type, customFieldDraft.value), options } } });
    setCustomFieldDraft({ name: "", type: "text", value: "", options: "" });
  }

  async function savePipeline() {
    const isEditing = Boolean(editingPipelineId);
    const stages = pipelineForm.stages.map((stage, index) => ({ id: stage.id || `stage-${index + 1}-${slugifyLocal(stage.name)}`, name: stage.name.trim(), order: index + 1 })).filter((stage) => stage.name);
    if (!pipelineForm.name.trim() || stages.length === 0) {
      setMessageTone("error");
      setMessage("Pipeline name and at least one stage are required.");
      return;
    }
    try {
      const saved = await api<Pipeline>(editingPipelineId ? `/api/opportunities/pipelines/${editingPipelineId}` : "/api/opportunities/pipelines", {
        method: editingPipelineId ? "PUT" : "POST",
        body: JSON.stringify({ name: pipelineForm.name, description: pipelineForm.description, stages })
      });
      setPipelines(editingPipelineId ? pipelines.map((pipeline) => pipeline.id === saved.id ? saved : pipeline) : [...pipelines, saved]);
      setSelectedPipelineId(saved.id);
      setPipelineForm(emptyPipeline);
      setEditingPipelineId(null);
      setPipelineModalOpen(false);
      setPipelineView("list");
      setMessageTone("success");
      setMessage(isEditing ? "Pipeline updated." : "Pipeline created.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save pipeline.");
    }
  }

  function openPipelineModal(pipeline?: Pipeline) {
    if (pipeline) {
      setEditingPipelineId(pipeline.id);
      setPipelineForm({ name: pipeline.name, description: pipeline.description ?? "", stages: pipeline.stages.sort((a, b) => a.order - b.order).map((stage) => ({ id: stage.id, name: stage.name })) });
    } else {
      setEditingPipelineId(null);
      setPipelineForm(emptyPipeline);
    }
    setPipelineView("editor");
    setActiveTab("pipelines");
    setPipelineModalOpen(true);
  }

  function movePipelineStage(index: number, direction: -1 | 1) {
    const next = [...pipelineForm.stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPipelineForm({ ...pipelineForm, stages: next });
  }

  async function deletePipeline(pipeline: Pipeline) {
    if (!window.confirm(`Delete "${pipeline.name}"? This is only allowed when it has no opportunities.`)) return;
    try {
      await api(`/api/opportunities/pipelines/${pipeline.id}`, { method: "DELETE" });
      const remaining = pipelines.filter((item) => item.id !== pipeline.id);
      setPipelines(remaining);
      setSelectedPipelineId(remaining[0]?.id ?? "");
      setMessageTone("success");
      setMessage("Pipeline deleted.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not delete pipeline.");
    }
  }

  async function saveOpportunity(stageId?: string) {
    const pipeline = pipelines.find((item) => item.id === selectedPipelineId);
    const targetStage = stageId || pipeline?.stages[0]?.id;
    if (!pipeline || !targetStage || !opportunityForm.title.trim()) {
      setMessageTone("error");
      setMessage("Opportunity title and pipeline are required.");
      return;
    }
    try {
      const contact = contacts.find((item) => item.id === opportunityForm.contactId);
      const saved = await api<Opportunity>("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({ ...opportunityForm, pipelineId: pipeline.id, stageId: targetStage, value: Number(opportunityForm.value), contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : "" })
      });
      setOpportunities([saved, ...opportunities]);
      setOpportunityForm(emptyOpportunity);
      setOpportunityModalStageId(null);
      setMessageTone("success");
      setMessage("Opportunity created.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save opportunity.");
    }
  }

  async function moveOpportunity(opportunity: Opportunity, stageId: string) {
    const updated = await api<Opportunity>(`/api/opportunities/${opportunity.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...opportunity, stageId })
    });
    setOpportunities(opportunities.map((item) => item.id === opportunity.id ? updated : item));
  }

  function parseActionConfig(configText: string) {
    return configTextToObject(configText);
  }

  function serializeActionConfig(config: Record<string, string>) {
    return configObjectToText(config);
  }

  function newAutomationAction(type = "InternalNotification"): AutomationFormAction {
    const templates: Record<string, string> = {
      SendEmail: "to={{contact.email}}\nsubject=Your appointment details\nbody=Hi {{contact.firstName}}, your appointment is {{appointment.startAt}}.",
      CreateOpportunity: "pipelineId={{defaultPipeline.id}}\nstageId={{defaultStage.id}}\ntitle={{appointment.name}} - {{contact.fullName}}\nvalue=0\nsource=Automation",
      MoveOpportunity: "opportunityId={{opportunity.id}}\nstageId={{stage.id}}",
      Wait: "duration=1\nunit=hours\nuntil=\noffsetMinutes=",
      CallExternalApi: "method=POST\nurl=https://example.com/webhook\nheaders.Authorization=Bearer token\nbody={\"contactId\":\"{{contact.id}}\",\"appointmentId\":\"{{appointment.id}}\"}",
      Webhook: "url=https://example.com/webhook\nmethod=POST",
      TriggerEvent: "eventName=CustomEvent\npayload.contactId={{contact.id}}",
      SetData: "key=appointmentSummary\nvalue={{appointment.name}} for {{contact.fullName}}",
      IfElse: "condition={{contact.tags}} contains vip\ntrueLabel=VIP\nfalseLabel=Standard",
      CreateTask: "title=Follow up with {{contact.fullName}}\ndueInDays=1",
      InternalNotification: "message=New automation event for {{contact.fullName}}"
    };
    return { id: `action-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, type, configText: templates[type] ?? "key=value" };
  }

  function mapAutomationActionToForm(action: AutomationAction): AutomationFormAction {
    return {
      id: action.id,
      type: action.type,
      configText: serializeActionConfig(action.config),
      then: action.then?.map(mapAutomationActionToForm),
      else: action.else?.map(mapAutomationActionToForm),
      branches: action.branches?.map((branch) => ({ id: branch.id, label: branch.label, steps: branch.steps.map(mapAutomationActionToForm) }))
    };
  }

  function mapAutomationActionToApi(action: AutomationFormAction, index: number): AutomationAction {
    return {
      id: action.id || `action-${index + 1}`,
      type: action.type,
      config: parseActionConfig(action.configText),
      then: action.then?.map(mapAutomationActionToApi),
      else: action.else?.map(mapAutomationActionToApi),
      branches: action.branches?.map((branch) => ({ id: branch.id, label: branch.label, steps: branch.steps.map(mapAutomationActionToApi) }))
    };
  }

  function updateAutomationActions(actions: AutomationFormAction[], id: string, patch: Partial<AutomationFormAction>): AutomationFormAction[] {
    return actions.map((action) => {
      const updated = action.id === id ? { ...action, ...patch } : action;
      return {
        ...updated,
        then: updated.then ? updateAutomationActions(updated.then, id, patch) : updated.then,
        else: updated.else ? updateAutomationActions(updated.else, id, patch) : updated.else,
        branches: updated.branches?.map((branch) => ({ ...branch, steps: updateAutomationActions(branch.steps, id, patch) }))
      };
    });
  }

  function insertAutomationActionAfter(actions: AutomationFormAction[], id: string, nextAction: AutomationFormAction): AutomationFormAction[] {
    const result: AutomationFormAction[] = [];
    for (const action of actions) {
      result.push({
        ...action,
        then: action.then ? insertAutomationActionAfter(action.then, id, nextAction) : action.then,
        else: action.else ? insertAutomationActionAfter(action.else, id, nextAction) : action.else,
        branches: action.branches?.map((branch) => ({ ...branch, steps: insertAutomationActionAfter(branch.steps, id, nextAction) }))
      });
      if (action.id === id) result.push(nextAction);
    }
    return result;
  }

  function removeAutomationActionById(actions: AutomationFormAction[], id: string): AutomationFormAction[] {
    return actions.filter((action) => action.id !== id).map((action) => ({
      ...action,
      then: action.then ? removeAutomationActionById(action.then, id) : action.then,
      else: action.else ? removeAutomationActionById(action.else, id) : action.else,
      branches: action.branches?.map((branch) => ({ ...branch, steps: removeAutomationActionById(branch.steps, id) }))
    }));
  }

  function addNestedAutomationAction(parentId: string, branch: "then" | "else", type = "SendEmail") {
    setAutomationForm({
      ...automationForm,
      actions: updateAutomationActions(automationForm.actions, parentId, {
        [branch]: [...(findAutomationAction(automationForm.actions, parentId)?.[branch] ?? []), newAutomationAction(type)]
      } as Partial<AutomationFormAction>)
    });
  }

  function findAutomationAction(actions: AutomationFormAction[], id: string): AutomationFormAction | undefined {
    for (const action of actions) {
      if (action.id === id) return action;
      const nested = findAutomationAction([...(action.then ?? []), ...(action.else ?? []), ...(action.branches ?? []).flatMap((branch) => branch.steps)], id);
      if (nested) return nested;
    }
    return undefined;
  }

  function addAutomationAction() {
    setAutomationForm({ ...automationForm, actions: [...automationForm.actions, newAutomationAction()] });
  }

  function addAutomationActionAfter(id: string) {
    setAutomationForm({
      ...automationForm,
      actions: insertAutomationActionAfter(automationForm.actions, id, newAutomationAction())
    });
  }

  function addAutomationTrigger() {
    setAutomationForm({
      ...automationForm,
      triggers: [...automationForm.triggers, { id: `trigger-${Date.now()}`, type: "ContactCreated", filterKey: "", filterValue: "" }]
    });
  }

  function updateAutomationTrigger(id: string, patch: Partial<(typeof automationForm.triggers)[number]>) {
    setAutomationForm({ ...automationForm, triggers: automationForm.triggers.map((trigger) => trigger.id === id ? { ...trigger, ...patch } : trigger) });
  }

  function updateAutomationAction(id: string, patch: Partial<(typeof automationForm.actions)[number]>) {
    setAutomationForm({ ...automationForm, actions: updateAutomationActions(automationForm.actions, id, patch) });
  }

  function changeAutomationActionType(id: string, type: string) {
    setAutomationForm({ ...automationForm, actions: updateAutomationActions(automationForm.actions, id, { type, configText: newAutomationAction(type).configText }) });
  }

  function editAutomation(rule: AutomationRule) {
    const triggers = (rule.triggers?.length ? rule.triggers : [rule.trigger]).map((trigger, index) => {
      const filterEntries = Object.entries(trigger.filters ?? {});
      return { id: `trigger-${index + 1}`, type: trigger.type, filterKey: filterEntries[0]?.[0] ?? "", filterValue: filterEntries[0]?.[1] ?? "" };
    });
    setEditingAutomationId(rule.id);
    setAutomationForm({
      name: rule.name,
      description: rule.description ?? "",
      triggers,
      actions: rule.actions.map(mapAutomationActionToForm),
      isActive: rule.isActive
    });
    setAutomationView("editor");
    setActiveTab("automations");
  }

  function startNewAutomation() {
    setEditingAutomationId(null);
    setAutomationForm(emptyAutomation);
    setAutomationView("editor");
    setActiveTab("automations");
  }

  async function saveAutomation() {
    if (!automationForm.name.trim() || automationForm.actions.length === 0) {
      setMessageTone("error");
      setMessage("Automation name and at least one action are required.");
      return;
    }
    const actions: AutomationAction[] = automationForm.actions.map(mapAutomationActionToApi);
    const triggers = automationForm.triggers.map((trigger) => ({
      type: trigger.type,
      filters: trigger.filterKey.trim() ? { [trigger.filterKey.trim()]: trigger.filterValue.trim() } : {}
    }));
    try {
      const saved = await api<AutomationRule>(editingAutomationId ? `/api/automations/${editingAutomationId}` : "/api/automations", {
        method: editingAutomationId ? "PUT" : "POST",
        body: JSON.stringify({ name: automationForm.name, description: automationForm.description, trigger: triggers[0], triggers, actions, isActive: automationForm.isActive })
      });
      setAutomations(editingAutomationId ? automations.map((item) => item.id === saved.id ? saved : item) : [saved, ...automations]);
      setAutomationForm(emptyAutomation);
      setEditingAutomationId(null);
      setAutomationView("list");
      setMessageTone("success");
      setMessage(editingAutomationId ? "Automation updated." : "Automation created.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save automation.");
    }
  }

  async function toggleAutomation(rule: AutomationRule) {
    const updated = await api<AutomationRule>(`/api/automations/${rule.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...rule, isActive: !rule.isActive })
    });
    setAutomations(automations.map((item) => item.id === updated.id ? updated : item));
  }

  async function deleteAutomation(rule: AutomationRule) {
    if (!window.confirm(`Delete automation "${rule.name}"?`)) return;
    await api(`/api/automations/${rule.id}`, { method: "DELETE" });
    setAutomations(automations.filter((item) => item.id !== rule.id));
    if (editingAutomationId === rule.id) {
      setEditingAutomationId(null);
      setAutomationForm(emptyAutomation);
      setAutomationView("list");
    }
    setMessageTone("success");
    setMessage("Automation deleted.");
  }

  function generateSitePage(template: string) {
    const business = authUser?.workspaceName ?? "Your Business";
    const presets: Record<string, Omit<SitePage, "id">> = {
      blank: { ...emptySitePage, name: "Untitled Page", slug: "untitled-page", template, seoTitle: "Untitled Page", seoDescription: "", sections: [newSiteSection("hero")] },
      coach: { ...emptySitePage, name: `${business} High-Converting Coach Page`, slug: slugifyLocal(`${business} coaching`), template, seoTitle: `${business} Coaching`, sections: [
        { id: "hero", type: "hero", eyebrow: "Private coaching for people ready for change", headline: "Stop guessing what to do next. Build a clear plan and follow through.", body: "A conversion-focused coaching page that leads visitors from pain, to proof, to a simple booked call.", buttonText: "Book a free clarity call", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "light", align: "center", padding: "spacious" },
        { id: "problem", type: "columns", headline: "You do not need more random advice", body: "Your visitor should feel understood before they are asked to book.", columns: [{ title: "Too many options", body: "They have tried tactics, videos, programs, and still feel stuck." }, { title: "No clear sequence", body: "They know pieces of the answer, but not the right next move." }, { title: "Low accountability", body: "They start strong, then life pulls them back into old patterns." }], background: "white" },
        { id: "outcomes", type: "features", headline: "What changes when we work together", body: "Turn the offer into outcomes they can picture.", items: ["A clear diagnosis of what is blocking progress", "A practical weekly plan they can actually execute", "Accountability, review, and course correction"] },
        { id: "process", type: "columns", headline: "A simple path to momentum", body: "Three steps make the decision feel safe.", columns: [{ title: "1. Clarity call", body: "Understand goals, constraints, and fit." }, { title: "2. Personal roadmap", body: "Create a plan for the next measurable milestone." }, { title: "3. Weekly execution", body: "Track progress and adjust before momentum drops." }], background: "light" },
        { id: "cta", type: "cta", headline: "Ready to find your next best step?", body: "Book a short call. No pressure, just clarity.", buttonText: "Book your clarity call", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "primary", align: "center" }
      ] },
      performance: { ...emptySitePage, name: `${business} Performance Coach Page`, slug: slugifyLocal(`${business} performance coaching`), template, seoTitle: `${business} Performance Coaching`, theme: { ...themePresets.find((item) => item.preset === "minimal")!, primary: "#111827", secondary: "#dc2626", accent: "#facc15", background: "#f8fafc", displayFont: "Montserrat", bodyFont: "Inter" }, sections: [
        { id: "hero", type: "hero", eyebrow: "Performance coaching", headline: "You are not broken. You are ready to build.", body: "A bold coaching page for people ready to take ownership of health, mindset, strength, and identity.", buttonText: "Book your call", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "dark", align: "center", padding: "spacious" },
        { id: "belief", type: "columns", headline: "What makes this different", body: "A structured identity-based approach inspired by belief, nourishment, and building strength.", background: "white", columns: [{ title: "Belief", body: "Belief shapes behavior. Behavior forms identity. Identity drives everything." }, { title: "Nourish", body: "Being nourished is about thriving, recovery, and capacity." }, { title: "Build", body: "Your life is not templated. Your training and growth should not be either." }] },
        { id: "story", type: "text", headline: "A new paradigm", body: "You do not create the life you want by chasing the next quick fix. You build it by becoming the person who can live it. This is coaching for the next chapter, not the next 30 days.", background: "light", align: "center", padding: "spacious" },
        { id: "offer", type: "features", headline: "Built for people who are done restarting", body: "Make the offer tangible and outcome-led.", items: ["Identity-based coaching", "Training and lifestyle rhythm", "Weekly review and accountability"], background: "white" },
        { id: "cta", type: "cta", headline: "Let's start building together", body: "Book a call and take the first step.", buttonText: "Book your call", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "primary", align: "center" }
      ] },
      clinic: { ...emptySitePage, name: `${business} Clinic Page`, slug: slugifyLocal(`${business} clinic`), template, seoTitle: `${business} Clinic`, sections: [
        { id: "hero", type: "hero", eyebrow: "Trusted care with simple online booking", headline: `Feel better with a clear treatment plan from ${business}`, body: "A conversion-focused clinic page that builds trust, explains the first visit, and moves patients to book.", buttonText: "Book your first appointment", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "light", align: "center", padding: "spacious" },
        { id: "services", type: "features", headline: "Choose the right care", body: "Show the most important reasons to choose your practice.", items: ["Initial assessment", "Treatment plan", "Follow-up support"] },
        { id: "trust", type: "columns", headline: "Why patients book", body: "Reduce friction and answer common doubts.", columns: [{ title: "Clear diagnosis", body: "Know what is happening and what to do next." }, { title: "Practical treatment", body: "Simple steps between sessions." }, { title: "Easy scheduling", body: "Book online in under a minute." }], background: "white" },
        { id: "cta", type: "cta", headline: "Ready to feel better?", body: "Choose a time online.", buttonText: "Find a time", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "primary", align: "center" }
      ] },
      personal: { ...emptySitePage, name: `${business} Personal Brand Page`, slug: slugifyLocal(`${business} personal brand`), template, seoTitle: business, sections: [
        { id: "hero", type: "hero", eyebrow: "For audiences who are ready to work deeper", headline: `Turn trust in ${business} into booked calls and clients`, body: "A personal-brand page designed to move followers from interest to a clear next step.", buttonText: "Start with a call", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "light", align: "center", padding: "spacious" },
        { id: "authority", type: "features", headline: "How I can help", body: "Package expertise into clear paths.", items: ["Private advisory", "Workshops and speaking", "Digital programs"] },
        { id: "fit", type: "columns", headline: "Best fit if you want", body: "Qualify the right clients before they book.", columns: [{ title: "Clarity", body: "Turn scattered goals into a focused plan." }, { title: "Execution", body: "Get help implementing, not just learning." }, { title: "Leverage", body: "Build assets, systems, and offers that compound." }], background: "white" },
        { id: "cta", type: "cta", headline: "Let's see if this is a fit", body: "Book a short call and we will map the next step.", buttonText: "Book now", buttonUrl: `/book/${authUser?.workspaceSlug}/discovery-call`, background: "primary", align: "center" }
      ] }
    };
    setSiteForm(presets[template] ?? presets.coach);
    setSelectedSiteSectionId((presets[template] ?? presets.coach).sections[0].id);
    setEditingSitePageId(null);
    setSitePageModalOpen(false);
    setSiteView("editor");
    setActiveTab("sites");
  }

  function updateSiteSection(id: string, patch: Partial<SitePage["sections"][number]>) {
    setSiteForm({ ...siteForm, sections: siteForm.sections.map((section) => section.id === id ? { ...section, ...patch } : section) });
  }

  function newSiteSection(type: SitePage["sections"][number]["type"]): SitePage["sections"][number] {
    const id = `section-${Date.now()}`;
    if (type === "columns") return { id, type, headline: "Three reasons to choose us", body: "Use columns for services, outcomes, or benefits.", columns: [{ title: "First benefit", body: "Describe it clearly." }, { title: "Second benefit", body: "Add another strong reason." }, { title: "Third benefit", body: "Close with proof or clarity." }], background: "white", align: "left", padding: "normal" };
    if (type === "image") return { id, type, headline: "Show your work", body: "Use an image section for a venue, product, treatment room, or personal brand visual.", imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", background: "light", align: "center", padding: "normal" };
    if (type === "split") return { id, type, headline: "A richer story section", body: "Pair persuasive copy with a useful image and a clear next action.", imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80", buttonText: "Learn more", buttonUrl: "#", background: "white", align: "left", padding: "normal" };
    return { id, type, headline: type === "cta" ? "Ready to start?" : "Add a clear headline", body: "Write supporting copy for this section.", buttonText: type === "cta" || type === "hero" ? "Take action" : "", buttonUrl: "#", items: type === "features" ? ["First point", "Second point", "Third point"] : [], background: type === "cta" ? "primary" : "white", align: type === "hero" ? "center" : "left", padding: "normal" };
  }

  function addSiteSection(type: SitePage["sections"][number]["type"]) {
    const section = newSiteSection(type);
    setSiteForm({ ...siteForm, sections: [...siteForm.sections, section] });
    setSelectedSiteSectionId(section.id);
  }

  function moveSiteSection(index: number, direction: -1 | 1) {
    const next = [...siteForm.sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSiteForm({ ...siteForm, sections: next });
  }

  function reorderSiteSection(fromId: string, toId: string) {
    if (fromId === toId) return;
    const next = [...siteForm.sections];
    const fromIndex = next.findIndex((section) => section.id === fromId);
    const toIndex = next.findIndex((section) => section.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSiteForm({ ...siteForm, sections: next });
  }

  function updateSectionColumn(sectionId: string, index: number, patch: { title?: string; body?: string; imageUrl?: string }) {
    const section = siteForm.sections.find((item) => item.id === sectionId);
    const columns = [...(section?.columns ?? [])];
    columns[index] = { ...columns[index], ...patch };
    updateSiteSection(sectionId, { columns });
  }

  async function saveSitePage() {
    if (!siteForm.name.trim() || !siteForm.slug.trim()) {
      setMessageTone("error");
      setMessage("Page name and slug are required.");
      return;
    }
    const saved = await api<SitePage>(editingSitePageId ? `/api/sites/pages/${editingSitePageId}` : "/api/sites/pages", {
      method: editingSitePageId ? "PUT" : "POST",
      body: JSON.stringify(siteForm)
    });
    setSitePages(editingSitePageId ? sitePages.map((page) => page.id === saved.id ? saved : page) : [saved, ...sitePages]);
    setEditingSitePageId(saved.id);
    setSiteView("editor");
    setMessageTone("success");
    setMessage("Page saved.");
  }

  async function publishSitePage() {
    const draft = { ...siteForm, status: "Published" as const };
    const saved = await api<SitePage>(editingSitePageId ? `/api/sites/pages/${editingSitePageId}` : "/api/sites/pages", {
      method: editingSitePageId ? "PUT" : "POST",
      body: JSON.stringify(draft)
    });
    setSiteForm({ name: saved.name, slug: saved.slug, status: saved.status, template: saved.template, seoTitle: saved.seoTitle, seoDescription: saved.seoDescription, theme: saved.theme ?? theme, sections: saved.sections });
    setSitePages(editingSitePageId ? sitePages.map((page) => page.id === saved.id ? saved : page) : [saved, ...sitePages]);
    setEditingSitePageId(saved.id);
    setMessageTone("success");
    setMessage("Page published.");
  }

  function editSitePage(page: SitePage) {
    setEditingSitePageId(page.id);
    setSiteForm({ name: page.name, slug: page.slug, status: page.status, template: page.template, seoTitle: page.seoTitle, seoDescription: page.seoDescription, theme: page.theme ?? theme, sections: page.sections });
    setSelectedSiteSectionId(page.sections[0]?.id ?? "");
    setSiteView("editor");
    setActiveTab("sites");
  }

  async function deleteSitePage(page: SitePage) {
    if (!window.confirm(`Delete page "${page.name}"?`)) return;
    await api(`/api/sites/pages/${page.id}`, { method: "DELETE" });
    setSitePages(sitePages.filter((item) => item.id !== page.id));
    if (editingSitePageId === page.id) {
      setEditingSitePageId(null);
      setSiteForm(emptySitePage);
    }
  }

  function editAppointment(item: AppointmentType) {
    setEditingId(item.id);
    setForm({
      assignedUserId: item.assignedUserId,
      name: item.name,
      description: item.description ?? "",
      slug: item.slug,
      durationMinutes: item.durationMinutes,
      locationType: item.locationType,
      locationValue: item.locationValue ?? "",
      bufferBeforeMinutes: item.bufferBeforeMinutes,
      bufferAfterMinutes: item.bufferAfterMinutes,
      minimumNoticeMinutes: item.minimumNoticeMinutes,
      maximumBookingWindowDays: item.maximumBookingWindowDays,
      serviceIntervalMinutes: item.serviceIntervalMinutes ?? 15,
      lookBusyPercentage: item.lookBusyPercentage ?? 0,
      timezone: item.timezone
    });
    setDurationUnit(item.durationMinutes % 60 === 0 ? "hours" : "minutes");
    setIntervalUnit((item.serviceIntervalMinutes ?? 15) % 60 === 0 ? "hours" : "minutes");
    setNoticeUnit(item.minimumNoticeMinutes % 60 === 0 ? "hours" : "minutes");
    setAppointmentView("editor");
    setActiveTab("calendars");
  }

  function updateRule(index: number, patch: Partial<AvailabilityRule>) {
    setRules(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--theme-background)_0%,#f4f7ff_42%,#f7fbf8_100%)] text-[var(--theme-text)]" style={themeStyle(theme)}>
      <aside className={`fixed inset-y-0 left-0 hidden border-r border-[#dde3ec] bg-[#fbfcff] px-3 py-5 transition-all lg:block ${navCollapsed ? "w-20" : "w-64"}`}>
        <div className="mb-7 overflow-hidden rounded-md border border-[#e5e9f2] bg-white shadow-sm">
          <ColorRail />
          <div className="p-3">
          <div className="mb-3 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285f4]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbc05]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
          </div>
          {!navCollapsed && <><div className="display-font text-lg font800 font-bold">{authUser.workspaceName}</div>
          <div className="text-xs font-medium text-[#64748b]">/{authUser.workspaceSlug}</div></>}
          </div>
        </div>
        <button className="mb-3 flex w-full items-center justify-center rounded-md border border-[#dde3ec] bg-white px-3 py-2 text-xs font-black text-[#64748b]" onClick={() => setNavCollapsed(!navCollapsed)}>{navCollapsed ? ">" : "< Collapse"}</button>
        <nav className="space-y-1 text-sm font-medium">
          <NavItem collapsed={navCollapsed} icon={<Calendar size={17} />} label="Scheduling" active={["calendars", "availability", "bookings", "schedulingSettings"].includes(activeTab)} onClick={() => setActiveTab("calendars")} />
          <NavItem collapsed={navCollapsed} icon={<Users size={17} />} label="Contacts" active={activeTab === "contacts"} onClick={() => setActiveTab("contacts")} />
          <NavItem collapsed={navCollapsed} icon={<Clock size={17} />} label="Opportunities" active={activeTab === "opportunities"} onClick={() => setActiveTab("opportunities")} />
          <NavItem collapsed={navCollapsed} icon={<Workflow size={17} />} label="Automations" active={activeTab === "automations"} onClick={() => setActiveTab("automations")} />
          <NavItem collapsed={navCollapsed} icon={<ExternalLink size={17} />} label="Sites" active={activeTab === "sites"} onClick={() => setActiveTab("sites")} />
          <NavItem collapsed={navCollapsed} icon={<Megaphone size={17} />} label="Marketing" active={activeTab === "marketing"} onClick={() => setActiveTab("marketing")} />
        </nav>
        <nav className="absolute bottom-5 left-4 right-4 space-y-1 text-sm font-medium">
          <NavItem collapsed={navCollapsed} icon={<Users size={17} />} label="My Team" active={activeTab === "team"} onClick={() => setActiveTab("team")} />
          <NavItem collapsed={navCollapsed} icon={<Settings size={17} />} label="App Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <NavItem collapsed={navCollapsed} icon={<Users size={17} />} label="My Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          <NavItem collapsed={navCollapsed} icon={<LogOut size={17} />} label="Logout" onClick={() => { clearAuth(); setAuthUser(null); }} />
        </nav>
      </aside>

      <section className={navCollapsed ? "lg:pl-20" : "lg:pl-64"}>
        <header className="border-b border-[#dde3ec] bg-white/95">
          <ColorRail />
          <div className="flex items-center justify-between px-5 py-3 lg:px-6">
            <div>
              <h1 className="display-font text-xl font-bold">{activeTab === "contacts" ? "Contacts" : activeTab === "opportunities" ? "Opportunities" : activeTab === "automations" ? "Automations" : activeTab === "sites" ? "Sites" : activeTab === "marketing" ? "Marketing" : activeTab === "team" ? "My Team" : activeTab === "settings" ? "App Settings" : activeTab === "profile" ? "My Profile" : "Scheduling"}</h1>
              <p className="text-xs font-medium text-[#64748b]">{activeTab === "contacts" ? "Contacts, custom fields, tasks, and activity timeline." : activeTab === "opportunities" ? "Pipelines, stages, deals, and revenue tracking." : activeTab === "automations" ? "Workflow rules that react to bookings, contacts, pages, tasks, and opportunities." : activeTab === "sites" ? "Landing pages, mini-sites, and WYSIWYG page editing." : activeTab === "marketing" ? "Campaigns, connected ad/social accounts, schedules, and tracking." : activeTab === "team" ? "Users, custom roles, permissions, and agency subaccounts." : activeTab === "settings" ? "Workspace-wide branding and application settings." : activeTab === "profile" ? "Your login and workspace access details." : "Appointment types, availability, bookings, and scheduling settings."}</p>
            </div>
            <label className="hidden min-w-[260px] text-xs font-black uppercase tracking-wide text-[#64748b] md:block">
              Active subaccount
              <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm font-bold normal-case tracking-normal text-[#16202a]" value={activeSubAccountId} onChange={(event) => {
                switchSubAccount(event.target.value);
              }}>
                <option value="agency">Agency workspace</option>
                {subAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
              <span className="mt-1 block text-[11px] font-semibold normal-case tracking-normal text-[#94a3b8]">{activeSubAccount ? `/${activeSubAccount.slug}` : `/${authUser.workspaceSlug}`}</span>
            </label>
          </div>
        </header>

        {message && <div className={`mx-5 mt-5 rounded-md border px-4 py-3 text-sm lg:mx-8 ${messageTone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{message}</div>}

        <div className="px-5 py-5 lg:px-6">
          {["calendars", "availability", "bookings", "schedulingSettings"].includes(activeTab) && (
            <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-[#dde3ec] bg-white p-2 shadow-sm">
              <ModuleTab label="Appointment Types" active={activeTab === "calendars"} onClick={() => setActiveTab("calendars")} />
              <ModuleTab label="Availability" active={activeTab === "availability"} onClick={() => setActiveTab("availability")} />
              <ModuleTab label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
              <ModuleTab label="Settings" active={activeTab === "schedulingSettings"} onClick={() => setActiveTab("schedulingSettings")} />
            </div>
          )}
          {["opportunities", "pipelines"].includes(activeTab) && (
            <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-[#dde3ec] bg-white p-2 shadow-sm">
              <ModuleTab label="Opportunity Board" active={activeTab === "opportunities"} onClick={() => setActiveTab("opportunities")} />
              <ModuleTab label="Pipelines" active={activeTab === "pipelines"} onClick={() => { setPipelineView("list"); setActiveTab("pipelines"); }} />
            </div>
          )}
          {activeTab === "marketing" && (
            <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-[#dde3ec] bg-white p-2 shadow-sm">
              <ModuleTab label="Campaigns" active={marketingView === "campaigns"} onClick={() => setMarketingView("campaigns")} />
              <ModuleTab label="Connected Accounts" active={marketingView === "accounts"} onClick={() => setMarketingView("accounts")} />
              <ModuleTab label="Tracking" active={marketingView === "tracking"} onClick={() => setMarketingView("tracking")} />
            </div>
          )}

          {activeTab === "calendars" && <section className={appointmentView === "list" ? "space-y-5" : "max-w-4xl"}>
            {appointmentView === "list" && <>
            <div className="flex justify-end"><button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => { setEditingId(null); setForm({ ...defaultAppointment, slug: `strategy-session-${Date.now().toString().slice(-5)}` }); setAppointmentView("editor"); }}><Plus size={16} /> New appointment type</button></div>
            <div className="space-y-5">
            <Panel title="Appointment Types" icon={<Calendar size={18} />}>
              <div className="overflow-hidden rounded-md border border-[#dde3ec]">
                <table className="w-full border-collapse bg-white text-sm">
                  <thead className="bg-[linear-gradient(90deg,#eef5ff,#f4fbf2,#fff8df)] text-left text-xs uppercase tracking-wide text-[#64748b]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Interval</th>
                        <th className="px-4 py-3">Buffers</th>
                        <th className="px-4 py-3">Look busy</th>
                        <th className="px-4 py-3">Link</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((item) => (
                      <tr key={item.id} className="border-t border-[#e6ebf2]">
                        <td className="px-4 py-3 font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#4285f4]" />{item.name}</td>
                        <td className="px-4 py-3">{item.durationMinutes} min</td>
                        <td className="px-4 py-3">{item.serviceIntervalMinutes ?? 15} min</td>
                        <td className="px-4 py-3">{item.bufferBeforeMinutes}/{item.bufferAfterMinutes} min</td>
                        <td className="px-4 py-3">{item.lookBusyPercentage ?? 0}%</td>
                        <td className="px-4 py-3">
                          <a className="inline-flex items-center gap-1 text-moss hover:underline" href={`/book/${authUser.workspaceSlug}/${item.slug}`}>
                            <Copy size={14} /> {item.slug}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-[#e6f7ef] px-2 py-1 text-xs font-bold text-[#137333]">{item.isActive ? "Active" : "Inactive"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-bold hover:border-[#2563eb] hover:text-[#2563eb]" onClick={() => editAppointment(item)}>Edit</button>
                            <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-bold hover:border-[#f59e0b] hover:text-[#a16207]" onClick={() => toggleAppointmentActive(item)}>{item.isActive ? "Make inactive" : "Activate"}</button>
                            <button className="rounded-md border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50" onClick={() => deleteAppointment(item)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            </div></>}
            {appointmentView === "editor" && <div>
            <Panel title={editingId ? "Edit Appointment Type" : "Create Appointment Type"} icon={<Plus size={18} />}>
              <button className="mb-4 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setAppointmentView("list")}>Back to appointment types</button>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                <Field label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
                <UnitField label="Service duration" minutes={form.durationMinutes} unit={durationUnit} onUnitChange={setDurationUnit} onMinutesChange={(minutes) => setForm({ ...form, durationMinutes: minutes })} />
                <UnitField label="Service interval" minutes={form.serviceIntervalMinutes} unit={intervalUnit} onUnitChange={setIntervalUnit} onMinutesChange={(minutes) => setForm({ ...form, serviceIntervalMinutes: minutes })} />
                <Field label="Buffer before minutes" type="number" value={String(form.bufferBeforeMinutes)} onChange={(value) => setForm({ ...form, bufferBeforeMinutes: Number(value) })} />
                <Field label="Buffer after minutes" type="number" value={String(form.bufferAfterMinutes)} onChange={(value) => setForm({ ...form, bufferAfterMinutes: Number(value) })} />
                <UnitField label="Minimum scheduling notice" minutes={form.minimumNoticeMinutes} unit={noticeUnit} onUnitChange={setNoticeUnit} onMinutesChange={(minutes) => setForm({ ...form, minimumNoticeMinutes: minutes })} />
                <Field label="Maximum window days" type="number" value={String(form.maximumBookingWindowDays)} onChange={(value) => setForm({ ...form, maximumBookingWindowDays: Number(value) })} />
                <Field label="Look busy percentage" type="number" value={String(form.lookBusyPercentage)} onChange={(value) => setForm({ ...form, lookBusyPercentage: Math.max(0, Math.min(100, Number(value))) })} />
              </div>
              <textarea className="mt-4 min-h-24 w-full rounded-md border border-stone-300 bg-white p-3 text-sm" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={savingAppointment} className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={saveAppointment}>
                  <Save size={16} /> {savingAppointment ? "Saving..." : editingId ? "Update appointment type" : "Save appointment type"}
                </button>
                {editingId && <button className="rounded-md border border-stone-300 px-4 py-2 text-sm" onClick={() => { setEditingId(null); setForm(defaultAppointment); setAppointmentView("list"); }}>Cancel</button>}
              </div>
            </Panel>
            </div>}
          </section>}

          {activeTab === "availability" && <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Availability" icon={<Clock size={18} />}>
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={`${rule.dayOfWeek}-${index}`} className="grid grid-cols-[1fr_92px_92px_38px] gap-2 rounded-md border-l-4 border-[#34a853] bg-[#f7fbf8] p-2">
                    <select className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: event.target.value })}>
                      {weekdays.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <input type="time" className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} />
                    <input type="time" className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} />
                    <button className="rounded-md border border-stone-300 p-2" onClick={() => setRules(rules.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setRules([...rules, { dayOfWeek: "Monday", startTime: "09:00", endTime: "17:00" }])}>Add block</button>
                <button type="button" disabled={savingAvailability} className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={saveAvailability}>{savingAvailability ? "Saving..." : "Save"}</button>
              </div>
            </Panel>
            <Panel title="Fixed Date Unavailability & Holidays" icon={<Calendar size={18} />}>
              <div className="space-y-3">
                {unavailability.map((item, index) => (
                  <div key={`${item.date}-${index}`} className="grid grid-cols-[150px_1fr_38px] gap-2 rounded-md border-l-4 border-[#fbbc05] bg-[#fffaf0] p-2">
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" type="date" value={item.date} onChange={(event) => setUnavailability(unavailability.map((row, i) => i === index ? { ...row, date: event.target.value } : row))} />
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" placeholder="Reason" value={item.reason ?? ""} onChange={(event) => setUnavailability(unavailability.map((row, i) => i === index ? { ...row, reason: event.target.value } : row))} />
                    <button className="rounded-md border border-stone-300 p-2" onClick={() => setUnavailability(unavailability.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                  </div>
                ))}
                {unavailability.length === 0 && <p className="text-sm text-stone-600">No unavailable dates set.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setUnavailability([...unavailability, { date: toDateKey(new Date()), reason: "Holiday" }])}>Add date</button>
                <button className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-bold text-white" onClick={saveUnavailability}>Save unavailable dates</button>
              </div>
            </Panel>
          </section>}

          {activeTab === "bookings" && <section className="max-w-3xl">
            <Panel title="Bookings" icon={<Users size={18} />}>
              <div className="space-y-3">
                {bookings.length === 0 && <p className="text-sm text-stone-600">No bookings yet.</p>}
                {bookings.map((booking) => (
                  <div key={booking.id} className="rounded-md border border-stone-200 bg-[linear-gradient(90deg,#ffffff,#f4f9ff)] p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{booking.customerName}</div>
                      <span className="text-xs text-stone-500">{booking.status}</span>
                    </div>
                    <div className="text-stone-600">{new Date(booking.startUtc).toLocaleString()}</div>
                    <div className="text-stone-500">{booking.customerEmail}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>}

          {activeTab === "schedulingSettings" && <section className="max-w-3xl">
            <Panel title="Scheduling Settings" icon={<Settings size={18} />}>
              <div className="space-y-2 text-sm text-stone-600">
                <p>Timezone: Australia/Sydney</p>
                <p>Calendar mode: Personal calendar</p>
                <p>Round-robin and collective calendar architecture: prepared for later modules.</p>
                <p>Default public booking URL: <a className="text-moss underline" href={`/book/${authUser.workspaceSlug}/${appointments[0]?.slug ?? "discovery-call"}`}>/book/{authUser.workspaceSlug}/{appointments[0]?.slug ?? "discovery-call"}</a></p>
              </div>
            </Panel>
          </section>}

          {activeTab === "contacts" && <section className={contactView === "list" ? "space-y-5" : "max-w-5xl"}>
            {contactView === "list" && <>
            <div className="flex justify-end"><button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={newContact}><Plus size={16} /> New contact</button></div>
            <Panel title="Contacts" icon={<Users size={18} />}>
              <div className="overflow-hidden rounded-md border border-[#dde3ec]">
                <table className="w-full bg-white text-sm">
                  <thead className="bg-[linear-gradient(90deg,#eef5ff,#f4fbf2,#fff8df)] text-left text-xs uppercase tracking-wide text-[#64748b]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Tags</th><th className="px-4 py-3"></th></tr></thead>
                  <tbody>
                {contacts.length === 0 && <p className="text-sm text-stone-600">No contacts yet.</p>}
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-t border-[#e6ebf2]"><td className="px-4 py-3 font-bold">{contact.firstName} {contact.lastName}</td><td className="px-4 py-3">{contact.email}</td><td className="px-4 py-3">{contact.company || "-"}</td><td className="px-4 py-3">{(contact.tags ?? []).slice(0,3).map((tag) => <span key={tag} className="mr-1 rounded-full bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#2563eb]">{tag}</span>)}</td><td className="px-4 py-3 text-right"><button className="rounded-md border border-[#cbd5e1] px-3 py-1 text-xs font-bold" onClick={() => openContact(contact)}>Edit</button></td></tr>
                ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            </>}

            {contactView === "editor" && <div className="space-y-5">
              <Panel title={selectedContactId ? "Contact Profile" : "Create Contact"} icon={<Users size={18} />}>
                <button className="mb-4 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setContactView("list")}>Back to contacts</button>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="First name" value={contactForm.firstName} onChange={(value) => setContactForm({ ...contactForm, firstName: value })} />
                  <Field label="Last name" value={contactForm.lastName} onChange={(value) => setContactForm({ ...contactForm, lastName: value })} />
                  <Field label="Email" type="email" value={contactForm.email} onChange={(value) => setContactForm({ ...contactForm, email: value })} />
                  <Field label="Phone" type="tel" value={contactForm.phone ?? ""} onChange={(value) => setContactForm({ ...contactForm, phone: value })} />
                  <Field label="Company" value={contactForm.company ?? ""} onChange={(value) => setContactForm({ ...contactForm, company: value })} />
                  <Field label="Job title" value={contactForm.jobTitle ?? ""} onChange={(value) => setContactForm({ ...contactForm, jobTitle: value })} />
                  <Field label="Address line 1" value={contactForm.addressLine1 ?? ""} onChange={(value) => setContactForm({ ...contactForm, addressLine1: value })} />
                  <Field label="Address line 2" value={contactForm.addressLine2 ?? ""} onChange={(value) => setContactForm({ ...contactForm, addressLine2: value })} />
                  <Field label="City" value={contactForm.city ?? ""} onChange={(value) => setContactForm({ ...contactForm, city: value })} />
                  <Field label="State" value={contactForm.state ?? ""} onChange={(value) => setContactForm({ ...contactForm, state: value })} />
                  <Field label="Postal code" value={contactForm.postalCode ?? ""} onChange={(value) => setContactForm({ ...contactForm, postalCode: value })} />
                  <Field label="Country" value={contactForm.country ?? ""} onChange={(value) => setContactForm({ ...contactForm, country: value })} />
                  <Field label="Source" value={contactForm.source ?? ""} onChange={(value) => setContactForm({ ...contactForm, source: value })} />
                </div>
                <div className="mt-4">
                  <span className="mb-2 block text-sm font-semibold text-[#475569]">Tags</span>
                  <TagEditor tags={contactForm.tags ?? []} onChange={(tags) => setContactForm({ ...contactForm, tags })} />
                </div>
                <textarea className="mt-4 min-h-24 w-full rounded-md border border-[#cbd5e1] bg-white p-3 text-sm" placeholder="Notes" value={contactForm.notes ?? ""} onChange={(event) => setContactForm({ ...contactForm, notes: event.target.value })} />
                <div className="mt-5 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                  <div className="mb-3 text-sm font-bold">Custom fields</div>
                  <div className="space-y-2">
                    {Object.entries(contactForm.customFields ?? {}).map(([key, field]) => (
                      <div key={key} className="rounded-md border border-[#dde3ec] bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">{key}</div>
                            <div className="text-xs text-[#64748b]">{customFieldTypeLabel(field.type)}</div>
                          </div>
                          <button className="rounded-md border border-rose-200 px-2 py-1 text-rose-700" onClick={() => {
                            const next = { ...(contactForm.customFields ?? {}) };
                            delete next[key];
                            setContactForm({ ...contactForm, customFields: next });
                          }}><Trash2 size={15} /></button>
                        </div>
                        <CustomFieldInput field={normalizeCustomField(field)} onChange={(nextField) => setContactForm({ ...contactForm, customFields: { ...(contactForm.customFields ?? {}), [key]: nextField } })} />
                      </div>
                    ))}
                    <div className="grid gap-2 rounded-md border border-dashed border-[#cbd5e1] bg-white p-3 md:grid-cols-[1fr_180px_1fr_90px]">
                      <input className="rounded-md border border-[#cbd5e1] p-2 text-sm" placeholder="Field name" value={customFieldDraft.name} onChange={(event) => setCustomFieldDraft({ ...customFieldDraft, name: event.target.value })} />
                      <GroupedSelect value={customFieldDraft.type} onChange={(type) => setCustomFieldDraft({ ...customFieldDraft, type })} />
                      <input className="rounded-md border border-[#cbd5e1] p-2 text-sm" placeholder={customFieldDraft.type.includes("dropdown") || customFieldDraft.type === "radio" || customFieldDraft.type === "checkbox" ? "Options, comma separated" : "Default value"} value={customFieldDraft.type.includes("dropdown") || customFieldDraft.type === "radio" || customFieldDraft.type === "checkbox" ? customFieldDraft.options : customFieldDraft.value} onChange={(event) => {
                        const value = event.target.value;
                        if (customFieldDraft.type.includes("dropdown") || customFieldDraft.type === "radio" || customFieldDraft.type === "checkbox") setCustomFieldDraft({ ...customFieldDraft, options: value });
                        else setCustomFieldDraft({ ...customFieldDraft, value });
                      }} />
                      <button className="rounded-md border border-[#cbd5e1] bg-white text-sm font-bold" onClick={addCustomField}>Add</button>
                    </div>
                  </div>
                </div>
                <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveContact}>
                  <Save size={16} /> Save contact
                </button>
              </Panel>

              {selectedContactId && <section className="grid gap-5 xl:grid-cols-2">
                <Panel title="Tasks" icon={<Clock size={18} />}>
                  <div className="grid gap-2 md:grid-cols-[1fr_150px]">
                    <Field label="Task" value={taskForm.title} onChange={(value) => setTaskForm({ ...taskForm, title: value })} />
                    <Field label="Due date" type="date" value={taskForm.dueDate} onChange={(value) => setTaskForm({ ...taskForm, dueDate: value })} />
                  </div>
                  <textarea className="mt-3 min-h-16 w-full rounded-md border border-[#cbd5e1] bg-white p-3 text-sm" placeholder="Task details" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
                  <button className="mt-3 rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={addContactTask}>Add task</button>
                  <div className="mt-4 space-y-2">
                    {contactTasks.length === 0 && <p className="text-sm text-stone-600">No tasks yet.</p>}
                    {contactTasks.map((task) => (
                      <button key={task.id} className="w-full rounded-md border border-[#dde3ec] bg-white p-3 text-left text-sm" onClick={() => toggleTask(task)}>
                        <div className={`font-bold ${task.status === "Done" ? "line-through text-[#64748b]" : ""}`}>{task.title}</div>
                        <div className="text-xs text-[#64748b]">{task.dueDate || "No due date"} · {task.status}</div>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="Activity" icon={<Calendar size={18} />}>
                  <div className="space-y-3">
                    {contactActivity.length === 0 && <p className="text-sm text-stone-600">No activity yet.</p>}
                    {contactActivity.map((activity) => (
                      <div key={activity.id} className="rounded-md border-l-4 border-[var(--theme-primary)] bg-white p-3 text-sm shadow-sm">
                        <div className="font-bold">{activity.title}</div>
                        <div className="text-xs text-[#64748b]">{activity.type} · {new Date(activity.occurredAtUtc).toLocaleString()}</div>
                        {activity.description && <p className="mt-1 text-[#64748b]">{activity.description}</p>}
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>}
            </div>}
          </section>}

          {activeTab === "opportunities" && <section className="space-y-5">
            {(() => {
              const pipeline = pipelines.find((item) => item.id === selectedPipelineId) ?? pipelines[0];
              return (
                <div className="flex flex-col gap-3 rounded-md border border-[#dde3ec] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="display-font text-2xl font-black text-[var(--theme-text)]">Opportunities</div>
                    <p className="text-sm text-[#64748b]">Work the pipeline from the board. Add deals directly inside the stage they belong to.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select className="min-w-56 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold text-[#16202a]" value={pipeline?.id ?? ""} onChange={(event) => setSelectedPipelineId(event.target.value)}>
                      {pipelines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold text-[#16202a] hover:bg-[#f8fafc]" onClick={() => setActiveTab("pipelines")}>
                      <Settings size={16} /> Pipelines
                    </button>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const pipeline = pipelines.find((item) => item.id === selectedPipelineId) ?? pipelines[0];
              if (!pipeline) return <Panel title="Pipeline Board" icon={<Clock size={18} />}><p className="text-sm text-stone-600">Create a pipeline to start tracking opportunities.</p></Panel>;
              const pipelineOpportunities = opportunities.filter((item) => item.pipelineId === pipeline.id);
              return (
                <div className="overflow-x-auto pb-2">
                  <div className="grid min-w-[940px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(pipeline.stages.length, 1)}, minmax(230px, 1fr))` }}>
                    {pipeline.stages.map((stage) => {
                      const stageItems = pipelineOpportunities.filter((item) => item.stageId === stage.id);
                      const stageValue = stageItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
                      const stageAccent = ["#2563eb", "#fbbc05", "#34a853", "#ec4899", "#7c3aed", "#f97316"][pipeline.stages.indexOf(stage) % 6];
                      return (
                        <div key={stage.id} className="flex min-h-[560px] flex-col rounded-md border border-[#dde3ec] bg-[#f8fafc]">
                          <div className="border-b border-[#dde3ec] bg-white p-3" style={{ borderTop: `4px solid ${stageAccent}` }}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-black text-[#16202a]">{stage.name}</div>
                            <div className="text-xs font-bold text-[#64748b]">{stageItems.length} · {stageValue.toLocaleString()} {stageItems[0]?.currency ?? "AUD"}</div>
                              </div>
                              <button className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--theme-primary)] text-white shadow-sm" title={`Add to ${stage.name}`} onClick={() => {
                                setOpportunityForm(emptyOpportunity);
                                setOpportunityModalStageId(stage.id);
                              }}>
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 space-y-2 p-3">
                            {stageItems.map((opportunity) => (
                              <div key={opportunity.id} className="rounded-md border border-[#dde3ec] bg-white p-3 text-sm shadow-sm">
                                <div className="font-bold">{opportunity.title}</div>
                                <div className="text-xs text-[#64748b]">{opportunity.contactName || "No contact"}</div>
                                <div className="mt-2 font-bold text-[var(--theme-primary)]">{Number(opportunity.value || 0).toLocaleString()} {opportunity.currency}</div>
                                <select className="mt-3 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-xs" value={opportunity.stageId} onChange={(event) => moveOpportunity(opportunity, event.target.value)}>
                                  {pipeline.stages.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                              </div>
                            ))}
                            {stageItems.length === 0 && <button className="w-full rounded-md border border-dashed border-[#cbd5e1] bg-white p-4 text-center text-xs font-bold text-[#64748b] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]" onClick={() => {
                              setOpportunityForm(emptyOpportunity);
                              setOpportunityModalStageId(stage.id);
                            }}>Add first opportunity</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {opportunityModalStageId && (() => {
              const pipeline = pipelines.find((item) => item.id === selectedPipelineId) ?? pipelines[0];
              if (!pipeline) return null;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4">
                  <div className="w-full max-w-2xl rounded-md bg-white p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="display-font text-xl font-black text-[#16202a]">New Opportunity</div>
                        <p className="text-sm text-[#64748b]">Pipeline: {pipeline.name} - Stage: {pipeline.stages.find((stage) => stage.id === opportunityModalStageId)?.name}</p>
                      </div>
                      <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => setOpportunityModalStageId(null)}>Close</button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Title" value={opportunityForm.title} onChange={(value) => setOpportunityForm({ ...opportunityForm, title: value })} />
                      <Field label="Value" type="number" value={String(opportunityForm.value)} onChange={(value) => setOpportunityForm({ ...opportunityForm, value: Number(value) })} />
                      <label className="text-sm font-bold text-[#334155]">Contact
                        <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={opportunityForm.contactId} onChange={(event) => setOpportunityForm({ ...opportunityForm, contactId: event.target.value })}>
                          <option value="">No contact</option>
                          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{`${contact.firstName} ${contact.lastName}`.trim() || contact.email || contact.id}</option>)}
                        </select>
                      </label>
                      <Field label="Currency" value={opportunityForm.currency} onChange={(value) => setOpportunityForm({ ...opportunityForm, currency: value.toUpperCase().slice(0, 3) })} />
                      <Field label="Expected close date" type="date" value={opportunityForm.expectedCloseDate} onChange={(value) => setOpportunityForm({ ...opportunityForm, expectedCloseDate: value })} />
                      <Field label="Source" value={opportunityForm.source} onChange={(value) => setOpportunityForm({ ...opportunityForm, source: value })} />
                    </div>
                    <textarea className="mt-4 min-h-20 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="Notes" value={opportunityForm.notes} onChange={(event) => setOpportunityForm({ ...opportunityForm, notes: event.target.value })} />
                    <div className="mt-5 flex justify-end gap-2">
                      <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setOpportunityModalStageId(null)}>Cancel</button>
                      <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => saveOpportunity(opportunityModalStageId)}>
                        <Plus size={16} /> Add opportunity
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>}

          {activeTab === "automations" && <section className="space-y-5">
            {automationView === "list" && <Panel title="Automation Rules" icon={<Workflow size={18} />}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="display-font text-2xl font-black text-[#16202a]">Automations</div>
                  <p className="text-sm text-[#64748b]">Create long-running workflows with waits, branches, webhooks, and opportunity actions.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={startNewAutomation}><Plus size={16} /> New automation</button>
              </div>
              <div className="space-y-3">
                {automations.length === 0 && <div className="rounded-md border border-dashed border-[#cbd5e1] bg-[#fbfcff] p-6 text-sm text-stone-600">No automations yet. Create your first workflow from a trigger like appointment booked, webhook received, or recurring schedule.</div>}
                {automations.map((rule) => (
                  <div key={rule.id} className="rounded-md border border-[#dde3ec] bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-[#16202a]">{rule.name}</div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-black ${rule.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.isActive ? "Active" : "Paused"}</span>
                          <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] font-black text-[#2563eb]">{rule.actions.length} steps</span>
                        </div>
                        {rule.description && <p className="mt-1 text-sm text-[#64748b]">{rule.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          {(rule.triggers?.length ? rule.triggers : [rule.trigger]).map((trigger, index) => <span key={`${trigger.type}-${index}`} className="rounded-md bg-[#eef5ff] px-2 py-1 text-[#2563eb]">When {automationTriggerOptions.find((item) => item.value === trigger.type)?.label ?? trigger.type}</span>)}
                          {rule.actions.slice(0, 4).map((action) => <span key={action.id} className="rounded-md bg-[#fff8df] px-2 py-1 text-[#8a6100]">Then {automationActionOptions.find((item) => item.value === action.type)?.label ?? action.type}</span>)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => toggleAutomation(rule)}>{rule.isActive ? "Pause" : "Activate"}</button>
                        <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => editAutomation(rule)}>Edit</button>
                        <button className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" onClick={() => deleteAutomation(rule)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>}

            {automationView === "editor" && <Panel title={editingAutomationId ? "Edit Automation" : "Create Automation"} icon={<Workflow size={18} />}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <button className="mb-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setAutomationView("list")}>Back to automations</button>
                  <div className="display-font text-2xl font-black text-[#16202a]">{editingAutomationId ? "Edit automation" : "Create automation"}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setAutomationZoom(Math.max(0.55, Number((automationZoom - 0.1).toFixed(2))))}>Zoom out</button>
                  <span className="rounded-md bg-[#f8fafc] px-3 py-2 text-sm font-black">{Math.round(automationZoom * 100)}%</span>
                  <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setAutomationZoom(Math.min(1.25, Number((automationZoom + 0.1).toFixed(2))))}>Zoom in</button>
                </div>
              </div>
              <AutomationCanvas
                title={automationForm.name || "New automation"}
                triggers={automationForm.triggers}
                actions={automationForm.actions}
                isActive={automationForm.isActive}
                zoom={automationZoom}
                onAddTrigger={addAutomationTrigger}
                onUpdateTrigger={updateAutomationTrigger}
                onRemoveTrigger={(id) => setAutomationForm({ ...automationForm, triggers: automationForm.triggers.filter((item) => item.id !== id) })}
                onAddActionAfter={addAutomationActionAfter}
                onAddNestedAction={addNestedAutomationAction}
                onUpdateAction={updateAutomationAction}
                onRemoveAction={(id) => setAutomationForm({ ...automationForm, actions: removeAutomationActionById(automationForm.actions, id) })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Automation name" value={automationForm.name} onChange={(value) => setAutomationForm({ ...automationForm, name: value })} />
                <label className="text-sm font-bold text-[#334155]">Status
                  <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={automationForm.isActive ? "active" : "inactive"} onChange={(event) => setAutomationForm({ ...automationForm, isActive: event.target.value === "active" })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <textarea className="mt-4 min-h-20 w-full rounded-md border border-[#cbd5e1] bg-white p-3 text-sm" placeholder="Description" value={automationForm.description} onChange={(event) => setAutomationForm({ ...automationForm, description: event.target.value })} />

              <div className="mt-5 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#16202a]">Start triggers</div>
                  <button className="inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={addAutomationTrigger}><Plus size={15} /> Add trigger</button>
                </div>
                <div className="space-y-3">
                  {automationForm.triggers.map((trigger, index) => (
                    <div key={trigger.id} className="grid gap-3 rounded-md border border-[#dde3ec] bg-white p-3 md:grid-cols-[1fr_1fr_1fr_40px]">
                      <label className="text-sm font-bold text-[#334155]">Trigger {index + 1}
                        <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={trigger.type} onChange={(event) => updateAutomationTrigger(trigger.id, { type: event.target.value })}>
                          {automationTriggerOptions.map((option) => <option key={option.value} value={option.value}>{option.module} - {option.label}</option>)}
                        </select>
                      </label>
                      <Field label="Filter field" value={trigger.filterKey} onChange={(value) => updateAutomationTrigger(trigger.id, { filterKey: value })} />
                      <Field label="Filter value" value={trigger.filterValue} onChange={(value) => updateAutomationTrigger(trigger.id, { filterValue: value })} />
                      <button className="mt-6 rounded-md border border-rose-200 p-2 text-rose-700 disabled:opacity-40" disabled={automationForm.triggers.length === 1} onClick={() => setAutomationForm({ ...automationForm, triggers: automationForm.triggers.filter((item) => item.id !== trigger.id) })}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-[#16202a]">Actions</div>
                  <button className="inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={addAutomationAction}><Plus size={15} /> Add action</button>
                </div>
                {automationForm.actions.map((action, index) => (
                  <div key={action.id} className="rounded-md border border-[#dde3ec] bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold">Action {index + 1}</div>
                      {automationForm.actions.length > 1 && <button className="rounded-md border border-rose-200 p-2 text-rose-700" onClick={() => setAutomationForm({ ...automationForm, actions: removeAutomationActionById(automationForm.actions, action.id) })}><Trash2 size={15} /></button>}
                    </div>
                    <label className="text-sm font-bold text-[#334155]">Action type
                      <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={action.type} onChange={(event) => changeAutomationActionType(action.id, event.target.value)}>
                        {automationActionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <ActionConfigEditor action={action} onChange={(configText) => updateAutomationAction(action.id, { configText })} />
                    {(action.type === "IfElse" || (action.then?.length || action.else?.length)) && <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <NestedActionList title="Then / yes path" actions={action.then ?? []} onAdd={() => addNestedAutomationAction(action.id, "then")} onTypeChange={changeAutomationActionType} onUpdate={updateAutomationAction} onRemove={(id) => setAutomationForm({ ...automationForm, actions: removeAutomationActionById(automationForm.actions, id) })} />
                      <NestedActionList title="Else / no path" actions={action.else ?? []} onAdd={() => addNestedAutomationAction(action.id, "else")} onTypeChange={changeAutomationActionType} onUpdate={updateAutomationAction} onRemove={(id) => setAutomationForm({ ...automationForm, actions: removeAutomationActionById(automationForm.actions, id) })} />
                    </div>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveAutomation}><Save size={16} /> Save automation</button>
                {editingAutomationId && automations.find((item) => item.id === editingAutomationId) && <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => toggleAutomation(automations.find((item) => item.id === editingAutomationId)!)}>{automationForm.isActive ? "Pause" : "Activate"}</button>}
                {editingAutomationId && automations.find((item) => item.id === editingAutomationId) && <button className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700" onClick={() => deleteAutomation(automations.find((item) => item.id === editingAutomationId)!)}>Delete</button>}
                <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setAutomationView("list")}>Close editor</button>
              </div>
            </Panel>}
          </section>}

          {activeTab === "sites" && <section className="space-y-5">
            {siteView === "sites" && <Panel title="Sites" icon={<ExternalLink size={18} />}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="display-font text-2xl font-black text-[#16202a]">Sites</div>
                  <p className="text-sm text-[#64748b]">Manage sites first, then open a site's pages and builder. This structure can also power funnels later.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => setSiteView("pages")}><Plus size={16} /> Open site</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <button className="rounded-md border border-[#dde3ec] bg-white p-5 text-left shadow-sm hover:border-[var(--theme-primary)] hover:bg-[#f8fbff]" onClick={() => setSiteView("pages")}>
                  <div className="display-font text-xl font-black text-[#16202a]">{authUser.workspaceName} Site</div>
                  <p className="mt-2 text-sm text-[#64748b]">/{authUser.workspaceSlug}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-md bg-[#eef5ff] px-2 py-1 text-[#2563eb]">{sitePages.length} pages</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{sitePages.filter((page) => page.status === "Published").length} published</span>
                  </div>
                </button>
                <div className="rounded-md border border-dashed border-[#cbd5e1] bg-[#fbfcff] p-5 text-sm text-[#64748b]">
                  Multi-site creation will use the same page builder and public URL pattern. The current workspace site is ready now.
                </div>
              </div>
            </Panel>}

            {siteView === "pages" && <Panel title="Pages" icon={<ExternalLink size={18} />}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <button className="mb-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setSiteView("sites")}>Back to sites</button>
                  <div className="display-font text-2xl font-black text-[#16202a]">{authUser.workspaceName} Site Pages</div>
                  <p className="text-sm text-[#64748b]">Create, edit, and review pages before opening the builder.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => setSitePageModalOpen(true)}><Plus size={16} /> New page</button>
              </div>
              <div className="space-y-3">
                {sitePages.length === 0 && <div className="rounded-md border border-dashed border-[#cbd5e1] bg-[#fbfcff] p-6 text-sm text-stone-600">No saved pages yet. Create a high-converting coach page from a preset.</div>}
                {sitePages.map((page) => (
                  <div key={page.id} className="flex flex-col gap-3 rounded-md border border-[#dde3ec] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-black text-[#16202a]">{page.name}</div>
                      <div className="text-sm text-[#64748b]">/{authUser.workspaceSlug}/{page.slug}</div>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-black ${page.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{page.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => editSitePage(page)}>Edit</button>
                      {page.status === "Published" && <a className="inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" target="_blank" href={`/${authUser.workspaceSlug}/${page.slug}`}><ExternalLink size={15} /> Open</a>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>}

            {siteView === "editor" && <>
            <div className="flex flex-col gap-3 rounded-md border border-[#dde3ec] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button className="mb-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setSiteView("pages")}>Back to pages</button>
                <div className="display-font text-2xl font-black text-[var(--theme-text)]">{siteForm.name}</div>
                <p className="text-sm text-[#64748b]">/{authUser.workspaceSlug}/{siteForm.slug} - {siteForm.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setSitePageModalOpen(true)}>Pages & templates</button>
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveSitePage}><Save size={16} /> Save page</button>
                <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white" onClick={publishSitePage}><Check size={16} /> Publish</button>
                {editingSitePageId && <a className="inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" target="_blank" href={`/${authUser.workspaceSlug}/${siteForm.slug}`}><ExternalLink size={15} /> Open</a>}
              </div>
            </div>
            <Panel title="Website Builder" icon={<ExternalLink size={18} />}>
              <div className="mb-4 flex flex-wrap gap-2">
                {siteSectionTypes.map((type) => <button key={type} className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-black capitalize hover:border-[var(--theme-primary)]" onClick={() => addSiteSection(type)}><Plus size={13} className="mr-1 inline" />{type}</button>)}
              </div>
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <SitePagePreview page={siteForm} theme={siteForm.theme ?? theme} selectedSectionId={selectedSiteSectionId} onSelectSection={setSelectedSiteSectionId} onReorderSection={reorderSiteSection} />
                <div className="space-y-4">
                  <div className="rounded-md border border-[#dde3ec] bg-white p-3">
                    <div className="mb-3 text-sm font-black">Page settings</div>
                    <Field label="Name" value={siteForm.name} onChange={(value) => setSiteForm({ ...siteForm, name: value, slug: editingSitePageId ? siteForm.slug : slugifyLocal(value) })} />
                    <Field label="Slug" value={siteForm.slug} onChange={(value) => setSiteForm({ ...siteForm, slug: slugifyLocal(value) })} />
                    <div className="mt-3 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3 text-sm font-bold text-[#334155]">Status: {siteForm.status}. Use the Publish button when this page is ready.</div>
                    <Field label="SEO title" value={siteForm.seoTitle ?? ""} onChange={(value) => setSiteForm({ ...siteForm, seoTitle: value })} />
                    <textarea className="mt-3 min-h-16 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="SEO description" value={siteForm.seoDescription ?? ""} onChange={(event) => setSiteForm({ ...siteForm, seoDescription: event.target.value })} />
                    <div className="mt-4 border-t border-[#dde3ec] pt-3">
                      <div className="mb-2 text-sm font-black">Page theme</div>
                      <label className="text-sm font-bold text-[#334155]">Preset
                        <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={siteForm.theme?.preset ?? theme.preset} onChange={(event) => setSiteForm({ ...siteForm, theme: themePresets.find((preset) => preset.preset === event.target.value) ?? siteForm.theme })}>
                          {themePresets.map((preset) => <option key={preset.preset} value={preset.preset}>{preset.preset}</option>)}
                        </select>
                      </label>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <ColorField label="Primary" value={(siteForm.theme ?? theme).primary} onChange={(value) => setSiteForm({ ...siteForm, theme: { ...(siteForm.theme ?? theme), preset: "custom", primary: value } })} />
                        <ColorField label="Accent" value={(siteForm.theme ?? theme).accent} onChange={(value) => setSiteForm({ ...siteForm, theme: { ...(siteForm.theme ?? theme), preset: "custom", accent: value } })} />
                        <SelectField label="Display font" value={(siteForm.theme ?? theme).displayFont} options={fontOptions} onChange={(value) => setSiteForm({ ...siteForm, theme: { ...(siteForm.theme ?? theme), preset: "custom", displayFont: value } })} />
                        <SelectField label="Body font" value={(siteForm.theme ?? theme).bodyFont} options={fontOptions} onChange={(value) => setSiteForm({ ...siteForm, theme: { ...(siteForm.theme ?? theme), preset: "custom", bodyFont: value } })} />
                      </div>
                    </div>
                    {editingSitePageId && <button className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" onClick={() => sitePages.find((page) => page.id === editingSitePageId) && deleteSitePage(sitePages.find((page) => page.id === editingSitePageId)!)}>Delete page</button>}
                  </div>
                  {(() => {
                    const section = siteForm.sections.find((item) => item.id === selectedSiteSectionId) ?? siteForm.sections[0];
                    const index = siteForm.sections.findIndex((item) => item.id === section?.id);
                    if (!section) return <div className="rounded-md border border-dashed border-[#cbd5e1] p-4 text-sm text-[#64748b]">Add a section to start building.</div>;
                    return (
                    <div key={section.id} className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="text-sm font-black capitalize">Selected {section.type}</div>
                        <div className="flex gap-1">
                          <button className="rounded border border-[#cbd5e1] px-2 py-1 text-xs" onClick={() => moveSiteSection(index, -1)}>Up</button>
                          <button className="rounded border border-[#cbd5e1] px-2 py-1 text-xs" onClick={() => moveSiteSection(index, 1)}>Down</button>
                          <button className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => {
                            const remaining = siteForm.sections.filter((item) => item.id !== section.id);
                            setSiteForm({ ...siteForm, sections: remaining });
                            setSelectedSiteSectionId(remaining[0]?.id ?? "");
                          }}>Delete</button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm font-bold text-[#334155]">Type
                          <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={section.type} onChange={(event) => updateSiteSection(section.id, { type: event.target.value as SitePage["sections"][number]["type"] })}>
                            {siteSectionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </label>
                        <label className="text-sm font-bold text-[#334155]">Background
                          <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={section.background ?? "white"} onChange={(event) => updateSiteSection(section.id, { background: event.target.value })}>
                            {["white", "light", "primary", "dark"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                          </select>
                        </label>
                        <label className="text-sm font-bold text-[#334155]">Align
                          <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={section.align ?? "left"} onChange={(event) => updateSiteSection(section.id, { align: event.target.value as "left" | "center" })}>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                          </select>
                        </label>
                        <label className="text-sm font-bold text-[#334155]">Padding
                          <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={section.padding ?? "normal"} onChange={(event) => updateSiteSection(section.id, { padding: event.target.value as "compact" | "normal" | "spacious" })}>
                            {["compact", "normal", "spacious"].map((size) => <option key={size} value={size}>{size}</option>)}
                          </select>
                        </label>
                      </div>
                      <Field label="Eyebrow" value={section.eyebrow ?? ""} onChange={(value) => updateSiteSection(section.id, { eyebrow: value })} />
                      <Field label="Headline" value={section.headline} onChange={(value) => updateSiteSection(section.id, { headline: value })} />
                      <textarea className="mt-3 min-h-24 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="Rich text / paragraph copy" value={section.body} onChange={(event) => updateSiteSection(section.id, { body: event.target.value })} />
                      {["image", "split", "hero"].includes(section.type) && <Field label="Image URL" value={section.imageUrl ?? ""} onChange={(value) => updateSiteSection(section.id, { imageUrl: value })} />}
                      {["features", "columns"].includes(section.type) && <textarea className="mt-3 min-h-20 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="List items, one per line" value={(section.items ?? []).join("\n")} onChange={(event) => updateSiteSection(section.id, { items: event.target.value.split("\n").filter(Boolean) })} />}
                      {section.type === "columns" && <div className="mt-3 space-y-2">
                        {(section.columns ?? []).map((column, columnIndex) => <div key={columnIndex} className="rounded-md border border-[#dde3ec] bg-white p-2">
                          <Field label={`Column ${columnIndex + 1} title`} value={column.title} onChange={(value) => updateSectionColumn(section.id, columnIndex, { title: value })} />
                          <textarea className="mt-2 min-h-16 w-full rounded-md border border-[#cbd5e1] p-2 text-sm" value={column.body} onChange={(event) => updateSectionColumn(section.id, columnIndex, { body: event.target.value })} />
                        </div>)}
                        <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold" onClick={() => updateSiteSection(section.id, { columns: [...(section.columns ?? []), { title: "New column", body: "Column text" }] })}>Add column</button>
                      </div>}
                      {section.type !== "features" && <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Field label="Button text" value={section.buttonText ?? ""} onChange={(value) => updateSiteSection(section.id, { buttonText: value })} />
                        <Field label="Button URL" value={section.buttonUrl ?? ""} onChange={(value) => updateSiteSection(section.id, { buttonUrl: value })} />
                      </div>}
                    </div>
                    );
                  })()}
                </div>
              </div>
            </Panel>
            </>}
            {sitePageModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4">
              <div className="w-full max-w-3xl rounded-md bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="display-font text-xl font-black text-[#16202a]">Pages & Templates</div>
                    <p className="text-sm text-[#64748b]">Start blank or use a preset. More presets can be added to this library later.</p>
                  </div>
                  <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => setSitePageModalOpen(false)}>Close</button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-black">Create from preset</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sitePagePresets.map((preset) => <button key={preset.id} className="rounded-md border border-[#cbd5e1] bg-white p-4 text-left text-sm font-black hover:border-[var(--theme-primary)] hover:bg-[#f8fbff]" onClick={() => generateSitePage(preset.id)}>{preset.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-black">Existing pages</div>
                    <div className="max-h-80 space-y-2 overflow-auto">
                      {sitePages.length === 0 && <p className="text-sm text-stone-600">No saved pages yet.</p>}
                      {sitePages.map((page) => (
                        <button key={page.id} className={`w-full rounded-md border p-3 text-left text-sm ${editingSitePageId === page.id ? "border-[var(--theme-primary)] bg-[#f5f9ff]" : "border-[#dde3ec] bg-white"}`} onClick={() => { editSitePage(page); setSitePageModalOpen(false); }}>
                          <div className="font-black">{page.name}</div>
                          <div className="text-xs text-[#64748b]">/{authUser.workspaceSlug}/{page.slug} - {page.status}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>}
          </section>}

          {activeTab === "pipelines" && <section className={pipelineView === "list" ? "space-y-5" : "max-w-4xl"}>
            {pipelineView === "list" && <>
              <div className="flex justify-end"><button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={() => openPipelineModal()}><Plus size={16} /> New pipeline</button></div>
              <Panel title="Pipelines" icon={<Clock size={18} />}>
                <div className="space-y-3">
                  {pipelines.map((pipeline) => <div key={pipeline.id} className="rounded-md border border-[#dde3ec] bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div><div className="font-black text-[#16202a]">{pipeline.name}</div><div className="text-sm text-[#64748b]">{pipeline.description || "No description"}</div><div className="mt-2 flex flex-wrap gap-1.5">{pipeline.stages.sort((a,b)=>a.order-b.order).map((stage) => <span key={stage.id} className="rounded-md bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#2563eb]">{stage.name}</span>)}</div></div>
                      <div className="flex gap-2"><button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => openPipelineModal(pipeline)}>Edit</button><button className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" onClick={() => deletePipeline(pipeline)}>Delete</button></div>
                    </div>
                  </div>)}
                </div>
              </Panel>
            </>}
            {pipelineView === "editor" && <Panel title={editingPipelineId ? "Edit Pipeline" : "Create Pipeline"} icon={<Clock size={18} />}>
              <button className="mb-4 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setPipelineView("list")}>Back to pipelines</button>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Pipeline name" value={pipelineForm.name} onChange={(value) => setPipelineForm({ ...pipelineForm, name: value })} />
                <textarea className="min-h-16 rounded-md border border-[#cbd5e1] p-3 text-sm md:col-span-2" placeholder="Description" value={pipelineForm.description} onChange={(event) => setPipelineForm({ ...pipelineForm, description: event.target.value })} />
              </div>
              <div className="mt-5 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                <div className="mb-3 text-sm font-black">Pipeline stages</div>
                <div className="space-y-2">
                  {pipelineForm.stages.map((stage, index) => <div key={stage.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                    const from = Number(event.dataTransfer.getData("text/plain"));
                    const next = [...pipelineForm.stages];
                    const [moved] = next.splice(from, 1);
                    next.splice(index, 0, moved);
                    setPipelineForm({ ...pipelineForm, stages: next });
                  }} className="grid gap-2 rounded-md border border-[#dde3ec] bg-white p-2 md:grid-cols-[32px_1fr_120px]">
                    <div className="flex items-center justify-center rounded bg-[#f1f5f9] text-xs font-black text-[#64748b]">::</div>
                    <input className="rounded-md border border-[#cbd5e1] p-2 text-sm" value={stage.name} onChange={(event) => setPipelineForm({ ...pipelineForm, stages: pipelineForm.stages.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} />
                    <div className="flex gap-1"><button className="rounded border border-[#cbd5e1] px-2 text-xs" onClick={() => movePipelineStage(index, -1)}>Up</button><button className="rounded border border-[#cbd5e1] px-2 text-xs" onClick={() => movePipelineStage(index, 1)}>Down</button><button className="rounded border border-rose-200 px-2 text-xs text-rose-700" onClick={() => setPipelineForm({ ...pipelineForm, stages: pipelineForm.stages.filter((_, i) => i !== index) })}>Del</button></div>
                  </div>)}
                </div>
                <button className="mt-3 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => setPipelineForm({ ...pipelineForm, stages: [...pipelineForm.stages, { id: `stage-${Date.now()}`, name: "New Stage" }] })}>Add stage</button>
              </div>
              <div className="mt-5 flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={savePipeline}><Save size={16} /> Save pipeline</button>
                {editingPipelineId && <button className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700" onClick={() => { const pipeline = pipelines.find((item) => item.id === editingPipelineId); if (pipeline) deletePipeline(pipeline); }}>Delete</button>}
              </div>
            </Panel>}
          </section>}

          {activeTab === "marketing" && <section className="space-y-5">
            {marketingView === "campaigns" && <Panel title="Campaigns" icon={<Megaphone size={18} />}>
              <div className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                <div className="mb-3 text-sm font-black">{editingCampaignId ? "Edit campaign" : "Create campaign"}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Campaign name" value={campaignForm.name} onChange={(value) => setCampaignForm({ ...campaignForm, name: value })} />
                  <label className="text-sm font-bold text-[#334155]">Channel
                    <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={campaignForm.channel} onChange={(event) => setCampaignForm({ ...campaignForm, channel: event.target.value })}>
                      {["Social", "Meta Ads", "Google Ads", "Email", "SMS", "Multi-channel"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold text-[#334155]">Status
                    <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={campaignForm.status} onChange={(event) => setCampaignForm({ ...campaignForm, status: event.target.value as MarketingCampaign["status"] })}>
                      {["Draft", "Scheduled", "Active", "Paused", "Completed"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <Field label="Scheduled at" type="datetime-local" value={campaignForm.scheduledAt ?? ""} onChange={(value) => setCampaignForm({ ...campaignForm, scheduledAt: value })} />
                  <Field label="Objective" value={campaignForm.objective ?? ""} onChange={(value) => setCampaignForm({ ...campaignForm, objective: value })} />
                  <Field label="Audience" value={campaignForm.audience ?? ""} onChange={(value) => setCampaignForm({ ...campaignForm, audience: value })} />
                </div>
                <textarea className="mt-3 min-h-24 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="Post, ad, or campaign content" value={campaignForm.content ?? ""} onChange={(event) => setCampaignForm({ ...campaignForm, content: event.target.value })} />
                <Field label="Tracking code / UTM campaign" value={campaignForm.trackingCode ?? ""} onChange={(value) => setCampaignForm({ ...campaignForm, trackingCode: value })} />
                <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveCampaign}><Save size={16} /> Save campaign</button>
              </div>
              <div className="mt-4 space-y-2">
                {marketingCampaigns.map((campaign) => <div key={campaign.id} className="rounded-md border border-[#dde3ec] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><div className="font-black">{campaign.name}</div><div className="text-sm text-[#64748b]">{campaign.channel} - {campaign.status}</div></div>
                    <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => { setEditingCampaignId(campaign.id); setCampaignForm({ name: campaign.name, channel: campaign.channel, status: campaign.status, objective: campaign.objective ?? "", audience: campaign.audience ?? "", content: campaign.content ?? "", scheduledAt: campaign.scheduledAt ?? "", accountIds: campaign.accountIds ?? [], trackingCode: campaign.trackingCode ?? "" }); }}>Edit</button>
                  </div>
                </div>)}
              </div>
            </Panel>}
            {marketingView === "accounts" && <Panel title="Connected Accounts" icon={<ExternalLink size={18} />}>
                <div className="mb-4 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3 text-sm text-[#64748b]">
                  Connected accounts represent external identities this workspace can publish through or track against: Meta business/ad accounts, Google Ads/Tag accounts, and social pages like Instagram, Facebook, LinkedIn, TikTok, YouTube, and X. OAuth is not wired yet; these records prepare the account mapping and permissions model.
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-bold text-[#334155]">Provider
                    <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={marketingAccountForm.provider} onChange={(event) => setMarketingAccountForm({ ...marketingAccountForm, provider: event.target.value })}>
                      {["Meta", "Google", "Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "X"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <Field label="Account name" value={marketingAccountForm.accountName} onChange={(value) => setMarketingAccountForm({ ...marketingAccountForm, accountName: value })} />
                  <Field label="External account ID" value={marketingAccountForm.accountId ?? ""} onChange={(value) => setMarketingAccountForm({ ...marketingAccountForm, accountId: value })} />
                  <label className="text-sm font-bold text-[#334155]">Status
                    <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={marketingAccountForm.status} onChange={(event) => setMarketingAccountForm({ ...marketingAccountForm, status: event.target.value as MarketingAccount["status"] })}>
                      {["NeedsAuth", "Connected", "Disabled"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveMarketingAccount}><Plus size={16} /> Add account</button>
                <div className="mt-4 space-y-2">{marketingAccounts.map((account) => <div key={account.id} className="rounded-md border border-[#dde3ec] bg-white p-3 text-sm"><b>{account.provider}</b> - {account.accountName} <span className="text-[#64748b]">({account.status})</span></div>)}</div>
              </Panel>}
              {marketingView === "tracking" && <Panel title="Tracking" icon={<Settings size={18} />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Meta Pixel ID" value={marketingTracking.metaPixelId ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, metaPixelId: value })} />
                  <Field label="Google Tag ID" value={marketingTracking.googleTagId ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, googleTagId: value })} />
                  <Field label="Google Analytics ID" value={marketingTracking.googleAnalyticsId ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, googleAnalyticsId: value })} />
                  <Field label="Default UTM source" value={marketingTracking.defaultUtmSource ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, defaultUtmSource: value })} />
                  <Field label="Default UTM medium" value={marketingTracking.defaultUtmMedium ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, defaultUtmMedium: value })} />
                  <Field label="Default UTM campaign" value={marketingTracking.defaultUtmCampaign ?? ""} onChange={(value) => setMarketingTracking({ ...marketingTracking, defaultUtmCampaign: value })} />
                </div>
                <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveMarketingTracking}><Save size={16} /> Save tracking</button>
              </Panel>}
          </section>}

          {activeTab === "team" && <section className="space-y-5">
            <Panel title="Users" icon={<Users size={18} />}>
              <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
                <div className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                  <div className="mb-3 text-sm font-black">{editingTeamUserId ? "Edit user" : "Create user"}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="First name" value={teamForm.firstName} onChange={(value) => setTeamForm({ ...teamForm, firstName: value })} />
                    <Field label="Last name" value={teamForm.lastName} onChange={(value) => setTeamForm({ ...teamForm, lastName: value })} />
                    <Field label="Email" value={teamForm.email} onChange={(value) => setTeamForm({ ...teamForm, email: value })} />
                    <Field label={editingTeamUserId ? "New password optional" : "Password optional"} type="password" value={teamForm.password} onChange={(value) => setTeamForm({ ...teamForm, password: value })} />
                    <label className="text-sm font-bold text-[#334155]">Role
                      <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={teamForm.role} onChange={(event) => {
                        const roleName = event.target.value;
                        const customRole = workspaceRoles.find((role) => role.name === roleName);
                        setTeamForm({ ...teamForm, role: roleName, permissions: customRole?.permissions ?? roleTemplates[roleName] ?? roleTemplates.Staff });
                      }}>
                        {[...Object.keys(roleTemplates), ...workspaceRoles.filter((role) => !role.system).map((role) => role.name)].map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#334155]">Status
                      <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={teamForm.status} onChange={(event) => setTeamForm({ ...teamForm, status: event.target.value as "Active" | "Inactive" })}>
                        <option value="Active">Active</option><option value="Inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                  <PermissionGrid permissions={teamForm.permissions} onChange={(permissions) => setTeamForm({ ...teamForm, permissions })} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveTeamUser}><Save size={16} /> Save user</button>
                    {editingTeamUserId && <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => { setEditingTeamUserId(null); setTeamForm(emptyTeamUser); }}>Cancel</button>}
                  </div>
                </div>
                <div className="space-y-2">{workspaceUsers.map((member) => <div key={member.id} className="rounded-md border border-[#dde3ec] bg-white p-3"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-black text-[#16202a]">{`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email}</div><div className="text-sm text-[#64748b]">{member.email}</div><div className="mt-2 flex gap-1.5 text-[11px] font-black"><span className="rounded-full bg-[#eef5ff] px-2 py-1 text-[#2563eb]">{member.role}</span><span className={`rounded-full px-2 py-1 ${member.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{member.status}</span></div></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => editTeamUser(member)}>Edit</button><button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => toggleTeamUser(member)}>{member.status === "Active" ? "Deactivate" : "Activate"}</button></div></div></div>)}</div>
              </div>
            </Panel>
            <Panel title="Roles" icon={<Settings size={18} />}>
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                  <Field label="Role name" value={roleForm.name} onChange={(value) => setRoleForm({ ...roleForm, name: value })} />
                  <textarea className="mt-3 min-h-16 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="Description" value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} />
                  <PermissionGrid permissions={roleForm.permissions} onChange={(permissions) => setRoleForm({ ...roleForm, permissions })} />
                  <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveWorkspaceRole}><Save size={16} /> Save role</button>
                </div>
                <div className="space-y-2">{[...Object.entries(roleTemplates).map(([name, permissions]) => ({ id: name, name, permissions, system: true } as WorkspaceRole)), ...workspaceRoles].map((role) => <button key={role.id} className="w-full rounded-md border border-[#dde3ec] bg-white p-3 text-left" onClick={() => { if (!role.system) { setEditingRoleId(role.id); setRoleForm({ name: role.name, description: role.description ?? "", permissions: role.permissions }); } }}><div className="font-black">{role.name} {role.system && <span className="text-xs text-[#64748b]">(system)</span>}</div><div className="mt-1 text-xs text-[#64748b]">{permissionKeys.filter((key) => role.permissions[key]).join(", ")}</div></button>)}</div>
              </div>
            </Panel>
            <Panel title="Subaccounts" icon={<Users size={18} />}>
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
                  <div className="mb-4 rounded-md border border-[#c7d2fe] bg-[#eef5ff] p-3 text-sm text-[#174ea6]">
                    Subaccounts are client/business contexts. A person can belong to any number of them and switch the active context from the top bar.
                  </div>
                  <Field label="Subaccount name" value={subAccountForm.name} onChange={(value) => setSubAccountForm({ ...subAccountForm, name: value, slug: editingSubAccountId ? subAccountForm.slug : slugifyLocal(value) })} />
                  <Field label="Slug" value={subAccountForm.slug} onChange={(value) => setSubAccountForm({ ...subAccountForm, slug: slugifyLocal(value) })} />
                  <Field label="Owner email" value={subAccountForm.ownerEmail} onChange={(value) => setSubAccountForm({ ...subAccountForm, ownerEmail: value })} />
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_150px]">
                    <Field label="Grant access to email" value={subAccountForm.accessEmail} onChange={(value) => setSubAccountForm({ ...subAccountForm, accessEmail: value })} />
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-[#475569]">Role</span>
                      <select className="w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={subAccountForm.accessRole} onChange={(event) => setSubAccountForm({ ...subAccountForm, accessRole: event.target.value })}>
                        {Object.keys(roleTemplates).map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block text-sm font-bold text-[#334155]">Status<select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={subAccountForm.status} onChange={(event) => setSubAccountForm({ ...subAccountForm, status: event.target.value as "Active" | "Inactive" })}><option>Active</option><option>Inactive</option></select></label>
                  {subAccountForm.members.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{subAccountForm.members.map((member) => <span key={member.email} className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#334155] ring-1 ring-[#dde3ec]">{member.email} - {member.role}</span>)}</div>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveSubAccount}><Save size={16} /> Save subaccount</button>
                    {editingSubAccountId && <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => { setEditingSubAccountId(null); setSubAccountForm(emptySubAccount); }}>New</button>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`rounded-md border p-3 ${activeSubAccountId === "agency" ? "border-[var(--theme-primary)] bg-[#eef5ff]" : "border-[#dde3ec] bg-white"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div><div className="font-black">Agency workspace</div><div className="text-sm text-[#64748b]">/{authUser.workspaceSlug} - all agency-level modules</div></div>
                      <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => switchSubAccount("agency")}>Switch</button>
                    </div>
                  </div>
                  {subAccounts.map((account) => <div key={account.id} className={`rounded-md border p-3 ${activeSubAccountId === account.id ? "border-[var(--theme-primary)] bg-[#eef5ff]" : "border-[#dde3ec] bg-white"}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-black">{account.name}</div>
                        <div className="text-sm text-[#64748b]">/{account.slug} - {account.status}</div>
                        <div className="mt-1 text-xs text-[#64748b]">Owner: {account.ownerEmail || "Unassigned"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">{(account.members ?? []).map((member) => <span key={member.email} className="rounded-full bg-[#f8fafc] px-2 py-1 text-[11px] font-black text-[#475569] ring-1 ring-[#dde3ec]">{member.email} - {member.role}</span>)}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold" onClick={() => switchSubAccount(account.id)}>Switch</button>
                        <button className="rounded-md bg-[var(--theme-primary)] px-3 py-2 text-sm font-bold text-white" onClick={() => { setEditingSubAccountId(account.id); setSubAccountForm({ name: account.name, slug: account.slug, ownerEmail: account.ownerEmail ?? "", accessEmail: "", accessRole: "Admin", status: account.status, members: account.members ?? [] }); }}>Edit access</button>
                      </div>
                    </div>
                  </div>)}
                </div>
              </div>
            </Panel>
          </section>}

          {activeTab === "settings" && <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Application Settings" icon={<Settings size={18} />}>
              <div className="space-y-2 text-sm text-stone-600">
                <p>Workspace: {authUser.workspaceName}</p>
                <p>Workspace slug: /{authUser.workspaceSlug}</p>
                <p>Plan: Agency workspace with team, role, and white-label controls.</p>
                <p>Branding, fonts, and global app appearance apply across modules.</p>
              </div>
            </Panel>
            <Panel title="Agency White Label" icon={<Settings size={18} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Brand name" value={whiteLabel.brandName ?? ""} onChange={(value) => setWhiteLabel({ ...whiteLabel, brandName: value })} />
                <Field label="Reseller / agency name" value={whiteLabel.resellerName ?? ""} onChange={(value) => setWhiteLabel({ ...whiteLabel, resellerName: value })} />
                <Field label="Support email" value={whiteLabel.supportEmail ?? ""} onChange={(value) => setWhiteLabel({ ...whiteLabel, supportEmail: value })} />
                <Field label="Custom domain" value={whiteLabel.customDomain ?? ""} onChange={(value) => setWhiteLabel({ ...whiteLabel, customDomain: value })} />
                <Field label="Logo URL" value={whiteLabel.logoUrl ?? ""} onChange={(value) => setWhiteLabel({ ...whiteLabel, logoUrl: value })} />
                <label className="flex items-center gap-2 text-sm font-bold text-[#334155]"><input type="checkbox" checked={whiteLabel.agencyMode} onChange={(event) => setWhiteLabel({ ...whiteLabel, agencyMode: event.target.checked })} /> Agency / reseller mode</label>
                <label className="flex items-center gap-2 text-sm font-bold text-[#334155]"><input type="checkbox" checked={whiteLabel.hidePoweredBy} onChange={(event) => setWhiteLabel({ ...whiteLabel, hidePoweredBy: event.target.checked })} /> Hide powered-by branding</label>
              </div>
              <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveWhiteLabel}><Save size={16} /> Save white label</button>
            </Panel>
            <Panel title="Brand Theme" icon={<Settings size={18} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {themePresets.map((preset) => (
                  <button key={preset.preset} type="button" className={`rounded-md border p-3 text-left text-sm ${theme.preset === preset.preset ? "border-[var(--theme-primary)] bg-[#f5f9ff]" : "border-[#dde3ec] bg-white hover:bg-[#fbfcff]"}`} onClick={() => setTheme(preset)}>
                    <div className="mb-2 font-bold capitalize">{preset.preset}</div>
                    <ThemeSwatches theme={preset} />
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ColorField label="Primary" value={theme.primary} onChange={(value) => setTheme({ ...theme, preset: "custom", primary: value })} />
                <ColorField label="Secondary" value={theme.secondary} onChange={(value) => setTheme({ ...theme, preset: "custom", secondary: value })} />
                <ColorField label="Accent" value={theme.accent} onChange={(value) => setTheme({ ...theme, preset: "custom", accent: value })} />
                <ColorField label="Danger" value={theme.danger} onChange={(value) => setTheme({ ...theme, preset: "custom", danger: value })} />
                <ColorField label="Background" value={theme.background} onChange={(value) => setTheme({ ...theme, preset: "custom", background: value })} />
                <ColorField label="Surface" value={theme.surface} onChange={(value) => setTheme({ ...theme, preset: "custom", surface: value })} />
                <ColorField label="Text" value={theme.text} onChange={(value) => setTheme({ ...theme, preset: "custom", text: value })} />
                <ColorField label="Muted text" value={theme.muted} onChange={(value) => setTheme({ ...theme, preset: "custom", muted: value })} />
                <SelectField label="Display font" value={theme.displayFont} options={fontOptions} onChange={(value) => setTheme({ ...theme, preset: "custom", displayFont: value })} />
                <SelectField label="Body font" value={theme.bodyFont} options={fontOptions} onChange={(value) => setTheme({ ...theme, preset: "custom", bodyFont: value })} />
              </div>
              <div className="mt-5 rounded-md border border-[#dde3ec] bg-[var(--theme-surface)] p-4" style={themeStyle(theme)}>
                <div className="display-font text-lg font-bold text-[var(--theme-text)]">Live preview</div>
                <p className="mt-1 text-sm text-[var(--theme-muted)]">This branding will appear on admin and customer booking pages.</p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-md bg-[var(--theme-primary)] px-3 py-2 text-xs font-bold text-white">Primary</span>
                  <span className="rounded-md bg-[var(--theme-secondary)] px-3 py-2 text-xs font-bold text-white">Secondary</span>
                  <span className="rounded-md bg-[var(--theme-accent)] px-3 py-2 text-xs font-bold text-[#16202a]">Accent</span>
                </div>
              </div>
              <button type="button" disabled={savingTheme} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60" onClick={saveTheme}>
                <Save size={16} /> {savingTheme ? "Saving..." : "Save theme"}
              </button>
            </Panel>
          </section>}

          {activeTab === "profile" && <section className="max-w-3xl">
            <Panel title="My Profile" icon={<Users size={18} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" value={authUser.email} onChange={() => undefined} />
                <Field label="Workspace" value={authUser.workspaceName} onChange={() => undefined} />
                <Field label="Workspace slug" value={authUser.workspaceSlug} onChange={() => undefined} />
                <Field label="User id" value={authUser.userId} onChange={() => undefined} />
              </div>
            </Panel>
          </section>}
        </div>
      </section>
    </main>
  );
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [workspaceName, setWorkspaceName] = useState("Acme Coaching");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${apiBase}/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "signup" ? { workspaceName, email, password } : { email, password })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Authentication failed." }));
      setError(body.error ?? "Authentication failed.");
      return;
    }
    const auth = await response.json() as AuthResponse;
    saveAuth(auth);
    onAuthenticated(auth.user);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f7f9fd,#f4f8ff_45%,#f7fbf8)] px-4 text-[#16202a]">
      <section className="w-full max-w-md overflow-hidden rounded-md border border-[#dde3ec] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
        <ColorRail />
        <div className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#2563eb] text-white">
          <Lock size={20} />
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285f4]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbc05]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
          </div>
        </div>
        <h1 className="display-font text-2xl font-bold">{mode === "signup" ? "Create your booking workspace" : "Login to your workspace"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">White-label calendar booking for coaches, consultants, clinics, and personal brands.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && <Field label="Business / workspace name" value={workspaceName} onChange={setWorkspaceName} />}
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-md bg-[#2563eb] px-4 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200">
            {mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
        <button className="mt-4 text-sm font-bold text-[#2563eb]" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "Already have an account? Login" : "Need an account? Sign up"}
        </button>
        </div>
      </section>
    </main>
  );
}

function PublicSitePage({ siteRoute }: { siteRoute: string }) {
  const [workspaceSlug, pageSlug] = siteRoute.split("/");
  const [page, setPage] = useState<SitePage | null>(null);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${apiBase}/api/public/sites/${workspaceSlug}/${pageSlug}?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Page not found.");
        return response.json();
      })
      .then((data) => { setPage(data.page); setTheme(data.page?.theme ?? data.theme ?? defaultTheme); })
      .catch((err) => setError(err.message));
  }, [workspaceSlug, pageSlug]);
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-[#16202a]">{error}</main>;
  if (!page) return <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-[#16202a]">Loading...</main>;
  return <main className="min-h-screen bg-[var(--theme-background)]" style={themeStyle(page.theme ?? theme)}><SitePagePreview page={page} theme={page.theme ?? theme} publicMode /></main>;
}

function PublicBookingPage() {
  const [workspaceSlug, appointmentSlug] = useMemo(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return [parts[1] ?? "acme-coaching", parts[2] ?? "discovery-call"];
  }, []);
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [metadata, setMetadata] = useState<PublicMetadata | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const slotsByDate = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = slot.displayStart.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return groups;
  }, [slots]);
  const selectedDaySlots = slotsByDate.get(selectedDate) ?? [];

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("calbook.customerEmail");
    const emailPart = rememberedEmail ? `&email=${encodeURIComponent(rememberedEmail)}` : "";
    fetch(`${apiBase}/api/public/booking/${workspaceSlug}/${appointmentSlug}?t=${Date.now()}${emailPart}`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setMetadata)
      .catch(() => setError("This booking page is unavailable."));
  }, [workspaceSlug, appointmentSlug]);

  useEffect(() => {
    const from = toDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
    const to = toDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0));
    fetch(`${apiBase}/api/public/booking/${workspaceSlug}/${appointmentSlug}/slots?from=${from}&to=${to}&timezone=Australia/Sydney&t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]));
  }, [workspaceSlug, appointmentSlug, visibleMonth]);

  async function confirmBooking() {
    if (!selectedSlot) return;
    setError("");
    const validation = validateCustomer(customer);
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) return;
    const response = await fetch(`${apiBase}/api/public/booking/${workspaceSlug}/${appointmentSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...customer, timezone: "Australia/Sydney", startUtc: selectedSlot.startUtc })
    });

    if (!response.ok) {
      setError("That time is no longer available. Please choose another slot.");
      setSelectedSlot(null);
      return;
    }

    setConfirmed(true);
    localStorage.setItem("calbook.customerEmail", customer.email.trim());
  }

  if (confirmed && selectedSlot && metadata) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,var(--theme-background),#f4f8ff_45%,#f7fbf8)] px-4 py-10 text-[var(--theme-text)]" style={themeStyle(metadata.theme)}>
        <section className="w-full max-w-xl overflow-hidden rounded-lg border border-[#dde3ec] bg-white text-center shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <ColorRail />
          <div className="p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f7ee] text-[#006b3f]">
            <Check size={24} />
          </div>
          <h1 className="text-2xl font-semibold">You are booked</h1>
          <p className="mt-2 text-[#666]">{metadata.appointmentTypeName} with {metadata.workspaceName}</p>
          <div className="mt-6 rounded-md border border-[#dadada] bg-[#fafafa] p-4 text-sm">
            {new Date(selectedSlot.displayStart).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
          </div>
          <a className="mt-6 inline-flex rounded-md border border-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary)]" href={`/book/${workspaceSlug}/${appointmentSlug}`}>
            Book another time
          </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,var(--theme-background),#f4f8ff_45%,#f7fbf8)] px-4 py-5 text-[var(--theme-text)] md:py-8" style={themeStyle(metadata?.theme)}>
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-[#dde3ec] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] lg:grid-cols-[300px_1fr_280px]">
        <aside className="border-b border-[#e4e4e4] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-6 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--theme-primary)] text-sm font-bold text-white">
              {(metadata?.workspaceName ?? "A").slice(0, 1)}
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--theme-primary)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--theme-secondary)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--theme-accent)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--theme-danger)]" />
            </div>
          </div>
          <div className="mb-2 text-sm font-semibold text-[#6f6f6f]">{metadata?.workspaceName ?? "Loading"}</div>
          <h1 className="display-font text-2xl font-bold leading-tight">{metadata?.appointmentTypeName ?? "Loading..."}</h1>
          <p className="mt-4 text-sm leading-6 text-[#5f5f5f]">{metadata?.description}</p>
          <div className="mt-7 space-y-4 text-sm font-medium text-[#5f5f5f]">
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff4db] text-[#9a6700]"><Clock size={17} /></span> {metadata?.durationMinutes ?? 30} min</div>
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#edf8f1] text-[#137333]"><MapPin size={17} /></span> {metadata?.locationValue ?? "Online meeting"}</div>
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eef5ff] text-[#2563eb]"><Calendar size={17} /></span> Australia/Sydney</div>
          </div>
        </aside>

        <section className="border-b border-[#e4e4e4] p-6 lg:border-b-0">
          <ColorRail />
          <h2 className="display-font mb-5 text-xl font-bold">Select a Date & Time</h2>
          <div className="mb-5 flex items-center justify-between">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[var(--theme-primary)] hover:bg-[#eef5ff]" onClick={() => { setVisibleMonth(addMonths(visibleMonth, -1)); setSelectedSlot(null); }}>
              {"<"}
            </button>
            <div className="text-base font-bold">
              {visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[var(--theme-primary)] hover:bg-[#eef5ff]" onClick={() => { setVisibleMonth(addMonths(visibleMonth, 1)); setSelectedSlot(null); }}>
              {">"}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
              <div key={day} className="pb-2 text-xs font-bold text-[#777]">{day}</div>
            ))}
            {monthDays.map((date, index) => {
              const key = date ? toDateKey(date) : `blank-${index}`;
              const dateKey = date ? toDateKey(date) : "";
              const hasSlots = Boolean(date && slotsByDate.has(dateKey));
              const isSelected = dateKey === selectedDate;
              const isPast = Boolean(date && dateKey < toDateKey(today));
              return (
                <button
                  key={key}
                  disabled={!date || !hasSlots || isPast}
                  className={[
                    "mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition",
                    !date ? "invisible" : "",
                    hasSlots && !isSelected ? "border border-[#d8e6ff] bg-[#f8fbff] text-[var(--theme-primary)] hover:bg-[#eef5ff]" : "",
                    isSelected ? "bg-[var(--theme-primary)] text-white shadow-sm shadow-blue-200" : "",
                    !hasSlots || isPast ? "cursor-not-allowed text-[#b9b9b9]" : ""
                  ].join(" ")}
                  onClick={() => {
                    if (!date) return;
                    setSelectedDate(dateKey);
                    setSelectedSlot(null);
                    setError("");
                  }}
                >
                  {date?.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold">Time zone</div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ff] bg-[#f5f9ff] px-3 py-2 text-sm text-[#4f4f4f]">
              <MapPin size={15} /> Australia/Sydney
            </div>
          </div>
        </section>

        <aside className="bg-[linear-gradient(180deg,#fbfcff,#fffaf0)] p-6">
          {!selectedSlot && (
            <>
              <h3 className="mb-4 text-base font-bold">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <div className="space-y-2">
                {selectedDaySlots.length === 0 && <p className="text-sm text-[#777]">No times available for this date.</p>}
                {selectedDaySlots.map((slot) => (
                  <button
                    key={slot.startUtc}
                    className="w-full rounded-md border border-[var(--theme-primary)] bg-white px-4 py-3 text-center text-sm font-bold text-[var(--theme-primary)] shadow-sm shadow-blue-50 hover:bg-[#f4f9ff]"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {new Date(slot.displayStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedSlot && (
            <>
              <button className="mb-4 text-sm font-bold text-[var(--theme-primary)]" onClick={() => setSelectedSlot(null)}>Back to times</button>
              <h3 className="text-base font-bold">Enter Details</h3>
              <div className="mt-3 rounded-md bg-[#f7f7f5] p-3 text-sm text-[#555]">
                {new Date(selectedSlot.displayStart).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
              <div className="mt-4 space-y-3">
                <Field label="First name" value={customer.firstName} error={fieldErrors.firstName} onChange={(value) => setCustomer({ ...customer, firstName: value })} />
                <Field label="Last name" value={customer.lastName} error={fieldErrors.lastName} onChange={(value) => setCustomer({ ...customer, lastName: value })} />
                <Field label="Email" type="email" value={customer.email} error={fieldErrors.email} onChange={(value) => setCustomer({ ...customer, email: value })} />
                <Field label="Phone" type="tel" value={customer.phone} error={fieldErrors.phone} onChange={(value) => setCustomer({ ...customer, phone: value })} />
              </div>
              {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
              <button
                className="mt-5 w-full rounded-md bg-[var(--theme-primary)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
                disabled={!customer.firstName || !customer.lastName || !customer.email || !customer.phone}
                onClick={confirmBooking}
              >
                Schedule Event
              </button>
              <p className="mt-3 text-xs leading-5 text-[#777]">By booking, your details will be saved as a contact for this workspace.</p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

type PublicMetadata = {
  workspaceName: string;
  appointmentTypeName: string;
  description?: string;
  durationMinutes: number;
  locationType: string | number;
  locationValue?: string;
  timezone: string;
  theme: ThemeConfig;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let day = 1; day <= last.getDate(); day++) days.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function validateCustomer(customer: { firstName: string; lastName: string; email: string; phone: string }) {
  const errors: Record<string, string> = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phonePattern = /^\+?[0-9\s().-]{7,20}$/;
  if (customer.firstName.trim().length < 2) errors.firstName = "Enter at least 2 characters.";
  if (customer.lastName.trim().length < 2) errors.lastName = "Enter at least 2 characters.";
  if (!emailPattern.test(customer.email.trim())) errors.email = "Enter a valid email address.";
  if (!phonePattern.test(customer.phone.trim())) errors.phone = "Enter a valid phone number.";
  return errors;
}

function defaultCustomFieldValue(type: string, value = ""): string | string[] | boolean {
  if (type === "dropdownMultiple" || type === "textList" || type === "checkbox") return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
  if (type === "signature") return "";
  return value;
}

function normalizeCustomField(field: ContactCustomField | string): ContactCustomField {
  if (typeof field === "string") return { type: "text", value: field, options: [] };
  return { type: field.type || "text", value: field.value ?? defaultCustomFieldValue(field.type || "text"), options: field.options ?? [] };
}

function customFieldTypeLabel(type: string) {
  for (const group of customFieldTypes) {
    const found = group.options.find(([value]) => value === type);
    if (found) return `${group.group}: ${found[1]}`;
  }
  return "Text input: Single line";
}

function slugifyLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "stage";
}

function NavItem({ icon, label, active = false, collapsed = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; collapsed?: boolean; onClick?: () => void }) {
  return <button title={label} className={`flex w-full items-center gap-2 rounded-md border-l-4 px-3 py-2 text-left ${collapsed ? "justify-center px-2" : ""} ${active ? "border-[#4285f4] bg-[#eaf2ff] text-[#174ea6]" : "border-transparent text-[#64748b] hover:border-[#fbbc05] hover:bg-[#fff8df]"}`} onClick={onClick}>{icon}{!collapsed && label}</button>;
}

function ModuleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`rounded-md px-3 py-2 text-sm font-bold ${active ? "bg-[var(--theme-primary)] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`} onClick={onClick}>
      {label}
    </button>
  );
}

function PermissionGrid({ permissions, onChange }: { permissions: Record<string, boolean>; onChange: (permissions: Record<string, boolean>) => void }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {permissionKeys.map((key) => (
        <label key={key} className="flex items-center gap-2 rounded-md border border-[#dde3ec] bg-white p-2 text-sm font-bold capitalize text-[#334155]">
          <input type="checkbox" checked={Boolean(permissions[key])} onChange={(event) => onChange({ ...permissions, [key]: event.target.checked })} /> {key}
        </label>
      ))}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-[#dde3ec] bg-white shadow-sm">
      <ColorRail />
      <div className="p-4">
      <div className="mb-4 flex items-center gap-2 display-font text-base font-bold text-[#16202a]">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[linear-gradient(135deg,#eef5ff,#edf8f1)] text-[#2563eb]">{icon}</span>
        {title}
      </div>
      {children}
      </div>
    </section>
  );
}

function AutomationCanvas({
  title,
  triggers,
  actions,
  isActive,
  compact = false,
  zoom = 1,
  onAddTrigger,
  onUpdateTrigger,
  onRemoveTrigger,
  onAddActionAfter,
  onAddNestedAction,
  onUpdateAction,
  onRemoveAction
}: {
  title: string;
  triggers: Array<{ id: string; type: string; filterKey?: string; filterValue?: string }>;
  actions: AutomationFormAction[];
  isActive: boolean;
  compact?: boolean;
  zoom?: number;
  onAddTrigger?: () => void;
  onUpdateTrigger?: (id: string, patch: { type?: string; filterKey?: string; filterValue?: string }) => void;
  onRemoveTrigger?: (id: string) => void;
  onAddActionAfter?: (id: string) => void;
  onAddNestedAction?: (id: string, branch: "then" | "else") => void;
  onUpdateAction?: (id: string, patch: { type?: string; configText?: string }) => void;
  onRemoveAction?: (id: string) => void;
}) {
  const editable = Boolean(onUpdateAction);
  const visibleActions = actions.length ? actions : [{ id: "empty-action", type: "", configText: "" }];
  return (
    <div className={`${compact ? "mt-3 p-3" : "mb-5 p-4"} overflow-auto rounded-md border border-[#dde3ec] bg-[linear-gradient(135deg,#f8fbff,#fffdf4_52%,#f7fbf8)]`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#16202a]">{compact ? "Workflow canvas" : title}</div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isActive ? "Active" : "Inactive"}</span>
      </div>
      <div className="mx-auto flex min-w-[980px] max-w-none origin-top flex-col items-center" style={{ transform: `scale(${compact ? 1 : zoom})`, transformOrigin: "top center", marginBottom: compact ? 0 : `${Math.max(0, 1 - zoom) * -140}px` }}>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {triggers.map((trigger, index) => (
            <DiagramNode
              key={trigger.id}
              label={`Trigger ${index + 1}`}
              type={trigger.type}
              filterKey={trigger.filterKey}
              filterValue={trigger.filterValue}
              tone="blue"
              kind="trigger"
              compact={compact}
              canRemove={triggers.length > 1}
              onChange={(patch) => onUpdateTrigger?.(trigger.id, patch)}
              onRemove={() => onRemoveTrigger?.(trigger.id)}
            />
          ))}
        </div>
        {editable && <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white px-3 py-2 text-xs font-black text-[#174ea6]" onClick={onAddTrigger}><Plus size={14} /> Add start trigger</button>}
        <AutomationStepTree
          actions={visibleActions}
          compact={compact}
          editable={editable}
          canRemoveRoot={actions.length > 1}
          onAddActionAfter={onAddActionAfter}
          onAddNestedAction={onAddNestedAction}
          onUpdateAction={onUpdateAction}
          onRemoveAction={onRemoveAction}
        />
      </div>
    </div>
  );
}

function AutomationStepTree({
  actions,
  compact,
  editable,
  canRemoveRoot,
  depth = 0,
  onAddActionAfter,
  onAddNestedAction,
  onUpdateAction,
  onRemoveAction
}: {
  actions: AutomationFormAction[];
  compact: boolean;
  editable: boolean;
  canRemoveRoot: boolean;
  depth?: number;
  onAddActionAfter?: (id: string) => void;
  onAddNestedAction?: (id: string, branch: "then" | "else") => void;
  onUpdateAction?: (id: string, patch: { type?: string; configText?: string }) => void;
  onRemoveAction?: (id: string) => void;
}) {
  return (
    <>
      {actions.map((action, index) => {
        const actionLabel = automationActionOptions.find((item) => item.value === action.type)?.label ?? (action.type || "No action selected");
        const hasBranches = action.type === "IfElse" || (action.then?.length || action.else?.length);
        return (
          <React.Fragment key={action.id}>
            <DiagramArrow vertical />
            <div className="flex w-full flex-col items-center">
              <DiagramNode
                label={`${depth ? "Nested " : ""}Step ${index + 1}`}
                type={action.type}
                configText={action.configText}
                value={actionLabel}
                tone={action.type === "IfElse" ? "yellow" : action.type === "Wait" ? "blue" : index % 2 === 0 ? "green" : "pink"}
                kind="action"
                compact={compact}
                canRemove={canRemoveRoot || depth > 0}
                onChange={(patch) => onUpdateAction?.(action.id, patch)}
                onRemove={() => onRemoveAction?.(action.id)}
              />
              {hasBranches && (
                <div className="mt-3 grid w-[880px] gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-[#bbf7d0] bg-white p-3">
                    <div className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-black text-[#137333]"><span className="rounded-full bg-[#edf8f1] px-2 py-1">YES</span> THEN path</div>
                    {(action.then ?? []).length > 0 ? <AutomationStepTree actions={action.then ?? []} compact={compact} editable={editable} canRemoveRoot depth={depth + 1} onAddActionAfter={onAddActionAfter} onAddNestedAction={onAddNestedAction} onUpdateAction={onUpdateAction} onRemoveAction={onRemoveAction} /> : <div className="text-center text-xs font-bold text-[#64748b]">No steps yet</div>}
                    {editable && <button className="mt-2 w-full rounded-md border border-[#bbf7d0] bg-[#edf8f1] px-2 py-2 text-xs font-black text-[#137333]" onClick={() => onAddNestedAction?.(action.id, "then")}>Add yes step</button>}
                  </div>
                  <div className="rounded-md border border-[#fbcfe8] bg-white p-3">
                    <div className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-black text-[#9d174d]"><span className="rounded-full bg-[#fff1f8] px-2 py-1">NO</span> ELSE path</div>
                    {(action.else ?? []).length > 0 ? <AutomationStepTree actions={action.else ?? []} compact={compact} editable={editable} canRemoveRoot depth={depth + 1} onAddActionAfter={onAddActionAfter} onAddNestedAction={onAddNestedAction} onUpdateAction={onUpdateAction} onRemoveAction={onRemoveAction} /> : <div className="text-center text-xs font-bold text-[#64748b]">No steps yet</div>}
                    {editable && <button className="mt-2 w-full rounded-md border border-[#fbcfe8] bg-[#fff1f8] px-2 py-2 text-xs font-black text-[#9d174d]" onClick={() => onAddNestedAction?.(action.id, "else")}>Add no step</button>}
                  </div>
                </div>
              )}
            </div>
            {editable && <button className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-black text-[#334155]" onClick={() => onAddActionAfter?.(action.id)}><Plus size={14} /> Add next step</button>}
          </React.Fragment>
        );
      })}
    </>
  );
}

function NestedActionList({ title, actions, onAdd, onTypeChange, onUpdate, onRemove }: { title: string; actions: AutomationFormAction[]; onAdd: () => void; onTypeChange: (id: string, type: string) => void; onUpdate: (id: string, patch: Partial<AutomationFormAction>) => void; onRemove: (id: string) => void }) {
  return (
    <div className="rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase tracking-wide text-[#334155]">{title}</div>
        <button className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-black" onClick={onAdd}>Add</button>
      </div>
      <div className="space-y-2">
        {actions.length === 0 && <div className="rounded-md border border-dashed border-[#cbd5e1] p-3 text-xs font-bold text-[#64748b]">No nested steps yet.</div>}
        {actions.map((action) => (
          <div key={action.id} className="rounded-md border border-[#dde3ec] bg-white p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <select className="w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-xs font-bold" value={action.type} onChange={(event) => onTypeChange(action.id, event.target.value)}>
                {automationActionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button className="rounded-md border border-rose-200 p-2 text-rose-700" onClick={() => onRemove(action.id)}><Trash2 size={13} /></button>
            </div>
            <ActionConfigEditor action={action} compact onChange={(configText) => onUpdate(action.id, { configText })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionConfigEditor({ action, compact = false, onChange }: { action: AutomationFormAction; compact?: boolean; onChange: (configText: string) => void }) {
  const config = configTextToObject(action.configText);
  const setValue = (key: string, value: string) => onChange(updateConfigText(action.configText, key, value));
  const fieldClass = "mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm";
  const textClass = `${fieldClass} ${compact ? "min-h-16" : "min-h-24"} resize-y`;
  const hint = {
    SendEmail: "Sends a personalized email using appointment and contact data.",
    Wait: "Pauses the workflow for a duration or until a date from the trigger payload.",
    CreateOpportunity: "Creates a deal from the appointment and contact details.",
    CallExternalApi: "Sends data to another system.",
    IfElse: "Splits the workflow into yes/no paths.",
    TriggerEvent: "Emits a new event that can start another automation."
  }[action.type] ?? "Configure what this step should do.";

  const input = (key: string, label: string, placeholder = "", type = "text") => (
    <label className="text-sm font-bold text-[#334155]">{label}
      <input className={fieldClass} type={type} placeholder={placeholder} value={config[key] ?? ""} onChange={(event) => setValue(key, event.target.value)} />
    </label>
  );
  const textarea = (key: string, label: string, placeholder = "") => (
    <label className="text-sm font-bold text-[#334155]">{label}
      <textarea className={textClass} placeholder={placeholder} value={config[key] ?? ""} onChange={(event) => setValue(key, event.target.value)} />
    </label>
  );
  const select = (key: string, label: string, options: string[]) => (
    <label className="text-sm font-bold text-[#334155]">{label}
      <select className={fieldClass} value={config[key] ?? options[0]} onChange={(event) => setValue(key, event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );

  let fields: React.ReactNode;
  if (action.type === "SendEmail") fields = <><div className="grid gap-3 md:grid-cols-2">{input("to", "Recipient", "{{contact.email}")}{input("subject", "Subject", "Reminder: appointment tomorrow")}</div>{textarea("body", "Message", "Hi {{contact.firstName}}, we will see you at {{appointment.startAt}}.")}</>;
  else if (action.type === "Wait") fields = <div className="grid gap-3 md:grid-cols-2">{input("duration", "Wait duration", "1", "number")}{select("unit", "Unit", ["minutes", "hours", "days"])}{input("until", "Or wait until", "{{appointment.startAt}}")}{input("offsetMinutes", "Offset minutes", "-10", "number")}{input("offsetHours", "Offset hours", "-24", "number")}</div>;
  else if (action.type === "CreateOpportunity") fields = <div className="grid gap-3 md:grid-cols-2">{input("pipelineId", "Pipeline", "{{defaultPipeline.id}")}{input("stageId", "Stage", "{{defaultStage.id}")}{input("title", "Opportunity title", "{{appointment.name}} - {{contact.fullName}}")}{input("value", "Value", "0", "number")}{input("source", "Source", "Appointment")}</div>;
  else if (action.type === "MoveOpportunity") fields = <div className="grid gap-3 md:grid-cols-2">{input("opportunityId", "Opportunity", "{{opportunity.id}")}{input("stageId", "Move to stage", "{{stage.id}")}</div>;
  else if (action.type === "CreateTask") fields = <><div className="grid gap-3 md:grid-cols-2">{input("title", "Task title", "Follow up with {{contact.fullName}}")}{input("dueInDays", "Due in days", "1", "number")}</div>{textarea("description", "Task notes", "Review appointment and prepare next step.")}</>;
  else if (action.type === "AddContactTag" || action.type === "RemoveContactTag") fields = input("tag", "Tag", "new-client");
  else if (action.type === "IfElse") fields = <div className="grid gap-3 md:grid-cols-3">{input("condition", "Condition", "{{contact.tags}} contains vip")}{input("trueLabel", "Yes label", "VIP")}{input("falseLabel", "No label", "Standard")}</div>;
  else if (action.type === "CallExternalApi" || action.type === "Webhook") fields = <><div className="grid gap-3 md:grid-cols-2">{select("method", "Method", ["POST", "PUT", "PATCH", "GET"])}{input("url", "URL", "https://example.com/webhook")}{input("headers.Authorization", "Authorization header", "Bearer token")}</div>{textarea("body", "Request body", "{\"contactId\":\"{{contact.id}}\",\"appointmentId\":\"{{appointment.id}}\"}")}</>;
  else if (action.type === "TriggerEvent") fields = <div className="grid gap-3 md:grid-cols-2">{input("eventName", "Event name", "AppointmentReminderSent")}{input("payload.appointmentId", "Appointment ID", "{{appointment.id}")}{input("payload.contactId", "Contact ID", "{{contact.id}")}</div>;
  else if (action.type === "SetData") fields = <div className="grid gap-3 md:grid-cols-2">{input("key", "Data key", "appointmentSummary")}{input("value", "Value", "{{appointment.name}} for {{contact.fullName}}")}</div>;
  else if (action.type === "StartAutomation" || action.type === "StopAutomation") fields = input("automationId", "Automation", "{{automation.id}}");
  else fields = textarea("message", "Message / configuration", config.message ?? action.configText);

  return (
    <div className="mt-3 rounded-md border border-[#dde3ec] bg-[#fbfcff] p-3">
      <div className="mb-3 text-xs font-bold text-[#64748b]">{hint}</div>
      <div className="space-y-3">{fields}</div>
      {!compact && <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-[#64748b]">
        {["{{contact.email}}", "{{contact.firstName}}", "{{contact.fullName}}", "{{appointment.name}}", "{{appointment.startAt}}", "{{opportunity.id}}"].map((token) => <button key={token} className="rounded-md border border-[#dde3ec] bg-white px-2 py-1" onClick={() => navigator.clipboard?.writeText(token)}>{token}</button>)}
      </div>}
    </div>
  );
}

function SitePagePreview({ page, theme, publicMode = false, selectedSectionId = "", onSelectSection, onReorderSection }: { page: Omit<SitePage, "id"> | SitePage; theme: ThemeConfig; publicMode?: boolean; selectedSectionId?: string; onSelectSection?: (id: string) => void; onReorderSection?: (fromId: string, toId: string) => void }) {
  return (
    <div className={`${publicMode ? "" : "max-h-[760px] overflow-auto rounded-md border border-[#dde3ec]"} bg-[var(--theme-background)] text-[var(--theme-text)]`} style={themeStyle(theme)}>
      {page.sections.map((section) => <RenderSiteSection key={section.id} section={section} selected={selectedSectionId === section.id} editable={Boolean(onSelectSection)} onSelect={() => onSelectSection?.(section.id)} onDropSection={(fromId) => onReorderSection?.(fromId, section.id)} />)}
    </div>
  );
}

function RenderSiteSection({ section, selected = false, editable = false, onSelect, onDropSection }: { section: SitePage["sections"][number]; selected?: boolean; editable?: boolean; onSelect?: () => void; onDropSection?: (fromId: string) => void }) {
  const bg = section.background === "primary" ? "bg-[var(--theme-primary)] text-white" : section.background === "dark" ? "bg-[#16202a] text-white" : section.background === "light" ? "bg-[#f8fafc]" : "bg-white";
  const pad = section.padding === "compact" ? "py-8" : section.padding === "spacious" ? "py-20 md:py-28" : "py-12 md:py-16";
  const align = section.align === "center" ? "text-center items-center" : "text-left items-start";
  const muted = section.background === "primary" || section.background === "dark" ? "text-white/80" : "text-[var(--theme-muted)]";
  const content = (
    <div className={`flex flex-col ${align}`}>
      {section.eyebrow && <div className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--theme-accent)]">{section.eyebrow}</div>}
      <h2 className={`display-font font-black leading-tight ${section.type === "hero" ? "text-4xl md:text-6xl" : "text-3xl md:text-4xl"}`}>{section.headline}</h2>
      <p className={`mt-4 max-w-2xl whitespace-pre-line text-base leading-7 ${muted}`}>{section.body}</p>
      {section.buttonText && <a className="mt-7 inline-flex rounded-md bg-[var(--theme-primary)] px-5 py-3 text-sm font-black text-white" href={section.buttonUrl || "#"}>{section.buttonText}</a>}
    </div>
  );
  return (
    <section
      draggable={editable}
      onClick={(event) => { if (editable) { event.preventDefault(); onSelect?.(); } }}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", section.id)}
      onDragOver={(event) => { if (editable) event.preventDefault(); }}
      onDrop={(event) => { if (editable) { event.preventDefault(); onDropSection?.(event.dataTransfer.getData("text/plain")); } }}
      className={`${bg} relative px-6 ${pad} md:px-10 ${editable ? "cursor-pointer transition hover:outline hover:outline-2 hover:outline-[var(--theme-accent)]" : ""} ${selected ? "outline outline-4 outline-[var(--theme-primary)]" : ""}`}
    >
      {editable && <div className="absolute right-3 top-3 z-10 rounded-md bg-white/95 px-2 py-1 text-xs font-black text-[#16202a] shadow-sm">Drag / click to edit</div>}
      <div className="mx-auto max-w-6xl">
        {section.type === "split" ? <div className="grid gap-8 md:grid-cols-2 md:items-center">{content}<SiteImage url={section.imageUrl} /></div> : section.type === "image" ? <div className="space-y-6">{content}<SiteImage url={section.imageUrl} /></div> : section.type === "columns" ? <>{content}<div className="mt-8 grid gap-4 md:grid-cols-3">{(section.columns ?? []).map((column, index) => <div key={`${column.title}-${index}`} className="rounded-md border border-[#dde3ec] bg-white p-5 text-[#16202a] shadow-sm"><h3 className="font-black">{column.title}</h3><p className="mt-2 text-sm leading-6 text-[#64748b]">{column.body}</p></div>)}</div></> : <>{content}{(section.items ?? []).length > 0 && <div className="mt-8 grid gap-3 md:grid-cols-3">{(section.items ?? []).map((item) => <div key={item} className="rounded-md border border-[#dde3ec] bg-white p-4 font-bold text-[#16202a]">{item}</div>)}</div>}</>}
      </div>
    </section>
  );
}

function SiteImage({ url }: { url?: string }) {
  if (!url) return <div className="min-h-64 rounded-md border border-dashed border-[#cbd5e1] bg-[#f8fafc]" />;
  return <img src={url} alt="" className="max-h-[460px] w-full rounded-md object-cover shadow-sm" />;
}

function DiagramArrow({ vertical = false }: { vertical?: boolean }) {
  if (vertical) return <div className="my-2 flex h-8 flex-col items-center text-[#94a3b8]"><span className="h-7 w-px bg-[#cbd5e1]" /><span className="-mt-2 text-lg">⌄</span></div>;
  return <div className="flex items-center text-[#94a3b8]"><span className="h-px w-8 bg-[#cbd5e1]" /><span className="-ml-1 text-lg">›</span></div>;
}

function DiagramNode({
  label,
  type,
  value,
  filterKey = "",
  filterValue = "",
  configText = "",
  tone,
  kind,
  compact = false,
  canRemove = false,
  onChange,
  onRemove
}: {
  label: string;
  type: string;
  value?: string;
  filterKey?: string;
  filterValue?: string;
  configText?: string;
  tone: "blue" | "yellow" | "green" | "pink";
  kind: "trigger" | "action";
  compact?: boolean;
  canRemove?: boolean;
  onChange?: (patch: { type?: string; filterKey?: string; filterValue?: string; configText?: string }) => void;
  onRemove?: () => void;
}) {
  const tones = {
    blue: "border-[#bfdbfe] bg-[#eef5ff] text-[#174ea6]",
    yellow: "border-[#fde68a] bg-[#fff8df] text-[#8a6100]",
    green: "border-[#bbf7d0] bg-[#edf8f1] text-[#137333]",
    pink: "border-[#fbcfe8] bg-[#fff1f8] text-[#9d174d]"
  };
  const editable = Boolean(onChange);
  const labelText = kind === "trigger" ? automationTriggerOptions.find((item) => item.value === type)?.label ?? type : value ?? automationActionOptions.find((item) => item.value === type)?.label ?? type;
  return (
    <div className={`min-h-20 w-[360px] rounded-md border p-3 text-center shadow-sm ${tones[tone]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-wide opacity-75">{label}</div>
        {editable && canRemove && <button className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] font-black" onClick={onRemove}>Remove</button>}
      </div>
      {editable ? (
        <div className="space-y-2 text-left">
          <select className="w-full rounded-md border border-current/20 bg-white/90 p-2 text-xs font-bold text-[#16202a]" value={type} onChange={(event) => onChange?.({ type: event.target.value })}>
            {(kind === "trigger" ? automationTriggerOptions : automationActionOptions).map((option) => <option key={option.value} value={option.value}>{kind === "trigger" && "module" in option ? `${option.module} - ` : ""}{option.label}</option>)}
          </select>
          {kind === "trigger" && !compact && <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border border-current/20 bg-white/90 p-2 text-xs text-[#16202a]" placeholder="Filter field" value={filterKey} onChange={(event) => onChange?.({ filterKey: event.target.value })} />
            <input className="rounded-md border border-current/20 bg-white/90 p-2 text-xs text-[#16202a]" placeholder="Filter value" value={filterValue} onChange={(event) => onChange?.({ filterValue: event.target.value })} />
          </div>}
          {kind === "action" && !compact && <ActionConfigEditor action={{ id: "diagram-action", type, configText }} compact onChange={(nextConfig) => onChange?.({ configText: nextConfig })} />}
        </div>
      ) : (
        <>
          <div className="mt-1 text-sm font-black leading-snug">{labelText}</div>
          {filterKey && <div className="mt-2 rounded bg-white/70 px-2 py-1 text-xs font-bold">{filterKey} = {filterValue || "any"}</div>}
        </>
      )}
    </div>
  );
}

function ColorRail() {
  return (
    <div className="grid h-1.5 grid-cols-4">
      <span className="bg-[var(--theme-primary)]" />
      <span className="bg-[var(--theme-secondary)]" />
      <span className="bg-[var(--theme-accent)]" />
      <span className="bg-[var(--theme-danger)]" />
    </div>
  );
}

function ThemeSwatches({ theme }: { theme: ThemeConfig }) {
  return (
    <div className="flex gap-1.5">
      {[theme.primary, theme.secondary, theme.accent, theme.danger].map((color) => (
        <span key={color} className="h-5 w-8 rounded" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-md border border-[#cbd5e1] bg-white p-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-bold text-[#174ea6]" onClick={() => onChange(tags.filter((item) => item !== tag))}>
            {tag} x
          </button>
        ))}
        {tags.length === 0 && <span className="px-1 text-xs text-[#64748b]">No tags</span>}
      </div>
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded-md border border-[#cbd5e1] p-2 text-sm" placeholder="Add tag" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const tag = draft.trim();
            if (tag && !tags.includes(tag)) onChange([...tags, tag]);
            setDraft("");
          }
        }} />
        <button type="button" className="rounded-md border border-[#cbd5e1] px-3 text-sm font-bold" onClick={() => {
          const tag = draft.trim();
          if (tag && !tags.includes(tag)) onChange([...tags, tag]);
          setDraft("");
        }}>Add</button>
      </div>
    </div>
  );
}

function GroupedSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select className="rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      {customFieldTypes.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function CustomFieldInput({ field, onChange }: { field: ContactCustomField; onChange: (field: ContactCustomField) => void }) {
  const setValue = (value: string | string[] | boolean) => onChange({ ...field, value });
  if (field.type === "multiline") {
    return <textarea className="min-h-20 w-full rounded-md border border-[#cbd5e1] p-2 text-sm" value={String(field.value ?? "")} onChange={(event) => setValue(event.target.value)} />;
  }
  if (field.type === "textList" || field.type === "dropdownMultiple" || field.type === "checkbox") {
    const values = Array.isArray(field.value) ? field.value : [];
    const options = field.options?.length ? field.options : values;
    return (
      <div className="space-y-2">
        {(field.type === "checkbox" || field.type === "dropdownMultiple") && options.length > 0 ? options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.includes(option)} onChange={(event) => setValue(event.target.checked ? [...values, option] : values.filter((item) => item !== option))} /> {option}
          </label>
        )) : <input className="w-full rounded-md border border-[#cbd5e1] p-2 text-sm" value={values.join(", ")} onChange={(event) => setValue(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />}
      </div>
    );
  }
  if (field.type === "dropdownSingle" || field.type === "radio") {
    return field.type === "radio" ? (
      <div className="flex flex-wrap gap-3">
        {(field.options ?? []).map((option) => <label key={option} className="flex items-center gap-2 text-sm"><input type="radio" checked={field.value === option} onChange={() => setValue(option)} /> {option}</label>)}
      </div>
    ) : (
      <select className="w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={String(field.value ?? "")} onChange={(event) => setValue(event.target.value)}>
        <option value="">Select</option>
        {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  if (field.type === "file") return <input className="w-full rounded-md border border-[#cbd5e1] p-2 text-sm" type="file" onChange={(event) => setValue(event.target.files?.[0]?.name ?? "")} />;
  if (field.type === "signature") return <input className="w-full rounded-md border border-[#cbd5e1] p-2 text-sm" placeholder="Signature text / signer name" value={String(field.value ?? "")} onChange={(event) => setValue(event.target.value)} />;
  const inputType = field.type === "date" ? "date" : field.type === "number" || field.type === "currency" ? "number" : field.type === "phone" ? "tel" : "text";
  return <input className="w-full rounded-md border border-[#cbd5e1] p-2 text-sm" type={inputType} value={String(field.value ?? "")} onChange={(event) => setValue(event.target.value)} />;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#475569]">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-[#cbd5e1] bg-white">
        <input className="h-10 w-12 border-0 p-1" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input className="min-w-0 flex-1 border-0 px-2 text-sm outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function UnitField({ label, minutes, unit, onUnitChange, onMinutesChange }: { label: string; minutes: number; unit: "minutes" | "hours"; onUnitChange: (unit: "minutes" | "hours") => void; onMinutesChange: (minutes: number) => void }) {
  const displayValue = unit === "hours" ? minutes / 60 : minutes;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#475569]">{label}</span>
      <div className="grid grid-cols-[1fr_104px] overflow-hidden rounded-md border border-[#cbd5e1] bg-white">
        <input className="min-w-0 border-0 p-2 outline-none" type="number" min={unit === "hours" ? 0.25 : 1} step={unit === "hours" ? 0.25 : 1} value={String(displayValue)} onChange={(event) => onMinutesChange(Math.round(Number(event.target.value) * (unit === "hours" ? 60 : 1)))} />
        <select className="border-l border-[#cbd5e1] bg-[#f8fafc] p-2 outline-none" value={unit} onChange={(event) => {
          const nextUnit = event.target.value as "minutes" | "hours";
          onUnitChange(nextUnit);
        }}>
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
        </select>
      </div>
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#475569]">{label}</span>
      <select className="w-full rounded-md border border-[#cbd5e1] bg-white p-2 outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-blue-100" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function themeStyle(theme: ThemeConfig = defaultTheme): React.CSSProperties {
  return {
    "--theme-primary": theme.primary,
    "--theme-secondary": theme.secondary,
    "--theme-accent": theme.accent,
    "--theme-danger": theme.danger,
    "--theme-background": theme.background,
    "--theme-surface": theme.surface,
    "--theme-text": theme.text,
    "--theme-muted": theme.muted,
    "--display-font": `"${theme.displayFont}", Inter, ui-sans-serif, system-ui, sans-serif`,
    "--body-font": `"${theme.bodyFont}", Inter, ui-sans-serif, system-ui, sans-serif`,
    fontFamily: `"${theme.bodyFont}", Inter, ui-sans-serif, system-ui, sans-serif`
  } as React.CSSProperties;
}

function Field({ label, value, onChange, type = "text", error }: { label: string; value: string; onChange: (value: string) => void; type?: string; error?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#475569]">{label}</span>
      <input className={`w-full rounded-md border bg-white p-2 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 ${error ? "border-rose-300" : "border-[#cbd5e1]"}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <span className="mt-1 block text-xs font-semibold text-rose-700">{error}</span>}
    </label>
  );
}

createRoot(document.getElementById("root")!).render(<Router />);

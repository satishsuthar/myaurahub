import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar, Check, Clock, Copy, ExternalLink, Lock, LogOut, MapPin, Plus, Save, Settings, Trash2, Users, Workflow } from "lucide-react";
import "./index.css";
import { api, apiBase, AppointmentType, AutomationAction, AutomationRule, AvailabilityRule, AuthResponse, AuthUser, Booking, Contact, ContactActivity, ContactCustomField, ContactTask, Opportunity, Pipeline, Slot, ThemeConfig, UnavailabilityDate, clearAuth, getAuthUser, saveAuth, userId } from "./api";

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
const emptyPipeline = { name: "", description: "", stagesText: "New Lead\nQualified\nProposal\nWon" };
const emptyOpportunity = { title: "", value: 0, currency: "AUD", contactId: "", expectedCloseDate: "", source: "", notes: "" };
const automationTriggerOptions = [
  { value: "AppointmentBooked", label: "Appointment booked" },
  { value: "BookingCancelled", label: "Booking cancelled" },
  { value: "ContactCreated", label: "Contact created" },
  { value: "ContactUpdated", label: "Contact updated" },
  { value: "PageVisited", label: "Booking page visited" },
  { value: "OpportunityCreated", label: "Opportunity created" },
  { value: "OpportunityMoved", label: "Opportunity moved" },
  { value: "TaskCompleted", label: "Task completed" }
];
const automationActionOptions = [
  { value: "CreateTask", label: "Create task" },
  { value: "AddContactTag", label: "Add contact tag" },
  { value: "RemoveContactTag", label: "Remove contact tag" },
  { value: "SendEmail", label: "Send email" },
  { value: "InternalNotification", label: "Internal notification" },
  { value: "Webhook", label: "Webhook" }
];
const emptyAutomation = { name: "", description: "", triggerType: "AppointmentBooked", filterKey: "", filterValue: "", actions: [{ id: "action-1", type: "CreateTask", configText: "title=Follow up with contact\ndueInDays=1" }], isActive: true };
const customFieldTypes = [
  { group: "Text input", options: [["text", "Single line"], ["multiline", "Multiline"], ["textList", "Text box list"]] },
  { group: "Values", options: [["number", "Number"], ["phone", "Phone"], ["currency", "Currency"]] },
  { group: "Options", options: [["dropdownSingle", "Dropdown (single)"], ["dropdownMultiple", "Dropdown (multiple)"], ["radio", "Radio"], ["checkbox", "Checkbox"]] },
  { group: "Others", options: [["date", "Date picker"], ["file", "File upload"], ["signature", "Signature"]] }
];

function Router() {
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
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [pipelineForm, setPipelineForm] = useState(emptyPipeline);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [opportunityModalStageId, setOpportunityModalStageId] = useState<string | null>(null);
  const [automationForm, setAutomationForm] = useState(emptyAutomation);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
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
  const [activeTab, setActiveTab] = useState<"calendars" | "availability" | "bookings" | "schedulingSettings" | "contacts" | "opportunities" | "automations" | "settings" | "profile">("calendars");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [savingTheme, setSavingTheme] = useState(false);
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours">("minutes");
  const [noticeUnit, setNoticeUnit] = useState<"minutes" | "hours">("hours");

  if (!authUser) {
    return <AuthPage onAuthenticated={setAuthUser} />;
  }

  async function load() {
    const [appointmentData, bookingData, contactData, pipelineData, opportunityData, automationData, availabilityData, unavailableData, themeData] = await Promise.all([
      api<AppointmentType[]>("/api/calendar/appointment-types"),
      api<Booking[]>("/api/calendar/bookings"),
      api<Contact[]>("/api/contacts"),
      api<Pipeline[]>("/api/opportunities/pipelines"),
      api<Opportunity[]>("/api/opportunities"),
      api<AutomationRule[]>("/api/automations"),
      api<AvailabilityRule[]>("/api/calendar/availability/me"),
      api<UnavailabilityDate[]>("/api/calendar/unavailability"),
      api<ThemeConfig>("/api/workspace/theme")
    ]);
    setAppointments(appointmentData);
    setBookings(bookingData);
    setContacts(contactData);
    setPipelines(pipelineData);
    setOpportunities(opportunityData);
    setAutomations(automationData);
    setSelectedPipelineId((current) => current || pipelineData[0]?.id || "");
    setRules(availabilityData.map((rule) => ({ ...rule, startTime: rule.startTime.slice(0, 5), endTime: rule.endTime.slice(0, 5) })));
    setUnavailability(unavailableData);
    setTheme(themeData);
  }

  useEffect(() => {
    load().catch((error) => {
      if (error.message.includes("401") || error.message.toLowerCase().includes("login required")) {
        clearAuth();
        setAuthUser(null);
      } else {
        setMessage(error.message);
      }
    });
  }, [authUser]);

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

  async function openContact(contact: Contact) {
    setSelectedContactId(contact.id);
    setContactForm({ ...emptyContact, ...contact, customFields: contact.customFields ?? {}, tags: contact.tags ?? [] });
    const [tasks, activity] = await Promise.all([
      api<ContactTask[]>(`/api/contacts/${contact.id}/tasks`),
      api<ContactActivity[]>(`/api/contacts/${contact.id}/activity`)
    ]);
    setContactTasks(tasks);
    setContactActivity(activity);
    setActiveTab("contacts");
  }

  function newContact() {
    setSelectedContactId(null);
    setContactForm(emptyContact);
    setContactTasks([]);
    setContactActivity([]);
    setTaskForm(emptyTask);
    setCustomFieldDraft({ name: "", type: "text", value: "", options: "" });
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
    const stages = pipelineForm.stagesText.split("\n").map((name) => name.trim()).filter(Boolean).map((name, index) => ({ id: `stage-${index + 1}-${slugifyLocal(name)}`, name, order: index + 1 }));
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
      setPipelineForm({ name: pipeline.name, description: pipeline.description ?? "", stagesText: pipeline.stages.sort((a, b) => a.order - b.order).map((stage) => stage.name).join("\n") });
    } else {
      setEditingPipelineId(null);
      setPipelineForm(emptyPipeline);
    }
    setPipelineModalOpen(true);
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
    return Object.fromEntries(configText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [key, ...valueParts] = line.split("=");
      return [key.trim(), valueParts.join("=").trim()];
    }).filter(([key]) => key));
  }

  function serializeActionConfig(config: Record<string, string>) {
    return Object.entries(config ?? {}).map(([key, value]) => `${key}=${value}`).join("\n");
  }

  function addAutomationAction() {
    setAutomationForm({
      ...automationForm,
      actions: [...automationForm.actions, { id: `action-${Date.now()}`, type: "InternalNotification", configText: "message=New automation event" }]
    });
  }

  function updateAutomationAction(id: string, patch: Partial<(typeof automationForm.actions)[number]>) {
    setAutomationForm({ ...automationForm, actions: automationForm.actions.map((action) => action.id === id ? { ...action, ...patch } : action) });
  }

  function editAutomation(rule: AutomationRule) {
    const filterEntries = Object.entries(rule.trigger.filters ?? {});
    setEditingAutomationId(rule.id);
    setAutomationForm({
      name: rule.name,
      description: rule.description ?? "",
      triggerType: rule.trigger.type,
      filterKey: filterEntries[0]?.[0] ?? "",
      filterValue: filterEntries[0]?.[1] ?? "",
      actions: rule.actions.map((action) => ({ id: action.id, type: action.type, configText: serializeActionConfig(action.config) })),
      isActive: rule.isActive
    });
    setActiveTab("automations");
  }

  async function saveAutomation() {
    if (!automationForm.name.trim() || automationForm.actions.length === 0) {
      setMessageTone("error");
      setMessage("Automation name and at least one action are required.");
      return;
    }
    const actions: AutomationAction[] = automationForm.actions.map((action, index) => ({
      id: action.id || `action-${index + 1}`,
      type: action.type,
      config: parseActionConfig(action.configText)
    }));
    const filters = automationForm.filterKey.trim() ? { [automationForm.filterKey.trim()]: automationForm.filterValue.trim() } : {};
    try {
      const saved = await api<AutomationRule>(editingAutomationId ? `/api/automations/${editingAutomationId}` : "/api/automations", {
        method: editingAutomationId ? "PUT" : "POST",
        body: JSON.stringify({ name: automationForm.name, description: automationForm.description, trigger: { type: automationForm.triggerType, filters }, actions, isActive: automationForm.isActive })
      });
      setAutomations(editingAutomationId ? automations.map((item) => item.id === saved.id ? saved : item) : [saved, ...automations]);
      setAutomationForm(emptyAutomation);
      setEditingAutomationId(null);
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
    }
    setMessageTone("success");
    setMessage("Automation deleted.");
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
    setActiveTab("calendars");
  }

  function updateRule(index: number, patch: Partial<AvailabilityRule>) {
    setRules(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--theme-background)_0%,#f4f7ff_42%,#f7fbf8_100%)] text-[var(--theme-text)]" style={themeStyle(theme)}>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#dde3ec] bg-[#fbfcff] px-4 py-5 lg:block">
        <div className="mb-7 overflow-hidden rounded-md border border-[#e5e9f2] bg-white shadow-sm">
          <ColorRail />
          <div className="p-3">
          <div className="mb-3 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285f4]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbc05]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
          </div>
          <div className="display-font text-lg font800 font-bold">{authUser.workspaceName}</div>
          <div className="text-xs font-medium text-[#64748b]">/{authUser.workspaceSlug}</div>
          </div>
        </div>
        <nav className="space-y-1 text-sm font-medium">
          <NavItem icon={<Calendar size={17} />} label="Scheduling" active={["calendars", "availability", "bookings", "schedulingSettings"].includes(activeTab)} onClick={() => setActiveTab("calendars")} />
          <NavItem icon={<Users size={17} />} label="Contacts" active={activeTab === "contacts"} onClick={() => setActiveTab("contacts")} />
          <NavItem icon={<Clock size={17} />} label="Opportunities" active={activeTab === "opportunities"} onClick={() => setActiveTab("opportunities")} />
          <NavItem icon={<Workflow size={17} />} label="Automations" active={activeTab === "automations"} onClick={() => setActiveTab("automations")} />
        </nav>
        <nav className="absolute bottom-5 left-4 right-4 space-y-1 text-sm font-medium">
          <NavItem icon={<Settings size={17} />} label="App Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <NavItem icon={<Users size={17} />} label="My Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          <NavItem icon={<LogOut size={17} />} label="Logout" onClick={() => { clearAuth(); setAuthUser(null); }} />
        </nav>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-[#dde3ec] bg-white/95">
          <ColorRail />
          <div className="flex items-center justify-between px-5 py-3 lg:px-6">
            <div>
              <h1 className="display-font text-xl font-bold">{activeTab === "contacts" ? "Contacts" : activeTab === "opportunities" ? "Opportunities" : activeTab === "automations" ? "Automations" : activeTab === "settings" ? "App Settings" : activeTab === "profile" ? "My Profile" : "Scheduling"}</h1>
              <p className="text-xs font-medium text-[#64748b]">{activeTab === "contacts" ? "Contacts, custom fields, tasks, and activity timeline." : activeTab === "opportunities" ? "Pipelines, stages, deals, and revenue tracking." : activeTab === "automations" ? "Workflow rules that react to bookings, contacts, pages, tasks, and opportunities." : activeTab === "settings" ? "Workspace-wide branding and application settings." : activeTab === "profile" ? "Your login and workspace access details." : "Appointment types, availability, bookings, and scheduling settings."}</p>
            </div>
            <a className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-200" href={`/book/${authUser.workspaceSlug}/${appointments[0]?.slug ?? "discovery-call"}`}>
              <ExternalLink size={16} /> Open booking page
            </a>
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

          {activeTab === "calendars" && <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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

            </div>
            <div>
            <Panel title={editingId ? "Edit Appointment Type" : "Create Appointment Type"} icon={<Plus size={18} />}>
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
                {editingId && <button className="rounded-md border border-stone-300 px-4 py-2 text-sm" onClick={() => { setEditingId(null); setForm(defaultAppointment); }}>Cancel</button>}
              </div>
            </Panel>
            </div>
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

          {activeTab === "contacts" && <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <Panel title="Contacts" icon={<Users size={18} />}>
              <button className="mb-4 inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={newContact}>
                <Plus size={16} /> New contact
              </button>
              <div className="space-y-2">
                {contacts.length === 0 && <p className="text-sm text-stone-600">No contacts yet.</p>}
                {contacts.map((contact) => (
                  <button key={contact.id} className={`w-full rounded-md border p-3 text-left text-sm ${selectedContactId === contact.id ? "border-[var(--theme-primary)] bg-[#f5f9ff]" : "border-[#dde3ec] bg-white hover:bg-[#fbfcff]"}`} onClick={() => openContact(contact)}>
                    <div className="font-bold">{contact.firstName} {contact.lastName}</div>
                    <div className="text-xs text-[#64748b]">{contact.email}</div>
                    <div className="mt-1 text-xs text-[#64748b]">{contact.company || contact.phone || contact.source}</div>
                  </button>
                ))}
              </div>
            </Panel>

            <div className="space-y-5">
              <Panel title={selectedContactId ? "Contact Profile" : "Create Contact"} icon={<Users size={18} />}>
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
            </div>
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
                    {pipeline && <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold text-[#16202a] hover:bg-[#f8fafc]" onClick={() => openPipelineModal(pipeline)}>
                      <Settings size={16} /> Manage pipeline
                    </button>}
                    <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--theme-primary)] px-3 py-2 text-sm font-bold text-white" onClick={() => openPipelineModal()}>
                      <Plus size={16} /> New pipeline
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

            {pipelineModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 p-4">
              <div className="w-full max-w-xl rounded-md bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="display-font text-xl font-black text-[#16202a]">{editingPipelineId ? "Manage Pipeline" : "New Pipeline"}</div>
                    <p className="text-sm text-[#64748b]">Stages are listed one per line in board order.</p>
                  </div>
                  <button className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-bold" onClick={() => setPipelineModalOpen(false)}>Close</button>
                </div>
                <div className="space-y-3">
                  <Field label="Pipeline name" value={pipelineForm.name} onChange={(value) => setPipelineForm({ ...pipelineForm, name: value })} />
                  <textarea className="min-h-16 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder="Description" value={pipelineForm.description} onChange={(event) => setPipelineForm({ ...pipelineForm, description: event.target.value })} />
                  <textarea className="min-h-36 w-full rounded-md border border-[#cbd5e1] p-3 text-sm" placeholder={"New Lead\nQualified\nProposal\nWon"} value={pipelineForm.stagesText} onChange={(event) => setPipelineForm({ ...pipelineForm, stagesText: event.target.value })} />
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {editingPipelineId && <button className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700" onClick={() => {
                    const pipeline = pipelines.find((item) => item.id === editingPipelineId);
                    if (pipeline) deletePipeline(pipeline);
                  }}>
                    <Trash2 size={16} /> Delete
                  </button>}
                  <div className="flex gap-2 sm:ml-auto">
                    <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => setPipelineModalOpen(false)}>Cancel</button>
                    <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={savePipeline}>
                      <Save size={16} /> Save pipeline
                    </button>
                  </div>
                </div>
              </div>
            </div>}

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

          {activeTab === "automations" && <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title={editingAutomationId ? "Edit Automation" : "Create Automation"} icon={<Workflow size={18} />}>
              <AutomationDiagram
                title={automationForm.name || "New automation"}
                triggerLabel={automationTriggerOptions.find((item) => item.value === automationForm.triggerType)?.label ?? automationForm.triggerType}
                filterLabel={automationForm.filterKey ? `${automationForm.filterKey} = ${automationForm.filterValue || "any"}` : ""}
                actions={automationForm.actions.map((action) => automationActionOptions.find((item) => item.value === action.type)?.label ?? action.type)}
                isActive={automationForm.isActive}
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
                <div className="mb-3 text-sm font-black text-[#16202a]">When this happens</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-bold text-[#334155]">Trigger
                    <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={automationForm.triggerType} onChange={(event) => setAutomationForm({ ...automationForm, triggerType: event.target.value })}>
                      {automationTriggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <Field label="Filter field" value={automationForm.filterKey} onChange={(value) => setAutomationForm({ ...automationForm, filterKey: value })} />
                  <Field label="Filter value" value={automationForm.filterValue} onChange={(value) => setAutomationForm({ ...automationForm, filterValue: value })} />
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
                      {automationForm.actions.length > 1 && <button className="rounded-md border border-rose-200 p-2 text-rose-700" onClick={() => setAutomationForm({ ...automationForm, actions: automationForm.actions.filter((item) => item.id !== action.id) })}><Trash2 size={15} /></button>}
                    </div>
                    <label className="text-sm font-bold text-[#334155]">Action type
                      <select className="mt-1 w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm" value={action.type} onChange={(event) => updateAutomationAction(action.id, { type: event.target.value })}>
                        {automationActionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <textarea className="mt-3 min-h-20 w-full rounded-md border border-[#cbd5e1] bg-white p-3 font-mono text-xs" placeholder={"key=value\nanotherKey=value"} value={action.configText} onChange={(event) => updateAutomationAction(action.id, { configText: event.target.value })} />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-white" onClick={saveAutomation}><Save size={16} /> Save automation</button>
                {editingAutomationId && <button className="rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold" onClick={() => { setEditingAutomationId(null); setAutomationForm(emptyAutomation); }}>Cancel</button>}
              </div>
            </Panel>

            <Panel title="Automation Rules" icon={<Workflow size={18} />}>
              <div className="space-y-3">
                {automations.length === 0 && <p className="text-sm text-stone-600">No automations yet.</p>}
                {automations.map((rule) => (
                  <div key={rule.id} className="rounded-md border border-[#dde3ec] bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-[#16202a]">{rule.name}</div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-black ${rule.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.isActive ? "Active" : "Inactive"}</span>
                        </div>
                        {rule.description && <p className="mt-1 text-sm text-[#64748b]">{rule.description}</p>}
                        <AutomationDiagram
                          title={rule.name}
                          triggerLabel={automationTriggerOptions.find((item) => item.value === rule.trigger.type)?.label ?? rule.trigger.type}
                          filterLabel={Object.entries(rule.trigger.filters ?? {}).map(([key, value]) => `${key} = ${value}`).join(", ")}
                          actions={rule.actions.map((action) => automationActionOptions.find((item) => item.value === action.type)?.label ?? action.type)}
                          isActive={rule.isActive}
                          compact
                        />
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-md bg-[#eef5ff] px-2 py-1 text-[#2563eb]">When {automationTriggerOptions.find((item) => item.value === rule.trigger.type)?.label ?? rule.trigger.type}</span>
                          {rule.actions.map((action) => <span key={action.id} className="rounded-md bg-[#fff8df] px-2 py-1 text-[#8a6100]">Then {automationActionOptions.find((item) => item.value === action.type)?.label ?? action.type}</span>)}
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
            </Panel>
          </section>}

          {activeTab === "settings" && <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Application Settings" icon={<Settings size={18} />}>
              <div className="space-y-2 text-sm text-stone-600">
                <p>Workspace: {authUser.workspaceName}</p>
                <p>Workspace slug: /{authUser.workspaceSlug}</p>
                <p>Branding, fonts, and global app appearance apply across modules.</p>
              </div>
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

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`flex w-full items-center gap-2 rounded-md border-l-4 px-3 py-2 text-left ${active ? "border-[#4285f4] bg-[#eaf2ff] text-[#174ea6]" : "border-transparent text-[#64748b] hover:border-[#fbbc05] hover:bg-[#fff8df]"}`} onClick={onClick}>{icon}{label}</button>;
}

function ModuleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`rounded-md px-3 py-2 text-sm font-bold ${active ? "bg-[var(--theme-primary)] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`} onClick={onClick}>
      {label}
    </button>
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

function AutomationDiagram({ title, triggerLabel, filterLabel, actions, isActive, compact = false }: { title: string; triggerLabel: string; filterLabel?: string; actions: string[]; isActive: boolean; compact?: boolean }) {
  const visibleActions = actions.length ? actions : ["No action selected"];
  return (
    <div className={`${compact ? "mt-3 p-3" : "mb-5 p-4"} overflow-x-auto rounded-md border border-[#dde3ec] bg-[linear-gradient(135deg,#f8fbff,#fffdf4_52%,#f7fbf8)]`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#16202a]">{compact ? "Flow" : title}</div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isActive ? "Active" : "Inactive"}</span>
      </div>
      <div className="flex min-w-max items-center gap-3">
        <DiagramNode label="Trigger" value={triggerLabel} tone="blue" />
        {filterLabel && <>
          <DiagramArrow />
          <DiagramNode label="Filter" value={filterLabel} tone="yellow" />
        </>}
        {visibleActions.map((action, index) => (
          <React.Fragment key={`${action}-${index}`}>
            <DiagramArrow />
            <DiagramNode label={`Action ${index + 1}`} value={action} tone={index % 2 === 0 ? "green" : "pink"} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function DiagramArrow() {
  return <div className="flex items-center text-[#94a3b8]"><span className="h-px w-8 bg-[#cbd5e1]" /><span className="-ml-1 text-lg">›</span></div>;
}

function DiagramNode({ label, value, tone }: { label: string; value: string; tone: "blue" | "yellow" | "green" | "pink" }) {
  const tones = {
    blue: "border-[#bfdbfe] bg-[#eef5ff] text-[#174ea6]",
    yellow: "border-[#fde68a] bg-[#fff8df] text-[#8a6100]",
    green: "border-[#bbf7d0] bg-[#edf8f1] text-[#137333]",
    pink: "border-[#fbcfe8] bg-[#fff1f8] text-[#9d174d]"
  };
  return (
    <div className={`min-h-20 w-44 rounded-md border p-3 shadow-sm ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-1 text-sm font-black leading-snug">{value}</div>
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

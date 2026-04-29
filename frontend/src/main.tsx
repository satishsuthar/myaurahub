import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar, Check, Clock, Copy, ExternalLink, Lock, LogOut, MapPin, Plus, Save, Settings, Trash2, Users } from "lucide-react";
import "./index.css";
import { api, apiBase, AppointmentType, AvailabilityRule, AuthResponse, AuthUser, Booking, Slot, UnavailabilityDate, clearAuth, getAuthUser, saveAuth, userId } from "./api";

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
  timezone: "Australia/Sydney"
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Router() {
  return window.location.pathname.startsWith("/book/") ? <PublicBookingPage /> : <AdminApp />;
}

function AdminApp() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityDate[]>([]);
  const [form, setForm] = useState(defaultAppointment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calendars" | "availability" | "bookings" | "settings">("calendars");
  const [message, setMessage] = useState("");

  if (!authUser) {
    return <AuthPage onAuthenticated={setAuthUser} />;
  }

  async function load() {
    const [appointmentData, bookingData, availabilityData, unavailableData] = await Promise.all([
      api<AppointmentType[]>("/api/calendar/appointment-types"),
      api<Booking[]>("/api/calendar/bookings"),
      api<AvailabilityRule[]>("/api/calendar/availability/me"),
      api<UnavailabilityDate[]>("/api/calendar/unavailability")
    ]);
    setAppointments(appointmentData);
    setBookings(bookingData);
    setRules(availabilityData.map((rule) => ({ ...rule, startTime: rule.startTime.slice(0, 5), endTime: rule.endTime.slice(0, 5) })));
    setUnavailability(unavailableData);
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
    await api<AppointmentType>(editingId ? `/api/calendar/appointment-types/${editingId}` : "/api/calendar/appointment-types", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(form)
    });
    setMessage(editingId ? "Appointment type updated. Customer calendar will use the new settings." : "Appointment type created.");
    setEditingId(null);
    setForm(defaultAppointment);
    await load();
  }

  async function saveAvailability() {
    await api(`/api/calendar/users/${userId}/availability`, {
      method: "PUT",
      body: JSON.stringify({ timezone: "Australia/Sydney", rules })
    });
    setMessage("Availability saved.");
    await load();
  }

  async function saveUnavailability() {
    await api("/api/calendar/unavailability", {
      method: "PUT",
      body: JSON.stringify({ dates: unavailability })
    });
    setMessage("Unavailable dates saved. Customer calendar will hide those dates.");
    await load();
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
      timezone: item.timezone
    });
    setActiveTab("calendars");
  }

  function updateRule(index: number, patch: Partial<AvailabilityRule>) {
    setRules(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <div className="text-lg font-semibold">{authUser.workspaceName}</div>
          <div className="text-sm text-stone-500">/{authUser.workspaceSlug}</div>
        </div>
        <nav className="space-y-1 text-sm font-medium">
          <NavItem icon={<Calendar size={17} />} label="Calendars" active={activeTab === "calendars"} onClick={() => setActiveTab("calendars")} />
          <NavItem icon={<Clock size={17} />} label="Availability" active={activeTab === "availability"} onClick={() => setActiveTab("availability")} />
          <NavItem icon={<Users size={17} />} label="Bookings" active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} />
          <NavItem icon={<Settings size={17} />} label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
          <NavItem icon={<LogOut size={17} />} label="Logout" onClick={() => { clearAuth(); setAuthUser(null); }} />
        </nav>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-stone-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-semibold">Calendar Booking</h1>
              <p className="text-sm text-stone-500">Appointment types, availability, buffers, notices, and bookings.</p>
            </div>
            <a className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" href={`/book/${authUser.workspaceSlug}/${appointments[0]?.slug ?? "discovery-call"}`}>
              <ExternalLink size={16} /> Open booking page
            </a>
          </div>
        </header>

        {message && <div className="mx-5 mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 lg:mx-8">{message}</div>}

        <div className="px-5 py-5 lg:px-8">
          {activeTab === "calendars" && <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
            <Panel title="Appointment Types" icon={<Calendar size={18} />}>
              <div className="overflow-hidden rounded-md border border-stone-200">
                <table className="w-full border-collapse bg-white text-sm">
                  <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Interval</th>
                      <th className="px-4 py-3">Buffers</th>
                      <th className="px-4 py-3">Link</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((item) => (
                      <tr key={item.id} className="border-t border-stone-200">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3">{item.durationMinutes} min</td>
                        <td className="px-4 py-3">{item.serviceIntervalMinutes ?? 15} min</td>
                        <td className="px-4 py-3">{item.bufferBeforeMinutes}/{item.bufferAfterMinutes} min</td>
                        <td className="px-4 py-3">
                          <a className="inline-flex items-center gap-1 text-moss hover:underline" href={`/book/${authUser.workspaceSlug}/${item.slug}`}>
                            <Copy size={14} /> {item.slug}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-mint px-2 py-1 text-xs font-semibold">{item.isActive ? "Active" : "Inactive"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="rounded-md border border-stone-300 px-3 py-1 text-xs font-semibold" onClick={() => editAppointment(item)}>Edit</button>
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
                <Field label="Duration minutes" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} />
                <Field label="Service interval minutes" type="number" value={String(form.serviceIntervalMinutes)} onChange={(value) => setForm({ ...form, serviceIntervalMinutes: Number(value) })} />
                <Field label="Buffer before minutes" type="number" value={String(form.bufferBeforeMinutes)} onChange={(value) => setForm({ ...form, bufferBeforeMinutes: Number(value) })} />
                <Field label="Buffer after minutes" type="number" value={String(form.bufferAfterMinutes)} onChange={(value) => setForm({ ...form, bufferAfterMinutes: Number(value) })} />
                <Field label="Minimum notice minutes" type="number" value={String(form.minimumNoticeMinutes)} onChange={(value) => setForm({ ...form, minimumNoticeMinutes: Number(value) })} />
                <Field label="Maximum window days" type="number" value={String(form.maximumBookingWindowDays)} onChange={(value) => setForm({ ...form, maximumBookingWindowDays: Number(value) })} />
              </div>
              <textarea className="mt-4 min-h-24 w-full rounded-md border border-stone-300 bg-white p-3 text-sm" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <div className="mt-4 flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white" onClick={saveAppointment}>
                  <Save size={16} /> {editingId ? "Update appointment type" : "Save appointment type"}
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
                  <div key={`${rule.dayOfWeek}-${index}`} className="grid grid-cols-[1fr_92px_92px_38px] gap-2">
                    <select className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: event.target.value })}>
                      {weekdays.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} />
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} />
                    <button className="rounded-md border border-stone-300 p-2" onClick={() => setRules(rules.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm" onClick={() => setRules([...rules, { dayOfWeek: "Monday", startTime: "09:00", endTime: "17:00" }])}>Add block</button>
                <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={saveAvailability}>Save</button>
              </div>
            </Panel>
            <Panel title="Fixed Date Unavailability & Holidays" icon={<Calendar size={18} />}>
              <div className="space-y-3">
                {unavailability.map((item, index) => (
                  <div key={`${item.date}-${index}`} className="grid grid-cols-[150px_1fr_38px] gap-2">
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" type="date" value={item.date} onChange={(event) => setUnavailability(unavailability.map((row, i) => i === index ? { ...row, date: event.target.value } : row))} />
                    <input className="rounded-md border border-stone-300 bg-white p-2 text-sm" placeholder="Reason" value={item.reason ?? ""} onChange={(event) => setUnavailability(unavailability.map((row, i) => i === index ? { ...row, reason: event.target.value } : row))} />
                    <button className="rounded-md border border-stone-300 p-2" onClick={() => setUnavailability(unavailability.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                  </div>
                ))}
                {unavailability.length === 0 && <p className="text-sm text-stone-600">No unavailable dates set.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm" onClick={() => setUnavailability([...unavailability, { date: toDateKey(new Date()), reason: "Holiday" }])}>Add date</button>
                <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={saveUnavailability}>Save unavailable dates</button>
              </div>
            </Panel>
          </section>}

          {activeTab === "bookings" && <section className="max-w-3xl">
            <Panel title="Bookings" icon={<Users size={18} />}>
              <div className="space-y-3">
                {bookings.length === 0 && <p className="text-sm text-stone-600">No bookings yet.</p>}
                {bookings.map((booking) => (
                  <div key={booking.id} className="rounded-md border border-stone-200 bg-white p-3 text-sm">
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

          {activeTab === "settings" && <section className="max-w-3xl">
            <Panel title="Settings" icon={<Settings size={18} />}>
              <div className="space-y-2 text-sm text-stone-600">
                <p>Workspace: {authUser.workspaceName}</p>
                <p>Timezone: Australia/Sydney</p>
                <p>Calendar mode: Personal calendar</p>
                <p>Public booking URL: <a className="text-moss underline" href={`/book/${authUser.workspaceSlug}/${appointments[0]?.slug ?? "discovery-call"}`}>/book/{authUser.workspaceSlug}/{appointments[0]?.slug ?? "discovery-call"}</a></p>
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f4] px-4 text-ink">
      <section className="w-full max-w-md rounded-md border border-stone-200 bg-white p-7 shadow-sm">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">
          <Lock size={20} />
        </div>
        <h1 className="text-2xl font-semibold">{mode === "signup" ? "Create your booking workspace" : "Login to your workspace"}</h1>
        <p className="mt-2 text-sm text-stone-600">White-label calendar booking for coaches, consultants, clinics, and personal brands.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" && <Field label="Business / workspace name" value={workspaceName} onChange={setWorkspaceName} />}
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">
            {mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
        <button className="mt-4 text-sm font-semibold text-moss" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "Already have an account? Login" : "Need an account? Sign up"}
        </button>
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
    fetch(`${apiBase}/api/public/booking/${workspaceSlug}/${appointmentSlug}?t=${Date.now()}`, { cache: "no-store" })
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
  }

  if (confirmed && selectedSlot && metadata) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10 text-[#1f1f1f]">
        <section className="w-full max-w-xl rounded-lg border border-[#dadada] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f7ee] text-[#006b3f]">
            <Check size={24} />
          </div>
          <h1 className="text-2xl font-semibold">You are booked</h1>
          <p className="mt-2 text-[#666]">{metadata.appointmentTypeName} with {metadata.workspaceName}</p>
          <div className="mt-6 rounded-md border border-[#dadada] bg-[#fafafa] p-4 text-sm">
            {new Date(selectedSlot.displayStart).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
          </div>
          <a className="mt-6 inline-flex rounded-md border border-[#006bff] px-4 py-2 text-sm font-semibold text-[#006bff]" href={`/book/${workspaceSlug}/${appointmentSlug}`}>
            Book another time
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-5 text-[#1f1f1f] md:py-10">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-[#dadada] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.08)] lg:grid-cols-[310px_1fr_290px]">
        <aside className="border-b border-[#e4e4e4] p-6 lg:border-b-0 lg:border-r">
          <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-full bg-[#1f1f1f] text-sm font-semibold text-white">
            {(metadata?.workspaceName ?? "A").slice(0, 1)}
          </div>
          <div className="mb-2 text-sm font-semibold text-[#6f6f6f]">{metadata?.workspaceName ?? "Loading"}</div>
          <h1 className="text-2xl font-bold leading-tight">{metadata?.appointmentTypeName ?? "Loading..."}</h1>
          <p className="mt-4 text-sm leading-6 text-[#5f5f5f]">{metadata?.description}</p>
          <div className="mt-7 space-y-4 text-sm font-medium text-[#5f5f5f]">
            <div className="flex items-center gap-3"><Clock size={18} /> {metadata?.durationMinutes ?? 30} min</div>
            <div className="flex items-center gap-3"><MapPin size={18} /> {metadata?.locationValue ?? "Online meeting"}</div>
            <div className="flex items-center gap-3"><Calendar size={18} /> Australia/Sydney</div>
          </div>
        </aside>

        <section className="border-b border-[#e4e4e4] p-6 lg:border-b-0">
          <h2 className="mb-6 text-xl font-bold">Select a Date & Time</h2>
          <div className="mb-6 flex items-center justify-between">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#006bff] hover:bg-[#eef5ff]" onClick={() => { setVisibleMonth(addMonths(visibleMonth, -1)); setSelectedSlot(null); }}>
              {"<"}
            </button>
            <div className="text-base font-bold">
              {visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#006bff] hover:bg-[#eef5ff]" onClick={() => { setVisibleMonth(addMonths(visibleMonth, 1)); setSelectedSlot(null); }}>
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
                    hasSlots && !isSelected ? "text-[#006bff] hover:bg-[#eef5ff]" : "",
                    isSelected ? "bg-[#006bff] text-white" : "",
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

          <div className="mt-8">
            <div className="mb-2 text-sm font-bold">Time zone</div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dadada] px-3 py-2 text-sm text-[#4f4f4f]">
              <MapPin size={15} /> Australia/Sydney
            </div>
          </div>
        </section>

        <aside className="p-6">
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
                    className="w-full rounded-md border border-[#006bff] bg-white px-4 py-3 text-center text-sm font-bold text-[#006bff] hover:border-[#0051c7] hover:bg-[#f4f9ff]"
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
              <button className="mb-4 text-sm font-bold text-[#006bff]" onClick={() => setSelectedSlot(null)}>Back to times</button>
              <h3 className="text-base font-bold">Enter Details</h3>
              <div className="mt-3 rounded-md bg-[#f7f7f5] p-3 text-sm text-[#555]">
                {new Date(selectedSlot.displayStart).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
              <div className="mt-4 space-y-3">
                <Field label="First name" value={customer.firstName} onChange={(value) => setCustomer({ ...customer, firstName: value })} />
                <Field label="Last name" value={customer.lastName} onChange={(value) => setCustomer({ ...customer, lastName: value })} />
                <Field label="Email" value={customer.email} onChange={(value) => setCustomer({ ...customer, email: value })} />
                <Field label="Phone" value={customer.phone} onChange={(value) => setCustomer({ ...customer, phone: value })} />
              </div>
              {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
              <button
                className="mt-5 w-full rounded-md bg-[#006bff] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
                disabled={!customer.firstName || !customer.email}
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

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left ${active ? "bg-mint text-ink" : "text-stone-600 hover:bg-stone-50"}`} onClick={onClick}>{icon}{label}</button>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">{icon}{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-700">{label}</span>
      <input className="w-full rounded-md border border-stone-300 bg-white p-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

createRoot(document.getElementById("root")!).render(<Router />);

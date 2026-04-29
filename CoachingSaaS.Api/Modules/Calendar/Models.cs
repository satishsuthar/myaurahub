namespace CoachingSaaS.Api.Modules.Calendar;

public enum WorkspaceRole { Owner, Admin, Member }
public enum AppointmentLocationType { Online, Phone, InPerson, Custom }
public enum CalendarMode { Personal, RoundRobin, Collective }
public enum BookingStatus { Confirmed, Cancelled, Completed, NoShow }
public enum ContactSource { CalendarBooking }

public sealed class Workspace
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Timezone { get; set; } = "Australia/Sydney";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class AppUser
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public WorkspaceRole Role { get; set; }
    public string Timezone { get; set; } = "Australia/Sydney";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class AppointmentType
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid AssignedUserId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string Slug { get; set; } = "";
    public int DurationMinutes { get; set; }
    public AppointmentLocationType LocationType { get; set; }
    public string? LocationValue { get; set; }
    public CalendarMode CalendarMode { get; set; } = CalendarMode.Personal;
    public int BufferBeforeMinutes { get; set; }
    public int BufferAfterMinutes { get; set; }
    public int MinimumNoticeMinutes { get; set; }
    public int MaximumBookingWindowDays { get; set; } = 30;
    public string Timezone { get; set; } = "Australia/Sydney";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? ArchivedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class UserAvailabilityRule
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid UserId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Timezone { get; set; } = "Australia/Sydney";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class Booking
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid AppointmentTypeId { get; set; }
    public Guid UserId { get; set; }
    public Guid ContactId { get; set; }
    public BookingStatus Status { get; set; }
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public DateTimeOffset BlockedStartUtc { get; set; }
    public DateTimeOffset BlockedEndUtc { get; set; }
    public int BufferBeforeMinutes { get; set; }
    public int BufferAfterMinutes { get; set; }
    public string CustomerTimezone { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class Contact
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string FirstName { get; set; } = "";
    public string? LastName { get; set; }
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string? Phone { get; set; }
    public string? Timezone { get; set; }
    public ContactSource Source { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

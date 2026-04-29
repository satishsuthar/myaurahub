namespace CoachingSaaS.Api.Modules.Calendar;

public sealed record AppointmentTypeRequest(
    string Name,
    string? Description,
    Guid AssignedUserId,
    string Slug,
    int DurationMinutes,
    AppointmentLocationType LocationType,
    string? LocationValue,
    int BufferBeforeMinutes,
    int BufferAfterMinutes,
    int MinimumNoticeMinutes,
    int MaximumBookingWindowDays,
    string Timezone);

public sealed record AvailabilityRuleRequest(DayOfWeek DayOfWeek, string StartTime, string EndTime);
public sealed record ReplaceAvailabilityRequest(string Timezone, IReadOnlyList<AvailabilityRuleRequest> Rules);
public sealed record PublicBookingRequest(
    DateTimeOffset StartUtc,
    string Timezone,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? Notes);

public sealed record CancelBookingRequest(string? Reason);
public sealed record SlotDto(DateTimeOffset StartUtc, DateTimeOffset EndUtc, string DisplayStart);
public sealed record PublicBookingMetadata(
    string WorkspaceName,
    string AppointmentTypeName,
    string? Description,
    int DurationMinutes,
    AppointmentLocationType LocationType,
    string? LocationValue,
    string Timezone);

public sealed record BookingResult(Guid BookingId, BookingStatus Status, DateTimeOffset StartUtc, DateTimeOffset EndUtc);

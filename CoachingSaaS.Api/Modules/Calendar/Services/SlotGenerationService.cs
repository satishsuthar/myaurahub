using Microsoft.EntityFrameworkCore;

namespace CoachingSaaS.Api.Modules.Calendar.Services;

public sealed class SlotGenerationService(AppDbContext db)
{
    private static readonly TimeSpan SlotStep = TimeSpan.FromMinutes(15);

    public async Task<IReadOnlyList<SlotDto>> GenerateAsync(
        AppointmentType appointmentType,
        DateOnly from,
        DateOnly to,
        string displayTimezone,
        CancellationToken cancellationToken)
    {
        if (!appointmentType.IsActive || appointmentType.ArchivedAtUtc is not null)
        {
            return [];
        }

        var now = DateTimeOffset.UtcNow;
        var minBookable = now.AddMinutes(appointmentType.MinimumNoticeMinutes);
        var maxBookable = now.AddDays(appointmentType.MaximumBookingWindowDays);
        var requestedStart = TimeZoneResolver.LocalToUtc(from, TimeOnly.MinValue, appointmentType.Timezone);
        var requestedEnd = TimeZoneResolver.LocalToUtc(to.AddDays(1), TimeOnly.MinValue, appointmentType.Timezone);
        var rangeStart = requestedStart > minBookable ? requestedStart : minBookable;
        var rangeEnd = requestedEnd < maxBookable ? requestedEnd : maxBookable;

        if (rangeEnd <= rangeStart)
        {
            return [];
        }

        var rules = await db.UserAvailabilityRules
            .AsNoTracking()
            .Where(x => x.WorkspaceId == appointmentType.WorkspaceId && x.UserId == appointmentType.AssignedUserId)
            .ToListAsync(cancellationToken);

        var bookings = await db.Bookings
            .AsNoTracking()
            .Where(x =>
                x.WorkspaceId == appointmentType.WorkspaceId &&
                x.UserId == appointmentType.AssignedUserId &&
                x.Status == BookingStatus.Confirmed &&
                x.BlockedStartUtc < rangeEnd &&
                rangeStart < x.BlockedEndUtc)
            .ToListAsync(cancellationToken);

        var slots = new List<SlotDto>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            foreach (var rule in rules.Where(x => x.DayOfWeek == date.DayOfWeek).OrderBy(x => x.StartTime))
            {
                var availabilityStart = TimeZoneResolver.LocalToUtc(date, rule.StartTime, rule.Timezone);
                var availabilityEnd = TimeZoneResolver.LocalToUtc(date, rule.EndTime, rule.Timezone);
                for (var slotStart = availabilityStart; slotStart.AddMinutes(appointmentType.DurationMinutes) <= availabilityEnd; slotStart = slotStart.Add(SlotStep))
                {
                    var slotEnd = slotStart.AddMinutes(appointmentType.DurationMinutes);
                    var blockedStart = slotStart.AddMinutes(-appointmentType.BufferBeforeMinutes);
                    var blockedEnd = slotEnd.AddMinutes(appointmentType.BufferAfterMinutes);

                    if (slotStart < rangeStart || slotStart > rangeEnd)
                    {
                        continue;
                    }

                    if (bookings.Any(x => blockedStart < x.BlockedEndUtc && x.BlockedStartUtc < blockedEnd))
                    {
                        continue;
                    }

                    slots.Add(new SlotDto(slotStart, slotEnd, TimeZoneResolver.UtcToLocalIso(slotStart, displayTimezone)));
                }
            }
        }

        return slots;
    }

    public async Task<bool> IsSlotValidAsync(AppointmentType appointmentType, DateTimeOffset startUtc, CancellationToken cancellationToken)
    {
        var localStart = TimeZoneInfo.ConvertTime(startUtc, TimeZoneResolver.Find(appointmentType.Timezone));
        var date = DateOnly.FromDateTime(localStart.Date);
        var slots = await GenerateAsync(appointmentType, date, date, appointmentType.Timezone, cancellationToken);
        return slots.Any(x => x.StartUtc == startUtc);
    }
}

using CoachingSaaS.Api.Modules.Calendar.Services;
using CoachingSaaS.Api.Modules.Common;
using Microsoft.EntityFrameworkCore;

namespace CoachingSaaS.Api.Modules.Calendar.Endpoints;

public static class CalendarEndpoints
{
    public static IEndpointRouteBuilder MapCalendarEndpoints(this IEndpointRouteBuilder app)
    {
        var business = app.MapGroup("/api/calendar");
        business.MapGet("/appointment-types", GetAppointmentTypes);
        business.MapGet("/appointment-types/{id:guid}", GetAppointmentType);
        business.MapPost("/appointment-types", CreateAppointmentType);
        business.MapPut("/appointment-types/{id:guid}", UpdateAppointmentType);
        business.MapPost("/appointment-types/{id:guid}/archive", ArchiveAppointmentType);
        business.MapPost("/appointment-types/{id:guid}/activate", SetAppointmentTypeActive);
        business.MapPost("/appointment-types/{id:guid}/deactivate", SetAppointmentTypeInactive);
        business.MapGet("/availability/me", GetMyAvailability);
        business.MapGet("/users/{userId:guid}/availability", GetAvailability);
        business.MapPut("/users/{userId:guid}/availability", ReplaceAvailability);
        business.MapGet("/bookings", GetBookings);
        business.MapGet("/bookings/{id:guid}", GetBooking);
        business.MapPost("/bookings/{id:guid}/cancel", CancelBooking);
        business.MapGet("/contacts", GetContacts);
        business.MapGet("/contacts/{id:guid}", GetContact);

        var publicBooking = app.MapGroup("/api/public/booking");
        publicBooking.MapGet("/{workspaceSlug}/{appointmentTypeSlug}", GetPublicMetadata);
        publicBooking.MapGet("/{workspaceSlug}/{appointmentTypeSlug}/slots", GetPublicSlots);
        publicBooking.MapPost("/{workspaceSlug}/{appointmentTypeSlug}", CreatePublicBooking);

        return app;
    }

    private static async Task<IResult> GetAppointmentTypes(AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var items = await db.AppointmentTypes.AsNoTracking()
            .Where(x => x.WorkspaceId == context.WorkspaceId)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        return Results.Ok(items);
    }

    private static async Task<IResult> GetAppointmentType(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var item = await db.AppointmentTypes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    private static async Task<IResult> CreateAppointmentType(AppointmentTypeRequest request, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var validation = await ValidateAppointmentTypeAsync(request, db, context.WorkspaceId, null, ct);
        if (validation is not null) return validation;

        var item = new AppointmentType
        {
            Id = Guid.NewGuid(),
            WorkspaceId = context.WorkspaceId,
            AssignedUserId = request.AssignedUserId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Slug = NormalizeSlug(request.Slug),
            DurationMinutes = request.DurationMinutes,
            LocationType = request.LocationType,
            LocationValue = request.LocationValue?.Trim(),
            BufferBeforeMinutes = request.BufferBeforeMinutes,
            BufferAfterMinutes = request.BufferAfterMinutes,
            MinimumNoticeMinutes = request.MinimumNoticeMinutes,
            MaximumBookingWindowDays = request.MaximumBookingWindowDays,
            Timezone = request.Timezone,
            CalendarMode = CalendarMode.Personal,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        db.AppointmentTypes.Add(item);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/calendar/appointment-types/{item.Id}", item);
    }

    private static async Task<IResult> UpdateAppointmentType(Guid id, AppointmentTypeRequest request, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var item = await db.AppointmentTypes.FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        if (item is null) return Results.NotFound();

        var validation = await ValidateAppointmentTypeAsync(request, db, context.WorkspaceId, id, ct);
        if (validation is not null) return validation;

        item.AssignedUserId = request.AssignedUserId;
        item.Name = request.Name.Trim();
        item.Description = request.Description?.Trim();
        item.Slug = NormalizeSlug(request.Slug);
        item.DurationMinutes = request.DurationMinutes;
        item.LocationType = request.LocationType;
        item.LocationValue = request.LocationValue?.Trim();
        item.BufferBeforeMinutes = request.BufferBeforeMinutes;
        item.BufferAfterMinutes = request.BufferAfterMinutes;
        item.MinimumNoticeMinutes = request.MinimumNoticeMinutes;
        item.MaximumBookingWindowDays = request.MaximumBookingWindowDays;
        item.Timezone = request.Timezone;
        item.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(item);
    }

    private static async Task<IResult> ArchiveAppointmentType(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var item = await db.AppointmentTypes.FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        if (item is null) return Results.NotFound();
        item.IsActive = false;
        item.ArchivedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static Task<IResult> SetAppointmentTypeActive(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct) =>
        SetAppointmentTypeStatus(id, true, db, context, ct);

    private static Task<IResult> SetAppointmentTypeInactive(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct) =>
        SetAppointmentTypeStatus(id, false, db, context, ct);

    private static async Task<IResult> SetAppointmentTypeStatus(Guid id, bool active, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var item = await db.AppointmentTypes.FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        if (item is null) return Results.NotFound();
        item.IsActive = active;
        if (active) item.ArchivedAtUtc = null;
        item.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(item);
    }

    private static Task<IResult> GetMyAvailability(AppDbContext db, WorkspaceContext context, CancellationToken ct) =>
        GetAvailability(context.UserId, db, context, ct);

    private static async Task<IResult> GetAvailability(Guid userId, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var rules = await db.UserAvailabilityRules.AsNoTracking()
            .Where(x => x.WorkspaceId == context.WorkspaceId && x.UserId == userId)
            .OrderBy(x => x.DayOfWeek).ThenBy(x => x.StartTime)
            .ToListAsync(ct);
        return Results.Ok(rules);
    }

    private static async Task<IResult> ReplaceAvailability(Guid userId, ReplaceAvailabilityRequest request, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == userId, ct))
        {
            return Results.BadRequest(new { error = "User does not belong to workspace." });
        }

        var parsed = new List<UserAvailabilityRule>();
        foreach (var rule in request.Rules)
        {
            if (!TimeOnly.TryParse(rule.StartTime, out var start) || !TimeOnly.TryParse(rule.EndTime, out var end) || start >= end)
            {
                return Results.BadRequest(new { error = "Availability start time must be before end time." });
            }

            parsed.Add(new UserAvailabilityRule
            {
                Id = Guid.NewGuid(),
                WorkspaceId = context.WorkspaceId,
                UserId = userId,
                DayOfWeek = rule.DayOfWeek,
                StartTime = start,
                EndTime = end,
                Timezone = request.Timezone,
                CreatedAtUtc = DateTimeOffset.UtcNow
            });
        }

        foreach (var dayGroup in parsed.GroupBy(x => x.DayOfWeek))
        {
            var ordered = dayGroup.OrderBy(x => x.StartTime).ToList();
            for (var i = 1; i < ordered.Count; i++)
            {
                if (ordered[i - 1].EndTime > ordered[i].StartTime)
                {
                    return Results.BadRequest(new { error = "Availability blocks cannot overlap." });
                }
            }
        }

        await db.UserAvailabilityRules.Where(x => x.WorkspaceId == context.WorkspaceId && x.UserId == userId).ExecuteDeleteAsync(ct);
        db.UserAvailabilityRules.AddRange(parsed);
        await db.SaveChangesAsync(ct);
        return Results.Ok(parsed);
    }

    private static async Task<IResult> GetBookings(
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        Guid? userId,
        Guid? appointmentTypeId,
        BookingStatus? status,
        AppDbContext db,
        WorkspaceContext context,
        CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking().Where(x => x.WorkspaceId == context.WorkspaceId);
        if (fromUtc is not null) query = query.Where(x => x.EndUtc >= fromUtc);
        if (toUtc is not null) query = query.Where(x => x.StartUtc <= toUtc);
        if (userId is not null) query = query.Where(x => x.UserId == userId);
        if (appointmentTypeId is not null) query = query.Where(x => x.AppointmentTypeId == appointmentTypeId);
        if (status is not null) query = query.Where(x => x.Status == status);
        return Results.Ok(await query.OrderBy(x => x.StartUtc).ToListAsync(ct));
    }

    private static async Task<IResult> GetBooking(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var booking = await db.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        return booking is null ? Results.NotFound() : Results.Ok(booking);
    }

    private static async Task<IResult> CancelBooking(Guid id, CancelBookingRequest request, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        if (booking is null) return Results.NotFound();
        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAtUtc = DateTimeOffset.UtcNow;
        booking.CancellationReason = request.Reason;
        booking.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(booking);
    }

    private static async Task<IResult> GetContacts(string? search, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var query = db.Contacts.AsNoTracking().Where(x => x.WorkspaceId == context.WorkspaceId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.NormalizedEmail.Contains(term) || x.FirstName.ToLower().Contains(term));
        }
        return Results.Ok(await query.OrderByDescending(x => x.CreatedAtUtc).Take(100).ToListAsync(ct));
    }

    private static async Task<IResult> GetContact(Guid id, AppDbContext db, WorkspaceContext context, CancellationToken ct)
    {
        var contact = await db.Contacts.AsNoTracking().FirstOrDefaultAsync(x => x.WorkspaceId == context.WorkspaceId && x.Id == id, ct);
        return contact is null ? Results.NotFound() : Results.Ok(contact);
    }

    private static async Task<IResult> GetPublicMetadata(string workspaceSlug, string appointmentTypeSlug, AppDbContext db, CancellationToken ct)
    {
        var data = await ResolvePublicAppointmentAsync(workspaceSlug, appointmentTypeSlug, db, ct);
        if (data is null) return Results.NotFound();
        var (workspace, appointmentType) = data.Value;
        return Results.Ok(new PublicBookingMetadata(workspace.Name, appointmentType.Name, appointmentType.Description, appointmentType.DurationMinutes, appointmentType.LocationType, appointmentType.LocationValue, appointmentType.Timezone));
    }

    private static async Task<IResult> GetPublicSlots(
        string workspaceSlug,
        string appointmentTypeSlug,
        DateOnly from,
        DateOnly to,
        string timezone,
        AppDbContext db,
        SlotGenerationService slotService,
        CancellationToken ct)
    {
        var data = await ResolvePublicAppointmentAsync(workspaceSlug, appointmentTypeSlug, db, ct);
        if (data is null) return Results.NotFound();
        var (_, appointmentType) = data.Value;
        if (to < from || to.DayNumber - from.DayNumber > 90) return Results.BadRequest(new { error = "Date range must be between 1 and 90 days." });
        return Results.Ok(new { timezone, slots = await slotService.GenerateAsync(appointmentType, from, to, timezone, ct) });
    }

    private static async Task<IResult> CreatePublicBooking(
        string workspaceSlug,
        string appointmentTypeSlug,
        PublicBookingRequest request,
        AppDbContext db,
        BookingService bookingService,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.Email))
        {
            return Results.BadRequest(new { error = "First name and email are required." });
        }

        var data = await ResolvePublicAppointmentAsync(workspaceSlug, appointmentTypeSlug, db, ct);
        if (data is null) return Results.NotFound();

        try
        {
            return Results.Ok(await bookingService.CreatePublicBookingAsync(data.Value.AppointmentType, request, ct));
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { error = ex.Message });
        }
    }

    private static async Task<(Workspace Workspace, AppointmentType AppointmentType)?> ResolvePublicAppointmentAsync(string workspaceSlug, string appointmentTypeSlug, AppDbContext db, CancellationToken ct)
    {
        var workspace = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == NormalizeSlug(workspaceSlug), ct);
        if (workspace is null) return null;
        var appointmentType = await db.AppointmentTypes.AsNoTracking().FirstOrDefaultAsync(x =>
            x.WorkspaceId == workspace.Id &&
            x.Slug == NormalizeSlug(appointmentTypeSlug) &&
            x.IsActive &&
            x.ArchivedAtUtc == null,
            ct);
        return appointmentType is null ? null : (workspace, appointmentType);
    }

    private static async Task<IResult?> ValidateAppointmentTypeAsync(AppointmentTypeRequest request, AppDbContext db, Guid workspaceId, Guid? currentId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { error = "Name is required." });
        if (request.DurationMinutes is < 5 or > 480) return Results.BadRequest(new { error = "Duration must be between 5 and 480 minutes." });
        if (request.BufferBeforeMinutes < 0 || request.BufferAfterMinutes < 0 || request.MinimumNoticeMinutes < 0) return Results.BadRequest(new { error = "Buffers and minimum notice cannot be negative." });
        if (request.MaximumBookingWindowDays is < 1 or > 365) return Results.BadRequest(new { error = "Maximum booking window must be between 1 and 365 days." });
        if (!await db.Users.AnyAsync(x => x.WorkspaceId == workspaceId && x.Id == request.AssignedUserId, ct)) return Results.BadRequest(new { error = "Assigned user does not belong to workspace." });

        var slug = NormalizeSlug(request.Slug);
        var duplicateSlug = await db.AppointmentTypes.AnyAsync(x => x.WorkspaceId == workspaceId && x.Slug == slug && x.Id != currentId, ct);
        return duplicateSlug ? Results.BadRequest(new { error = "Slug is already in use." }) : null;
    }

    private static string NormalizeSlug(string value) => value.Trim().ToLowerInvariant();
}

using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CoachingSaaS.Api.Modules.Calendar.Services;

public sealed class BookingService(AppDbContext db, SlotGenerationService slots, ContactUpsertService contacts)
{
    public async Task<BookingResult> CreatePublicBookingAsync(
        AppointmentType appointmentType,
        PublicBookingRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        if (!await slots.IsSlotValidAsync(appointmentType, request.StartUtc, cancellationToken))
        {
            throw new InvalidOperationException("The selected slot is no longer available.");
        }

        var endUtc = request.StartUtc.AddMinutes(appointmentType.DurationMinutes);
        var blockedStart = request.StartUtc.AddMinutes(-appointmentType.BufferBeforeMinutes);
        var blockedEnd = endUtc.AddMinutes(appointmentType.BufferAfterMinutes);

        var hasConflict = await db.Bookings.AnyAsync(x =>
            x.WorkspaceId == appointmentType.WorkspaceId &&
            x.UserId == appointmentType.AssignedUserId &&
            x.Status == BookingStatus.Confirmed &&
            blockedStart < x.BlockedEndUtc &&
            x.BlockedStartUtc < blockedEnd,
            cancellationToken);

        if (hasConflict)
        {
            throw new InvalidOperationException("The selected slot has just been booked.");
        }

        var contact = await contacts.UpsertAsync(appointmentType.WorkspaceId, request, cancellationToken);
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            WorkspaceId = appointmentType.WorkspaceId,
            AppointmentTypeId = appointmentType.Id,
            UserId = appointmentType.AssignedUserId,
            ContactId = contact.Id,
            Status = BookingStatus.Confirmed,
            StartUtc = request.StartUtc,
            EndUtc = endUtc,
            BlockedStartUtc = blockedStart,
            BlockedEndUtc = blockedEnd,
            BufferBeforeMinutes = appointmentType.BufferBeforeMinutes,
            BufferAfterMinutes = appointmentType.BufferAfterMinutes,
            CustomerTimezone = request.Timezone,
            CustomerName = $"{request.FirstName.Trim()} {request.LastName.Trim()}".Trim(),
            CustomerEmail = request.Email.Trim(),
            CustomerPhone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new BookingResult(booking.Id, booking.Status, booking.StartUtc, booking.EndUtc);
    }
}

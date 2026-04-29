using Microsoft.EntityFrameworkCore;

namespace CoachingSaaS.Api.Modules.Calendar.Services;

public sealed class ContactUpsertService(AppDbContext db)
{
    public async Task<Contact> UpsertAsync(Guid workspaceId, PublicBookingRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var now = DateTimeOffset.UtcNow;
        var contact = await db.Contacts
            .FirstOrDefaultAsync(x => x.WorkspaceId == workspaceId && x.NormalizedEmail == normalizedEmail, cancellationToken);

        if (contact is null)
        {
            contact = new Contact
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspaceId,
                FirstName = request.FirstName.Trim(),
                LastName = NullIfWhiteSpace(request.LastName),
                Email = request.Email.Trim(),
                NormalizedEmail = normalizedEmail,
                Phone = NullIfWhiteSpace(request.Phone),
                Timezone = NullIfWhiteSpace(request.Timezone),
                Source = ContactSource.CalendarBooking,
                CreatedAtUtc = now
            };
            db.Contacts.Add(contact);
            return contact;
        }

        if (!string.IsNullOrWhiteSpace(request.FirstName)) contact.FirstName = request.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(request.LastName)) contact.LastName = request.LastName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Phone) && string.IsNullOrWhiteSpace(contact.Phone)) contact.Phone = request.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(request.Timezone)) contact.Timezone = request.Timezone.Trim();
        contact.UpdatedAtUtc = now;
        return contact;
    }

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

using Microsoft.EntityFrameworkCore;

namespace CoachingSaaS.Api.Modules.Calendar;

public static class DemoSeed
{
    public static readonly Guid WorkspaceId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Workspaces.AnyAsync())
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        db.Workspaces.Add(new Workspace
        {
            Id = WorkspaceId,
            Name = "Acme Coaching",
            Slug = "acme-coaching",
            Timezone = "Australia/Sydney",
            CreatedAtUtc = now
        });

        db.Users.Add(new AppUser
        {
            Id = UserId,
            WorkspaceId = WorkspaceId,
            Email = "owner@acme.test",
            NormalizedEmail = "owner@acme.test",
            FirstName = "Alex",
            LastName = "Owner",
            Role = WorkspaceRole.Owner,
            Timezone = "Australia/Sydney",
            CreatedAtUtc = now
        });

        var appointmentTypeId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        db.AppointmentTypes.Add(new AppointmentType
        {
            Id = appointmentTypeId,
            WorkspaceId = WorkspaceId,
            AssignedUserId = UserId,
            Name = "Discovery Call",
            Description = "A short introductory consultation.",
            Slug = "discovery-call",
            DurationMinutes = 30,
            LocationType = AppointmentLocationType.Online,
            LocationValue = "Meeting link provided after booking",
            BufferAfterMinutes = 15,
            MinimumNoticeMinutes = 120,
            MaximumBookingWindowDays = 30,
            Timezone = "Australia/Sydney",
            CreatedAtUtc = now
        });

        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };
        foreach (var day in weekdays)
        {
            db.UserAvailabilityRules.Add(new UserAvailabilityRule
            {
                Id = Guid.NewGuid(),
                WorkspaceId = WorkspaceId,
                UserId = UserId,
                DayOfWeek = day,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(17, 0),
                Timezone = "Australia/Sydney",
                CreatedAtUtc = now
            });
        }

        await db.SaveChangesAsync();
    }
}

using Microsoft.EntityFrameworkCore;

namespace CoachingSaaS.Api.Modules.Calendar;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AppointmentType> AppointmentTypes => Set<AppointmentType>();
    public DbSet<UserAvailabilityRule> UserAvailabilityRules => Set<UserAvailabilityRule>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Contact> Contacts => Set<Contact>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Workspace>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<AppUser>().HasIndex(x => new { x.WorkspaceId, x.NormalizedEmail }).IsUnique();
        modelBuilder.Entity<AppointmentType>().HasIndex(x => new { x.WorkspaceId, x.Slug }).IsUnique();
        modelBuilder.Entity<AppointmentType>().HasIndex(x => new { x.WorkspaceId, x.AssignedUserId });
        modelBuilder.Entity<UserAvailabilityRule>().HasIndex(x => new { x.WorkspaceId, x.UserId, x.DayOfWeek });
        modelBuilder.Entity<Contact>().HasIndex(x => new { x.WorkspaceId, x.NormalizedEmail }).IsUnique();
        modelBuilder.Entity<Booking>().HasIndex(x => new { x.WorkspaceId, x.UserId, x.BlockedStartUtc, x.BlockedEndUtc });
        modelBuilder.Entity<Booking>().HasIndex(x => new { x.WorkspaceId, x.AppointmentTypeId });
        modelBuilder.Entity<Booking>().HasIndex(x => new { x.WorkspaceId, x.ContactId });
    }
}

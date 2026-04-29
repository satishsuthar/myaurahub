namespace CoachingSaaS.Api.Modules.Calendar.Services;

public static class TimeZoneResolver
{
    private static readonly Dictionary<string, string> WindowsFallbacks = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Australia/Sydney"] = "AUS Eastern Standard Time",
        ["Australia/Melbourne"] = "AUS Eastern Standard Time",
        ["Australia/Brisbane"] = "E. Australia Standard Time",
        ["America/New_York"] = "Eastern Standard Time",
        ["America/Los_Angeles"] = "Pacific Standard Time",
        ["Europe/London"] = "GMT Standard Time",
        ["UTC"] = "UTC"
    };

    public static TimeZoneInfo Find(string id)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException) when (WindowsFallbacks.TryGetValue(id, out var windowsId))
        {
            return TimeZoneInfo.FindSystemTimeZoneById(windowsId);
        }
    }

    public static DateTimeOffset LocalToUtc(DateOnly date, TimeOnly time, string timezone)
    {
        var zone = Find(timezone);
        var unspecified = DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, zone);
    }

    public static string UtcToLocalIso(DateTimeOffset utc, string timezone)
    {
        var zone = Find(timezone);
        return TimeZoneInfo.ConvertTime(utc, zone).ToString("O");
    }
}

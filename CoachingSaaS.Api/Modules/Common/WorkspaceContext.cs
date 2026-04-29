namespace CoachingSaaS.Api.Modules.Common;

public sealed class WorkspaceContext(IHttpContextAccessor accessor)
{
    public Guid WorkspaceId
    {
        get
        {
            var header = accessor.HttpContext?.Request.Headers["X-Workspace-Id"].FirstOrDefault();
            if (Guid.TryParse(header, out var id))
            {
                return id;
            }

            throw new InvalidOperationException("Missing or invalid X-Workspace-Id header.");
        }
    }

    public Guid UserId
    {
        get
        {
            var header = accessor.HttpContext?.Request.Headers["X-User-Id"].FirstOrDefault();
            if (Guid.TryParse(header, out var id))
            {
                return id;
            }

            throw new InvalidOperationException("Missing or invalid X-User-Id header.");
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MemberApi.Hubs;

[Authorize]
public class BerichtenHub : Hub
{
    /// <summary>
    /// On connect: add the user to their personal group so we can push
    /// targeted unread-count updates when they mark a bericht as read.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);

        await base.OnDisconnectedAsync(exception);
    }
}

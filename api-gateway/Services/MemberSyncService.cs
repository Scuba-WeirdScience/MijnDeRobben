using System.Net.Http.Json;

namespace ApiGateway.Services;

/// <summary>
/// Calls the member-api to bootstrap a member record for a gateway user.
/// No longer syncs email — that lives only on ApplicationUser.
/// </summary>
public interface IMemberSyncService
{
    /// <summary>
    /// Calls member-api POST /members/link-or-create with just the userId.
    /// This ensures a Member row exists for brevetten/organisatiekoppelingen.
    /// Failure is non-fatal — the caller should log and continue.
    /// </summary>
    Task LinkOrCreateAsync(string userId);
}

public class MemberSyncService(IHttpClientFactory httpClientFactory, ILogger<MemberSyncService> logger)
    : IMemberSyncService
{
    public async Task LinkOrCreateAsync(string userId)
    {
        try
        {
            var client = httpClientFactory.CreateClient("MemberApi");
            var response = await client.PostAsJsonAsync("members/link-or-create",
                new { UserId = userId });

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning(
                    "link-or-create returned {Status} for user {UserId}: {Body}",
                    response.StatusCode, userId, body);
            }
        }
        catch (Exception ex)
        {
            // Don't let member-api unavailability block login/registration
            logger.LogError(ex, "Failed to sync member record for gateway user {UserId}", userId);
        }
    }
}

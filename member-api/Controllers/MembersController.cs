using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("members")]
[Authorize]
public class MembersController(
    IMemberService memberService,
    IConfiguration config,
    IWebHostEnvironment env) : ControllerBase
{
    /// <summary>
    /// Returns a guaranteed non-null web root path.
    /// Falls back to &lt;ContentRootPath&gt;/wwwroot when WebRootPath is null
    /// (which happens when the wwwroot folder doesn't exist yet at startup).
    /// </summary>
    private string WebRootPath =>
        env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");

    /// <summary>
    /// Called by api-gateway to ensure a Member row exists for this user.
    /// Guarded by the shared gateway secret; no JWT required.
    /// </summary>
    [HttpPost("link-or-create")]
    [AllowAnonymous]
    public async Task<IActionResult> LinkOrCreate([FromBody] LinkOrCreateDto dto)
    {
        var expectedSecret = config["Gateway:SharedSecret"];
        if (!string.IsNullOrEmpty(expectedSecret))
        {
            if (!Request.Headers.TryGetValue("X-Gateway-Secret", out var provided) ||
                provided != expectedSecret)
                return Unauthorized(new { error = "Invalid gateway secret." });
        }

        var member = await memberService.LinkOrCreateAsync(dto);
        return Ok(member);
    }


    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var result = await memberService.GetAllAsync(page, pageSize, search, isActive);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var member = await memberService.GetByIdAsync(id);
        return member is null ? NotFound(new { error = "Member not found" }) : Ok(member);
    }

    [HttpPost]
    [Authorize(Roles = "Beheer,Bestuur")]
    public async Task<IActionResult> Create([FromBody] CreateMemberDto dto)
    {
        var member = await memberService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = member.Id }, member);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Beheer,Bestuur")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMemberDto dto)
    {
        var member = await memberService.UpdateAsync(id, dto);
        return member is null ? NotFound(new { error = "Member not found" }) : Ok(member);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Beheer")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await memberService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { error = "Member not found" });
    }

    // ── "Me" endpoints ────────────────────────────────────────────────────────

    /// <summary>Returns the member record for the currently authenticated user.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.FindFirst("sub")?.Value
                         ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Missing user identity." });

        var member = await memberService.GetMeAsync(userId);
        return member is null ? NotFound(new { error = "Member record not found." }) : Ok(member);
    }

    /// <summary>
    /// Uploads (or replaces) the avatar for the currently authenticated user.
    /// Accepts multipart/form-data with a file field named "file".
    /// JPEG and PNG only, max 2 MB.
    /// </summary>
    [HttpPost("me/avatar")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > 2 * 1024 * 1024)
            return BadRequest(new { error = "File exceeds the 2 MB limit." });

        var userId = User.FindFirst("sub")?.Value
                         ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Missing user identity." });

        try
        {
            var member = await memberService.UploadAvatarAsync(userId, file, WebRootPath);
            return Ok(member);
        }
        catch (InvalidOperationException ex)
        {
            return ex.Message.Contains("not found")
                ? NotFound(new { error = ex.Message })
                : BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Deletes the avatar for the currently authenticated user.</summary>
    [HttpDelete("me/avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        var userId = User.FindFirst("sub")?.Value
                         ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Missing user identity." });

        try
        {
            var member = await memberService.DeleteAvatarAsync(userId, WebRootPath);
            return Ok(member);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}

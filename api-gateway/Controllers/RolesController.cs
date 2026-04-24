using ApiGateway.DTOs;
using ApiGateway.Models;
using ApiGateway.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Controllers;

[ApiController]
[Authorize(Roles = "Beheer")]
public class RolesController(
    IUserService userService,
    RoleManager<IdentityRole> roleManager,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("roles")]
    public IActionResult GetRoles()
    {
        var roles = roleManager.Roles.Select(r => r.Name).ToList();
        return Ok(roles);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await userManager.Users
            .Select(u => new UserSummaryDto(
                u.Id,
                u.Email!,
                u.FirstName,
                u.LastName,
                u.IsActive,
                u.IsValidated))
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("users/{id}/roles")]
    public async Task<IActionResult> GetUserRoles(string id)
    {
        var roles = await userService.GetRolesAsync(id);
        return Ok(roles);
    }

    [HttpPost("users/{id}/roles")]
    public async Task<IActionResult> AssignRole(string id, [FromBody] AssignRoleDto dto)
    {
        var (success, error) = await userService.AssignRoleAsync(id, dto.Role);
        return success
            ? Ok(new { message = "Role assigned." })
            : error == "User not found." ? NotFound(new { error }) : BadRequest(new { error });
    }

    [HttpDelete("users/{id}/roles/{role}")]
    public async Task<IActionResult> RemoveRole(string id, string role)
    {
        var (success, error) = await userService.RemoveRoleAsync(id, role);
        return success ? NoContent() : NotFound(new { error });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        var (success, error) = await userService.UpdateUserAsync(id, dto);
        return success
            ? Ok(new { message = "User updated." })
            : error == "User not found." ? NotFound(new { error }) : BadRequest(new { error });
    }

    [HttpPost("users/{id}/password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
    {
        var (success, error) = await userService.ResetPasswordAsync(id, dto.NewPassword);
        return success
            ? Ok(new { message = "Password reset." })
            : error == "User not found." ? NotFound(new { error }) : BadRequest(new { error });
    }
}

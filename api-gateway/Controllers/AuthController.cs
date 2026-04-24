using ApiGateway.DTOs;
using ApiGateway.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ApiGateway.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IUserService userService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var result = await userService.LoginAsync(dto);

        return result switch
        {
            LoginSuccess s        => Ok(s.Tokens),
            AccountInactive       => StatusCode(403, new LoginErrorDto("AccountInactive")),
            ValidationRequired    => StatusCode(403, new LoginErrorDto("ValidationRequired", RequiresValidation: true)),
            InvalidDateOfBirth    => Unauthorized(new LoginErrorDto("InvalidDateOfBirth")),
            LoginFailure          => Unauthorized(new LoginErrorDto("InvalidCredentials")),
            _                     => Unauthorized(new LoginErrorDto("InvalidCredentials"))
        };
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        var callerIsBeheer = User.IsInRole("Beheer");
        var (response, error) = await userService.RegisterAsync(dto, callerIsBeheer);

        return error is not null
            ? BadRequest(new { error })
            : CreatedAtAction(nameof(Login), response);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Cannot identify user." });

        var result = await userService.RefreshAsync(userId, dto.RefreshToken);
        return result is null
            ? Unauthorized(new { error = "Invalid or expired refresh token." })
            : Ok(result);
    }
}

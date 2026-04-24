using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IMemberService
{
    Task<PagedResult<MemberDto>> GetAllAsync(int page, int pageSize, string? search, bool? isActive);
    Task<MemberDto?> GetByIdAsync(Guid id);
    Task<MemberDto> CreateAsync(CreateMemberDto dto);
    Task<MemberDto?> UpdateAsync(Guid id, UpdateMemberDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<MemberDto> LinkOrCreateAsync(LinkOrCreateDto dto);

    /// <summary>Returns the member record linked to the given userId.</summary>
    Task<MemberDto?> GetMeAsync(string userId);

    /// <summary>Saves the uploaded file as the member's avatar and updates AvatarUrl.</summary>
    Task<MemberDto> UploadAvatarAsync(string userId, IFormFile file, string webRootPath);

    /// <summary>Deletes the member's avatar file and clears AvatarUrl.</summary>
    Task<MemberDto> DeleteAvatarAsync(string userId, string webRootPath);
}

public class MemberService(MemberDbContext db) : IMemberService
{
    public async Task<PagedResult<MemberDto>> GetAllAsync(int page, int pageSize, string? search, bool? isActive)
    {
        var query = db.Members.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(m =>
                m.FirstName.Contains(search) ||
                m.LastName.Contains(search));

        if (isActive.HasValue)
            query = query.Where(m => m.IsActive == isActive.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(m => m.LastName).ThenBy(m => m.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => ToDto(m))
            .ToListAsync();

        return new PagedResult<MemberDto>(items, total, page, pageSize);
    }

    public async Task<MemberDto?> GetByIdAsync(Guid id)
    {
        var member = await db.Members.FindAsync(id);
        return member is null ? null : ToDto(member);
    }

    public async Task<MemberDto> CreateAsync(CreateMemberDto dto)
    {
        var member = new Member
        {
            UserId = dto.UserId,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            DateOfBirth = DateOnly.Parse(dto.DateOfBirth),
            JoinDate = dto.JoinDate is not null ? DateOnly.Parse(dto.JoinDate) : DateOnly.FromDateTime(DateTime.UtcNow),
            IsActive = dto.IsActive ?? true,
            CreatedAt = DateTime.UtcNow
        };

        db.Members.Add(member);
        await db.SaveChangesAsync();
        return ToDto(member);
    }

    public async Task<MemberDto?> UpdateAsync(Guid id, UpdateMemberDto dto)
    {
        var member = await db.Members.FindAsync(id);
        if (member is null) return null;

        if (dto.FirstName is not null) member.FirstName = dto.FirstName;
        if (dto.LastName is not null) member.LastName = dto.LastName;
        if (dto.DateOfBirth is not null) member.DateOfBirth = DateOnly.Parse(dto.DateOfBirth);
        if (dto.JoinDate is not null) member.JoinDate = DateOnly.Parse(dto.JoinDate);
        if (dto.IsActive.HasValue) member.IsActive = dto.IsActive.Value;
        member.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(member);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var member = await db.Members.FindAsync(id);
        if (member is null) return false;
        db.Members.Remove(member);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<MemberDto> LinkOrCreateAsync(LinkOrCreateDto dto)
    {
        // Already linked by UserId?
        var member = await db.Members
            .FirstOrDefaultAsync(m => m.UserId == dto.UserId);

        if (member is null)
        {
            // No match — create a minimal stub member record (inactive, unvalidated).
            // Admin fills in profile details later via ledenbeheer.
            member = new Member
            {
                UserId = dto.UserId,
                FirstName = string.Empty,
                LastName = string.Empty,
                DateOfBirth = new DateOnly(1900, 1, 1),
                JoinDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsActive = true,
                IsValidated = false,
                CreatedAt = DateTime.UtcNow,
            };
            db.Members.Add(member);
            await db.SaveChangesAsync();
        }

        return ToDto(member);
    }

    private static MemberDto ToDto(Member m) => new(
        m.Id,
        m.UserId,
        m.FirstName,
        m.LastName,
        m.DateOfBirth.ToString("yyyy-MM-dd"),
        m.JoinDate.ToString("yyyy-MM-dd"),
        m.IsActive,
        m.IsValidated,
        m.CreatedAt.ToString("o"),
        m.UpdatedAt?.ToString("o"),
        m.AvatarUrl
    );

    public async Task<MemberDto?> GetMeAsync(string userId)
    {
        var member = await db.Members
            .FirstOrDefaultAsync(m => m.UserId == userId);
        return member is null ? null : ToDto(member);
    }

    public async Task<MemberDto> UploadAvatarAsync(string userId, IFormFile file, string webRootPath)
    {
        var member = await db.Members
            .FirstOrDefaultAsync(m => m.UserId == userId)
            ?? throw new InvalidOperationException($"Member not found for userId '{userId}'.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not ".jpg" and not ".jpeg" and not ".png")
            throw new InvalidOperationException("Only JPEG and PNG files are allowed.");

        var uploadDir = Path.Combine(webRootPath, "uploads", "avatars");
        Directory.CreateDirectory(uploadDir);

        // Delete any existing avatar file(s) for this member
        foreach (var existing in Directory.GetFiles(uploadDir, $"{member.Id}.*"))
            File.Delete(existing);

        var fileName = $"{member.Id}{ext}";
        var filePath = Path.Combine(uploadDir, fileName);
        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        member.AvatarUrl = $"/uploads/avatars/{fileName}";
        member.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return ToDto(member);
    }

    public async Task<MemberDto> DeleteAvatarAsync(string userId, string webRootPath)
    {
        var member = await db.Members
            .FirstOrDefaultAsync(m => m.UserId == userId)
            ?? throw new InvalidOperationException($"Member not found for userId '{userId}'.");

        if (member.AvatarUrl is not null)
        {
            var relativePath = member.AvatarUrl.TrimStart('/');
            var filePath = Path.Combine(webRootPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(filePath))
                File.Delete(filePath);

            member.AvatarUrl = null;
            member.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return ToDto(member);
    }
}

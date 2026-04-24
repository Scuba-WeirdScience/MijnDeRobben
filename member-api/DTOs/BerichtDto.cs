namespace MemberApi.DTOs;

public record BerichtSummaryDto(
    Guid Id,
    string Onderwerp,
    string InhoudPreview,
    bool IsPinned,
    MemberDisplayDto Zender,
    string AangemaaktOp,
    bool IsGelezen
);

public record BerichtDetailDto(
    Guid Id,
    string Onderwerp,
    string Inhoud,
    bool IsPinned,
    MemberDisplayDto Zender,
    string AangemaaktOp,
    string? BijgewerktOp
);

public record CreateBerichtDto(
    string Onderwerp,
    string Inhoud,
    bool IsPinned
);

public record OnGelezenAantalDto(int Aantal);

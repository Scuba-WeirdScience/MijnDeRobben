namespace MemberApi.DTOs;

public record SpecialtyTypeDto(
    Guid Id,
    string Organisatie,
    string Naam,
    int Volgorde
);

public record CreateSpecialtyTypeDto(
    string Organisatie,
    string Naam,
    int Volgorde
);

public record UpdateSpecialtyTypeDto(
    string Naam,
    int Volgorde
);

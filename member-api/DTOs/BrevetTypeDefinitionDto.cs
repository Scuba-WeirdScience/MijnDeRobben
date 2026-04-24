namespace MemberApi.DTOs;

public record BrevetTypeDefinitionDto(
    Guid Id,
    string Organisatie,
    string Naam,
    int Volgorde
);

public record CreateBrevetTypeDefinitionDto(
    string Organisatie,
    string Naam,
    int Volgorde
);

public record UpdateBrevetTypeDefinitionDto(
    string Naam,
    int Volgorde
);

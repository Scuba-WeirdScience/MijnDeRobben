using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace member_api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BrevetTypeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Organisatie = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Naam = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Volgorde = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrevetTypeDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MateriaalTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Naam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Beschrijving = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Volgorde = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    MaxLeningenPerLid = table.Column<int>(type: "int", nullable: true),
                    Huurprijs = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    CustomProperties = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MateriaalTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: false),
                    JoinDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsValidated = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Members", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SpecialtyTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Organisatie = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Naam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Volgorde = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpecialtyTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Materialen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MateriaalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Naam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Serienummer = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Notities = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AankoopDatum = table.Column<DateOnly>(type: "date", nullable: true),
                    Actief = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CustomProperties = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materialen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Materialen_MateriaalTypes_MateriaalTypeId",
                        column: x => x.MateriaalTypeId,
                        principalTable: "MateriaalTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Brevetten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Organisatie = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OrganisatieNaam = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BrevetType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Brevet"),
                    Niveau = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BehaaldDatum = table.Column<DateOnly>(type: "date", nullable: true),
                    Notities = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brevetten", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Brevetten_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MemberOrganisaties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Organisatie = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Logboeknummer = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BeginDatum = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberOrganisaties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemberOrganisaties_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Leningen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MateriaalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UitgeleendDatum = table.Column<DateOnly>(type: "date", nullable: false),
                    Retourdatum = table.Column<DateOnly>(type: "date", nullable: true),
                    Notities = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leningen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Leningen_Materialen_MateriaalId",
                        column: x => x.MateriaalId,
                        principalTable: "Materialen",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Brevetten_MemberId",
                table: "Brevetten",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Leningen_MateriaalId_Retourdatum",
                table: "Leningen",
                columns: new[] { "MateriaalId", "Retourdatum" });

            migrationBuilder.CreateIndex(
                name: "IX_Leningen_MemberId",
                table: "Leningen",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MateriaalTypes_Naam",
                table: "MateriaalTypes",
                column: "Naam",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materialen_MateriaalTypeId",
                table: "Materialen",
                column: "MateriaalTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberOrganisaties_MemberId_Organisatie",
                table: "MemberOrganisaties",
                columns: new[] { "MemberId", "Organisatie" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Members_UserId",
                table: "Members",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SpecialtyTypes_Organisatie_Naam",
                table: "SpecialtyTypes",
                columns: new[] { "Organisatie", "Naam" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Brevetten");

            migrationBuilder.DropTable(
                name: "BrevetTypeDefinitions");

            migrationBuilder.DropTable(
                name: "Leningen");

            migrationBuilder.DropTable(
                name: "MemberOrganisaties");

            migrationBuilder.DropTable(
                name: "SpecialtyTypes");

            migrationBuilder.DropTable(
                name: "Materialen");

            migrationBuilder.DropTable(
                name: "Members");

            migrationBuilder.DropTable(
                name: "MateriaalTypes");
        }
    }
}

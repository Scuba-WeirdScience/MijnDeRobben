using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api_gateway.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberFieldsToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "Users",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsValidated",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "JoinDate",
                table: "Users",
                type: "date",
                nullable: false,
                defaultValue: DateOnly.FromDateTime(DateTime.UtcNow));

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AvatarUrl", table: "Users");
            migrationBuilder.DropColumn(name: "DateOfBirth", table: "Users");
            migrationBuilder.DropColumn(name: "FirstName", table: "Users");
            migrationBuilder.DropColumn(name: "IsActive", table: "Users");
            migrationBuilder.DropColumn(name: "IsValidated", table: "Users");
            migrationBuilder.DropColumn(name: "JoinDate", table: "Users");
            migrationBuilder.DropColumn(name: "LastName", table: "Users");
        }
    }
}

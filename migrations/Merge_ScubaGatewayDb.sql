-- =============================================================================
-- Migration: Merge ScubaMemberDb into ScubaGatewayDb
-- Date: 2026-04-05
-- Description:
--   1. Adds member-profile columns to the ApplicationUser (Users) table
--      in ScubaGatewayDb (handled by EF migration in api-gateway)
--   2. Creates Members, Brevetten, SpecialtyTypes, MemberOrganisaties tables
--      in ScubaGatewayDb for the member-api
--   3. Creates MateriaalTypes + Materialen tables for the materialen feature
--   4. Registers this migration in __EFMigrationsHistory so both APIs stay
--      in sync on the same database
--
-- Run via: sqlcmd -S localhost -d ScubaGatewayDb -i Merge_ScubaGatewayDb.sql
-- =============================================================================

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @MigrationId NVARCHAR(255) = 'AddMemberAndBrevetTables';

-- Check if migration already registered
IF EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = @MigrationId)
BEGIN
    PRINT 'Migration [' + @MigrationId + '] already applied. Skipping.';
    RETURN;
END

PRINT 'Applying migration: ' + @MigrationId;

-- ── Add member fields to Users table ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'FirstName')
BEGIN
    ALTER TABLE [Users] ADD
        [FirstName]    NVARCHAR(100)  NULL,
        [LastName]     NVARCHAR(100)  NULL,
        [DateOfBirth]  DATE           NULL,
        [JoinDate]     DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
        [IsActive]     BIT            NOT NULL DEFAULT 1,
        [IsValidated]   BIT            NOT NULL DEFAULT 0,
        [AvatarUrl]    NVARCHAR(500)  NULL;
    PRINT 'Added member fields to Users table';
END
ELSE
    PRINT 'Member fields already exist in Users table — skipping.';

-- ── Members ────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Members')
BEGIN
    CREATE TABLE [Members] (
        [Id]                         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [UserId]                     NVARCHAR(256)     NOT NULL,
        [FirstName]                  NVARCHAR(100)    NOT NULL DEFAULT '',
        [LastName]                   NVARCHAR(100)    NOT NULL DEFAULT '',
        [DateOfBirth]                DATE              NOT NULL,
        [JoinDate]                   DATE              NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
        [IsActive]                   BIT               NOT NULL DEFAULT 1,
        [IsValidated]                BIT               NOT NULL DEFAULT 0,
        [CreatedAt]                  DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]                  DATETIME2         NULL,
        [AvatarUrl]                  NVARCHAR(500)    NULL,
        CONSTRAINT [PK_Members] PRIMARY KEY ([Id])
    );

    CREATE UNIQUE INDEX [IX_Members_UserId] ON [Members] ([UserId]);

    PRINT 'Created table: Members';
END
ELSE
    PRINT 'Table Members already exists — skipping.';

-- ── SpecialtyTypes ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SpecialtyTypes')
BEGIN
    CREATE TABLE [SpecialtyTypes] (
        [Id]         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [Organisatie] NVARCHAR(50)    NOT NULL,
        [Naam]       NVARCHAR(100)   NOT NULL,
        [Volgorde]   INT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_SpecialtyTypes] PRIMARY KEY ([Id])
    );

    CREATE UNIQUE INDEX [IX_SpecialtyTypes_Organisatie_Naam] ON [SpecialtyTypes] ([Organisatie], [Naam]);

    PRINT 'Created table: SpecialtyTypes';
END
ELSE
    PRINT 'Table SpecialtyTypes already exists — skipping.';

-- ── Brevetten ─────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Brevetten')
BEGIN
    CREATE TABLE [Brevetten] (
        [Id]               UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [MemberId]         UNIQUEIDENTIFIER  NOT NULL,
        [Organisatie]      NVARCHAR(50)    NOT NULL,
        [OrganisatieNaam]  NVARCHAR(100)   NULL,
        [Niveau]           NVARCHAR(100)   NOT NULL,
        [BrevetType]       NVARCHAR(20)    NOT NULL DEFAULT 'Brevet',
        [BehaaldDatum]     DATE            NULL,
        [Notities]         NVARCHAR(500)   NULL,
        [CreatedAt]        DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]        DATETIME2       NULL,
        CONSTRAINT [PK_Brevetten] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Brevetten_Members_MemberId]
            FOREIGN KEY ([MemberId]) REFERENCES [Members] ([Id])
            ON DELETE CASCADE
    );

    CREATE INDEX [IX_Brevetten_MemberId] ON [Brevetten] ([MemberId]);

    PRINT 'Created table: Brevetten';
END
ELSE
    PRINT 'Table Brevetten already exists — skipping.';

-- ── MemberOrganisaties ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MemberOrganisaties')
BEGIN
    CREATE TABLE [MemberOrganisaties] (
        [Id]             UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [MemberId]       UNIQUEIDENTIFIER  NOT NULL,
        [Organisatie]    NVARCHAR(50)    NOT NULL,
        [Logboeknummer]  NVARCHAR(100)   NULL,
        [BeginDatum]     DATE            NULL,
        [CreatedAt]      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]      DATETIME2       NULL,
        CONSTRAINT [PK_MemberOrganisaties] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MemberOrganisaties_Members_MemberId]
            FOREIGN KEY ([MemberId]) REFERENCES [Members] ([Id])
            ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX [IX_MemberOrganisaties_MemberId_Organisatie]
        ON [MemberOrganisaties] ([MemberId], [Organisatie]);

    PRINT 'Created table: MemberOrganisaties';
END
ELSE
    PRINT 'Table MemberOrganisaties already exists — skipping.';

-- ── MateriaalTypes ────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MateriaalTypes')
BEGIN
    CREATE TABLE [MateriaalTypes] (
        [Id]          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [Naam]        NVARCHAR(100)     NOT NULL,
        [Beschrijving] NVARCHAR(500)   NULL,
        [Volgorde]    INT               NOT NULL DEFAULT 0,
        [CreatedAt]   DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]   DATETIME2         NULL,
        CONSTRAINT [PK_MateriaalTypes] PRIMARY KEY ([Id])
    );

    PRINT 'Created table: MateriaalTypes';
END
ELSE
    PRINT 'Table MateriaalTypes already exists — skipping.';

-- ── Materialen ───────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Materialen')
BEGIN
    CREATE TABLE [Materialen] (
        [Id]             UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [MateriaalTypeId] UNIQUEIDENTIFIER NOT NULL,
        [Naam]           NVARCHAR(100)    NOT NULL,
        [Serienummer]    NVARCHAR(100)    NULL,
        [Notities]       NVARCHAR(500)    NULL,
        [AankoopDatum]   DATE             NULL,
        [CreatedAt]      DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]      DATETIME2         NULL,
        CONSTRAINT [PK_Materialen] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Materialen_MateriaalTypes_MateriaalTypeId]
            FOREIGN KEY ([MateriaalTypeId]) REFERENCES [MateriaalTypes] ([Id])
            ON DELETE CASCADE
    );

    CREATE INDEX [IX_Materialen_MateriaalTypeId] ON [Materialen] ([MateriaalTypeId]);

    PRINT 'Created table: Materialen';
END
ELSE
    PRINT 'Table Materialen already exists — skipping.';

-- ── Register in EF migration history ────────────────────────────────────────────
-- api-gateway migration
IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260405000000_AddMemberFieldsToUsers')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260405000000_AddMemberFieldsToUsers', '9.0.4');
    PRINT 'Registered migration: 20260405000000_AddMemberFieldsToUsers';
END

-- member-api migration (this script)
IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = @MigrationId)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (@MigrationId, '9.0.4');
    PRINT 'Registered migration: ' + @MigrationId;
END

-- Materialen tables migration
DECLARE @MateriaalMigrationId NVARCHAR(255) = 'AddMateriaalTables';
IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = @MateriaalMigrationId)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (@MateriaalMigrationId, '9.0.4');
    PRINT 'Registered migration: ' + @MateriaalMigrationId;
END

PRINT 'Migration [' + @MigrationId + '] completed successfully.';
GO

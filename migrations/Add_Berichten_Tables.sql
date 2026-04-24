-- =============================================================================
-- Migration: Add Berichten (messaging) tables
-- Date: 2026-04-23
-- Description:
--   1. Creates [Berichten] table — club messages/announcements
--   2. Creates [BerichtenLezingen] table — read-receipt tracking per member
--   3. Registers migration in __EFMigrationsHistory
--
-- Run via: sqlcmd -S localhost -d ScubaGatewayDb -i Add_Berichten_Tables.sql
-- =============================================================================

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @MigrationId NVARCHAR(255) = 'AddBerichtenTables';

IF EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = @MigrationId)
BEGIN
    PRINT 'Migration [' + @MigrationId + '] already applied. Skipping.';
    RETURN;
END

PRINT 'Applying migration: ' + @MigrationId;

-- ── Berichten ──────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Berichten')
BEGIN
    CREATE TABLE [Berichten] (
        [Id]             UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [ZenderId]       UNIQUEIDENTIFIER  NOT NULL,
        [Onderwerp]      NVARCHAR(200)     NOT NULL,
        [Inhoud]         NVARCHAR(MAX)     NOT NULL,
        [IsPinned]       BIT               NOT NULL DEFAULT 0,
        [AangemaaktOp]   DATETIME2         NOT NULL DEFAULT GETUTCDATE(),
        [BijgewerktOp]   DATETIME2         NULL,

        CONSTRAINT [PK_Berichten] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Berichten_Members_ZenderId]
            FOREIGN KEY ([ZenderId]) REFERENCES [Members]([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_Berichten_AangemaaktOp] ON [Berichten] ([AangemaaktOp]);
    CREATE INDEX [IX_Berichten_IsPinned]     ON [Berichten] ([IsPinned]);

    PRINT 'Created [Berichten] table';
END
ELSE
    PRINT '[Berichten] table already exists — skipping.';

-- ── BerichtenLezingen ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BerichtenLezingen')
BEGIN
    CREATE TABLE [BerichtenLezingen] (
        [Id]         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
        [BerichtId]  UNIQUEIDENTIFIER  NOT NULL,
        [LezerId]    UNIQUEIDENTIFIER  NOT NULL,
        [GelezenOp]  DATETIME2         NOT NULL DEFAULT GETUTCDATE(),

        CONSTRAINT [PK_BerichtenLezingen] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BerichtenLezingen_Berichten_BerichtId]
            FOREIGN KEY ([BerichtId]) REFERENCES [Berichten]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BerichtenLezingen_Members_LezerId]
            FOREIGN KEY ([LezerId]) REFERENCES [Members]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_BerichtenLezingen_BerichtId_LezerId]
            UNIQUE ([BerichtId], [LezerId])
    );

    CREATE INDEX [IX_BerichtenLezingen_LezerId] ON [BerichtenLezingen] ([LezerId]);

    PRINT 'Created [BerichtenLezingen] table';
END
ELSE
    PRINT '[BerichtenLezingen] table already exists — skipping.';

-- ── Register migration ─────────────────────────────────────────────────────────
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (@MigrationId, '9.0.0');

PRINT 'Migration [' + @MigrationId + '] completed successfully.';

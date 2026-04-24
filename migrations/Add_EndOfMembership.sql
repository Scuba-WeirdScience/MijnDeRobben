-- Migration: Add EndOfMembership column to Members
-- Run via: sqlcmd -S localhost -d ScubaGatewayDb -i Add_EndOfMembership.sql

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @MigrationId NVARCHAR(255) = 'AddEndOfMembership';

IF EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = @MigrationId)
BEGIN
    PRINT 'Migration [' + @MigrationId + '] already applied. Skipping.';
    RETURN;
END

ALTER TABLE [Members]
  ADD [EndOfMembership] DATE NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (@MigrationId, '9.0.0');

PRINT 'Migration [' + @MigrationId + '] applied successfully.';

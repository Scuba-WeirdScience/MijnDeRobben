# sync-to-staging.ps1
#
# Manually syncs production Firestore data to the staging project.
# Requires gcloud CLI to be installed and authenticated with an account
# that has:
#   - roles/datastore.importExportAdmin on dcderobben-d3536 (prod)
#   - roles/datastore.importExportAdmin on dcderobben-staging
#   - roles/storage.admin on gs://dcderobben-staging-exports
#
# Usage:
#   .\sync-to-staging.ps1

$ErrorActionPreference = 'Stop'

$PROD_PROJECT   = 'dcderobben-d3536'
$STAGING_PROJECT = 'dcderobben-staging'
$BUCKET          = 'gs://dcderobben-staging-exports/prod-seed'

Write-Host "==> Exporting production Firestore to $BUCKET ..." -ForegroundColor Cyan
gcloud firestore export $BUCKET --project=$PROD_PROJECT

Write-Host "==> Importing into staging project $STAGING_PROJECT ..." -ForegroundColor Cyan
gcloud firestore import $BUCKET --project=$STAGING_PROJECT

Write-Host "✅ Staging sync complete." -ForegroundColor Green

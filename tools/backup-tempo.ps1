param([string]$ProjectRef = 'wyllcdqsnpwadtthymeb', [string]$OutputDirectory = (Join-Path $env:LOCALAPPDATA 'Tempo\Backups'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskBackupSql = @'
select jsonb_build_object(
 'created_at',now(),
 'tempo_workspaces',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_workspaces t),
 'tempo_members',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_members t),
 'tempo_invites',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_invites t),
 'tempo_notifications',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_notifications t),
 'tempo_time_approvals',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_time_approvals t),
 'tempo_messages',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_messages t),
 'tempo_break_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.tempo_break_events t)
) as backup;
'@
$taskQueryPath = [IO.Path]::GetTempFileName()
try {
  [IO.File]::WriteAllText($taskQueryPath, $taskBackupSql, [Text.UTF8Encoding]::new($false))
  $taskBackupOutput = (& npx.cmd supabase db query --linked --project-ref $ProjectRef --file $taskQueryPath --output json) -join "`n"
} finally { Remove-Item -LiteralPath $taskQueryPath }
if ($LASTEXITCODE -ne 0) { throw 'The backup query failed. No migration should run.' }
$taskBackupJson = $taskBackupOutput.Substring($taskBackupOutput.IndexOf('{')) | ConvertFrom-Json
$taskBackupPayload = [Text.Encoding]::UTF8.GetBytes(($taskBackupJson.rows[0].backup | ConvertTo-Json -Depth 100 -Compress))
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$taskEncrypted = [Security.Cryptography.ProtectedData]::Protect($taskBackupPayload, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
[void](New-Item -ItemType Directory -Path $OutputDirectory -Force)
$taskBackupPath = Join-Path $OutputDirectory ('tempo-pre-planning-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.dpapi')
[IO.File]::WriteAllBytes($taskBackupPath, $taskEncrypted)
$taskVerified = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskBackupPath), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskBackupPayload)) -ne [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($taskVerified))) { throw 'Encrypted backup verification failed.' }
Write-Output ('Encrypted backup saved and decryption verified: ' + $taskBackupPath)
Write-Output 'This is a Tempo-record backup, not a full database/Auth/Storage backup. It can be decrypted only by this Windows account.'

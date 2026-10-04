"""Activate Tempo's server worker through the authenticated Supabase CLI.

Secrets are generated locally, never printed, and temporary files are removed.
Requires the planning migration and CLI access to the intended project.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import urllib.error
import urllib.request

project = "wyllcdqsnpwadtthymeb"
project_url = f"https://{project}.supabase.co"
secret = secrets.token_hex(32)
temp_root = Path(tempfile.gettempdir()).resolve()
temp_dir = Path(tempfile.mkdtemp(prefix="tempo-push-", dir=temp_root)).resolve()
assert temp_dir.parent == temp_root and temp_dir.name.startswith("tempo-push-")


def cli(arguments):
    result = subprocess.run(
        ["npx.cmd", "supabase", *arguments], capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=False,
    )
    if result.returncode:
        message = (result.stderr or result.stdout).replace(secret, "[redacted]")
        raise RuntimeError(message[:1200])
    return result.stdout


try:
    env_file = temp_dir / "push.env"
    env_file.write_text(f"TEMPO_PUSH_SECRET={secret}\n", encoding="utf-8")
    cli(["secrets", "set", "--project-ref", project, "--env-file", str(env_file)])
    print("Server push secret configured without exposing it.", flush=True)
    cli(["functions", "deploy", "tempo-push", "--project-ref", project, "--use-api", "--no-verify-jwt"])
    print("tempo-push Edge Function deployed.", flush=True)
    sql_file = temp_dir / "schedule.sql"
    sql_file.write_text(f"""
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $setup$ declare existing uuid; begin
 select id into existing from vault.secrets where name='tempo_push_secret';
 if existing is null then perform vault.create_secret('{secret}','tempo_push_secret');
 else perform vault.update_secret(existing,'{secret}'); end if;
 select id into existing from vault.secrets where name='tempo_project_url';
 if existing is null then perform vault.create_secret('{project_url}','tempo_project_url');
 else perform vault.update_secret(existing,'{project_url}'); end if;
end; $setup$;
select cron.schedule('tempo-push-every-minute','* * * * *',$job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='tempo_project_url') || '/functions/v1/tempo-push',
  headers := jsonb_build_object('Content-Type','application/json','x-tempo-push-secret',
   (select decrypted_secret from vault.decrypted_secrets where name='tempo_push_secret')),
  body := '{{}}'::jsonb,timeout_milliseconds := 20000
 );
$job$);
commit;
""", encoding="utf-8")
    cli(["db", "query", "--linked", "--project-ref", project, "--file", str(sql_file), "--output", "json"])
    print("Minute-by-minute push delivery and receipt checks scheduled; secret held in Vault.", flush=True)
    # Test access enforcement without sending any notification.
    request = urllib.request.Request(project_url + "/functions/v1/tempo-push", data=b"{}", method="POST")
    try:
        urllib.request.urlopen(request, timeout=20)
        raise RuntimeError("Push worker accepted an unauthenticated request")
    except urllib.error.HTTPError as error:
        if error.code != 401:
            raise RuntimeError(f"Access check returned HTTP {error.code}") from None
    print("Verified: unauthenticated calls receive HTTP 401.", flush=True)
finally:
    for created_file in temp_dir.iterdir():
        assert created_file.resolve().parent == temp_dir and created_file.is_file()
        created_file.unlink()
    temp_dir.rmdir()

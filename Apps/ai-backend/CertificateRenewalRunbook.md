# AI Backend — Certificate Renewal Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** operators managing TLS for the production stack
**Date:** 2026-07-03

---

## Where certs live

`nginx.conf` (repo root) terminates TLS and reads:
```
ssl_certificate     /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```
mounted read-only from `./certs` on the host (`docker-compose.production.yml`'s `nginx` service). `nginx.conf` itself carries a comment: *"Replace with certs issued for your domain (e.g. via certbot/Let's Encrypt)"* — no issuance or renewal automation exists in this repo today (see Known gaps).

## Signal

- Browser/client TLS warnings, or automated cert-expiry monitoring (external to this stack — none is wired up today) flags an approaching expiry.
- Manual check:
  ```bash
  openssl x509 -enddate -noout -in certs/fullchain.pem
  ```

## Renewal procedure (manual, until automation exists)

1. **Obtain new cert material** for the domain (e.g. `certbot certonly` using whatever ACME challenge method fits the host's network setup — not automated here; this repo assumes certs are produced externally and dropped into `./certs`).
2. **Verify the new files before installing:**
   ```bash
   openssl x509 -noout -text -in fullchain.pem | grep -A2 "Subject:"
   openssl x509 -enddate -noout -in fullchain.pem
   openssl rsa -check -noout -in privkey.pem   # or the appropriate key-type check
   ```
3. **Replace in place:**
   ```bash
   cp fullchain.pem certs/fullchain.pem
   cp privkey.pem certs/privkey.pem
   ```
4. **Reload nginx without downtime** (nginx supports a hot config/cert reload — a full container restart is not required):
   ```bash
   docker compose -f docker-compose.production.yml exec nginx nginx -s reload
   ```
5. **Verify:**
   ```bash
   cd Infrastructure/scripts
   EDGE_URL=https://<domain> ./post-deploy-verify.sh
   openssl s_client -connect <domain>:443 -servername <domain> </dev/null 2>/dev/null | openssl x509 -noout -enddate
   ```
   Confirm the served certificate's expiry date matches the new file, not the old one (a stale nginx worker that didn't pick up the reload would still serve the old cert).

## Rollback

Keep the previous `fullchain.pem`/`privkey.pem` aside before overwriting (`cp certs/fullchain.pem certs/fullchain.pem.bak`) — if the new cert is invalid (wrong domain, expired, chain incomplete) and clients start failing TLS handshakes, restore the backup files and `nginx -s reload` again. This is a config-only rollback, no relation to `RollbackProcedure.md`'s image-based rollback.

## Known gaps

- **No automated renewal.** No `certbot renew` cron/systemd-timer/CI job exists in this repo. Certificates will silently expire without operator action. This is the single highest-priority gap in this runbook — recommend wiring `certbot`'s built-in renewal automation (with a `--deploy-hook` that runs step 4 above) before Closed Beta, since a lapsed cert is a full outage for all HTTPS clients.
- **No expiry alerting.** Nothing in `ai-backend-alerts.yml` or elsewhere monitors certificate expiry. An external check (e.g. a blackbox exporter probe, or a simple scheduled `openssl x509 -checkend` job) is needed.
- **No cert backup in `backup.sh`.** `BackupRunbook.md`'s asset table does not include `./certs` — a host-loss scenario requires re-issuing or restoring certs from wherever they were originally obtained, not from this stack's own backups.

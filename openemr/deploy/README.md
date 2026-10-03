# OpenRx deploy scripts

Tooling for building and shipping OpenRx to the production server
(`dev@94.250.201.58`). **See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full guide.**

Quick reference:

```bash
cd ..                                    # openemr/
bash deploy/deploy-local.sh              # build + deploy backend AND frontend
bash deploy/deploy-local.sh --frontend   # frontend only
bash deploy/deploy-local.sh --backend    # backend only
bash deploy/openrx.sh                    # interactive control center
```

| File | Where it runs | Purpose |
|------|---------------|---------|
| `deploy-local.sh` | your machine | build both, tar, `scp` to server, run `deploy.sh` |
| `deploy.sh`       | server        | validate, back up, atomic swap, PM2 restart, prune |
| `rollback.sh`     | server        | restore a previous `dist` and restart PM2 |
| `prune.sh`        | server        | delete old backups / releases (keeps newest N) |
| `openrx.sh`       | your machine  | interactive menu (build/deploy/monitor/rollback) |
| `ecosystem.config.js` | server    | PM2 app descriptor (`openrx-backend`) |

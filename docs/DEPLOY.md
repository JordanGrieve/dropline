# Deploying to one small VPS

The whole system on one machine with Docker Compose: two app instances,
the nginx edge, Postgres, Redis, Caddy for TLS, and a nightly reset. About
£4 a month on a Hetzner CX22 (2 vCPU, 4 GB). An hour, most of it waiting.

This replaces the AWS plan. The shape is the same as the cluster that
produced the numbers in [results/NOTES.md](results/NOTES.md); only the
machine differs. That is said plainly in the writeup, not implied away.

## Before you start

- A domain or subdomain you control, say `dropline.jordangrieve.com`.
- An SSH key on this machine.
- A Hetzner account. Any provider with a 4 GB Ubuntu VPS works the same.

## 1. The server, 10 minutes

Create a **CX22** (or the nearest 2 vCPU / 4 GB shape) with **Ubuntu 24.04**,
your SSH key, and the firewall allowing **22, 80 and 443** only. Note the IP.

Point the subdomain's **A record** at that IP now. Caddy needs it resolving
before the first start.

Then, on the server:

```bash
ssh root@<ip>
apt-get update && apt-get -y upgrade
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" dropline && usermod -aG docker dropline
mkdir -p /home/dropline/.ssh && cp ~/.ssh/authorized_keys /home/dropline/.ssh/ && chown -R dropline:dropline /home/dropline/.ssh
```

From here on, work as `dropline`, not root: `ssh dropline@<ip>`.

## 2. The code and the secrets, 5 minutes

```bash
git clone https://github.com/JordanGrieve/dropline.git && cd dropline
cp infra/.env.example infra/.env
nano infra/.env     # DOMAIN=your subdomain, DB_PASSWORD=$(openssl rand -base64 24)
```

`infra/.env` is ignored by git. Nothing secret is in the repository.

## 3. Start it, 15 minutes of building

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml up -d --build
```

The first build downloads Gradle and the dependencies inside Docker and
takes a while on 2 vCPUs. Watch it with:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml logs -f --tail=50
```

When `app1` and `app2` log `Started DroplineApplication`, open
`https://<your domain>`. Caddy will have fetched the certificate.

The seed opens the drop two minutes after the database is first created.
To open it now and fill the stock:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml exec -T postgres \
  psql -U dropline -d dropline < load/reset.sql
```

The `nightly-reset` service does the same once a day from then on.

## 4. Check it, 5 minutes

- The page loads over HTTPS and the counter shows 100.
- Buy one. The counter falls on a second browser without a refresh.
- `/backend`: Simulate 200 buyers. Exactly the stock sells; the rest are
  turned away. Press it again quickly and the edge answers 429: the demo
  endpoints are limited to one request a second per address.
- `https://<domain>/actuator/health` says UP; `/actuator/metrics` is 404.
  Only health is public.

## Grafana, optional

The observability stack wants about 1.5 GB. On a 4 GB box it fits beside
everything else, just; start it only if you want the dashboard live:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml --profile observability up -d
```

It is bound to the server's localhost only. Reach it through a tunnel:

```bash
ssh -L 3000:localhost:3000 dropline@<ip>
```

then `http://localhost:3000/d/dropline/dropline` on your own machine. Never
expose port 3000: Grafana in this image is anonymous admin.

## Updating

```bash
cd ~/dropline && git pull
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml up -d --build
```

Flyway runs any new migrations on start. The app instances are recreated
one after another by Compose, so the page stays up through it.

## Memory, for the record

| Service | Limit |
| --- | --- |
| app1, app2 | 768 MB each, JVM at 70 % of that |
| postgres | 512 MB |
| redis | 128 MB, 64 MB of data |
| edge, caddy | 128 MB each |
| otel-lgtm, optional | 1.5 GB |

Without Grafana that is about 2.4 GB on a 4 GB box. With it, about 3.9 GB,
which is why it is a profile and not a default.

## Tearing it down

Delete the server in the Hetzner console. The data goes with it; nothing
here is worth keeping beyond the repository and `docs/results/`.

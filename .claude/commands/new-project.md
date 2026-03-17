Yeni bir proje icin Claude Code workflow yapisi kuracaksin. MEVCUT DIZINDE calisacaksin (dosyalar zaten burada olusturulacak). Asagidaki adimlari sirasiyla uygula:

---

## Adim 1: Bilgi Topla

AskUserQuestion tool'unu kullanarak asagidaki sorulari TEK SEFERDE sor:

**Soru 1** (header: "Proje Adi"):
- Soru: "Projenin adi ne?"
- Secenekler: "My App", "Dashboard Pro", "API Gateway", (Other)
- multiSelect: false

**Soru 2** (header: "Prefix"):
- Soru: "Meta dizin prefix'i ne olsun? (ornek: myapp -> myapp-tasks/, myapp-docs/)"
- Secenekler: "app", "project", "my", (Other)
- multiSelect: false

**Soru 3** (header: "Tech Stack"):
- Soru: "Hangi tech stack kullanilacak?"
- multiSelect: false
- Secenekler:
  - "Next.js Full-Stack" — aciklama: Next.js App Router + API Routes + Prisma + Tailwind
  - "NestJS + Next.js" — aciklama: NestJS backend + Next.js frontend + Prisma + Tailwind
  - "Express + React" — aciklama: Express.js backend + React/Vite frontend

---

## Adim 2: Ek Detaylar

Ilk cevaplara gore 2. tur sorular sor (AskUserQuestion, TEK SEFERDE 4 soru):

**Soru 1** (header: "Monorepo"):
- Soru: "Monorepo yapisinda mi olacak?"
- multiSelect: false
- Secenekler:
  - "pnpm + Turborepo (Recommended)" — aciklama: pnpm workspaces + Turborepo build orchestration
  - "npm/bun workspaces" — aciklama: npm veya bun workspaces
  - "Tek paket" — aciklama: Monorepo yok, tek package.json

**Soru 2** (header: "Veritabani"):
- Soru: "Hangi veritabani kullanilacak?"
- multiSelect: false
- Secenekler:
  - "PostgreSQL + Prisma (Recommended)" — aciklama: En yaygin secim, type-safe ORM
  - "PostgreSQL + Drizzle" — aciklama: Lightweight, SQL-first ORM
  - "SQLite + Prisma" — aciklama: Dosya tabanli, basit projeler icin

**Soru 3** (header: "Ekstralar"):
- Soru: "Hangi ekstra ozellikler eklensin?"
- multiSelect: true
- Secenekler:
  - "Docker" — aciklama: docker-compose ile DB, Redis, vs.
  - "Redis/BullMQ" — aciklama: Cache + queue sistemi
  - "Auth (JWT)" — aciklama: Kimlik dogrulama altyapisi

**Soru 4** (header: "Phase Sayisi"):
- Soru: "Kac phase planlansin?"
- multiSelect: false
- Secenekler:
  - "3 phase" — aciklama: Setup + Core + Frontend (kucuk proje)
  - "5 phase" — aciklama: Setup + Core + Business + Frontend + Deploy (orta proje)
  - "8 phase" — aciklama: Setup + Core + Business + Advanced + Channels + Frontend + Test + Deploy (buyuk proje)

---

## Adim 3: Template Temizligi

Mevcut dizinde template'den kalma dosyalari temizle:

```bash
rm -rf _tasks _docs _config _plans
rm -f BLUEPRINT.md setup.sh
rm -f CLAUDE.md
```

---

## Adim 4: Dosya Olusturma

Tum cevaplar toplandiktan ve temizlik yapildiktan sonra dosyalari olustur.

---

## ONEMLI KURALLAR

- Hicbir adimi atlama
- Tum dosyalar MEVCUT DIZINDE olusturulur
- HICBIR PLACEHOLDER birakma
- protect-files.sh executable olsun (`chmod +x`)

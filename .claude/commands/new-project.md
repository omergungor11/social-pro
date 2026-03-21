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

Bu adimi MUTLAKA dosya olusturmadan ONCE yap.

---

## Adim 4: Dosya Olusturma

Tum cevaplar toplandiktan ve temizlik yapildiktan sonra asagidaki dosyalari SIFIRDAN OLUSTUR.
Tum dosyalar MEVCUT DIZINDE (pwd) olusturulur.

### 4.1: Dizin Yapisi

```bash
mkdir -p .claude/{commands,hooks}
mkdir -p [PREFIX]-tasks/{phases,active}
mkdir -p [PREFIX]-config
mkdir -p [PREFIX]-docs
mkdir -p [PREFIX]-plans
```

### 4.2: .claude/hooks/protect-files.sh

Hassas dosyalari koruyan PreToolUse hook'u olustur ve `chmod +x` yap.
.env, lock files, .git/, credentials dosyalarini bloklayan script.

### 4.3: .claude/settings.local.json

Tech stack'e gore permissions ve hooks yapilandirmasi.
Temel git, docker, paket yoneticisi izinleri + protect-files hook'u.
Prisma secildiyse PostToolUse'a auto-generate hook ekle.

### 4.4: Slash Commands (4 adet)

cold-start.md, git-full.md, turn-off.md, local-testing.md — [PREFIX] ile ozellestirilmis.

### 4.5: Task Index ([PREFIX]-tasks/task-index.md)

Phase sayisina gore dashboard tablosu + Phase 0 (7 task: monorepo init, meta dirs, claude setup, CLAUDE.md, docker, lint/format/ts, git init).

### 4.6: Phase 0 Detay ([PREFIX]-tasks/phases/phase-0.md)

7 task'in acceptance criteria ile detayli aciklamasi.

### 4.7: Session Notes ([PREFIX]-tasks/active/session-notes.md)

Bos template.

### 4.8: Config Dosyalari

- [PREFIX]-config/workflow.md — task workflow kurallari
- [PREFIX]-config/conventions.md — tech stack'e ozel kod standartlari
- [PREFIX]-config/tech-stack.md — teknolojiler + versiyonlar
- [PREFIX]-config/agent-instructions.md — sub-agent rolleri ve orchestration

### 4.9: Docs

- [PREFIX]-docs/MEMORY.md — proje hafizasi
- [PREFIX]-docs/CHANGELOG.md — degisiklik kaydi

### 4.10: CLAUDE.md

Tamamen ozellestirilmis ana konfigurasyon — hicbir placeholder kalmayacak.

### 4.11: .gitignore

Tech stack'e uygun .gitignore.

---

## Adim 5: Dogrulama

1. Dosya listesini goster
2. CLAUDE.md icerigini goster
3. Task dashboard'u goster
4. "Proje yapisi hazir!" mesaji ver

---

## ONEMLI KURALLAR

- Hicbir adimi atlama, sirasiyla uygula
- Kullanici "Other" secerse, verdigi degeri kullan
- Tum dosyalar MEVCUT DIZINDE olusturulur
- HICBIR PLACEHOLDER birakma — hepsi gercek degerlerle degistirilmis olmali
- Adim 3'teki template temizligini MUTLAKA yap
- protect-files.sh ve varsa post-edit-prisma.sh executable olsun
- new-project.md slash command'ina DOKUNMA

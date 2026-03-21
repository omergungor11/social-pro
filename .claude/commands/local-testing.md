Local dev ortamini ayaga kaldir ve tum servisleri dogrula:

0. **Port temizligi** (ONCELIKLI):
   - `lsof -iTCP:3000 -sTCP:LISTEN` ve `lsof -iTCP:4000 -sTCP:LISTEN` kontrol et
   - Eski process'leri temizle

1. **Altyapi servisleri**:
   - `docker compose ps` ile container durumunu kontrol et
   - Kapaliysa `docker compose up -d` ile baslat
   - PostgreSQL, Redis, MinIO, MailHog healthy olmasini bekle

2. **Veritabani**:
   - `pnpm db:generate` — Prisma client guncel mi?
   - `npx prisma migrate deploy` — pending migration var mi?
   - Seed data var mi? Yoksa `pnpm db:seed` calistir

3. **Backend (NestJS)**:
   - `pnpm --filter @social-pro/api dev` ile baslat
   - `curl http://localhost:4000/api/v1/health` ile health check
   - Swagger: http://localhost:4000/api/docs

4. **Frontend (Next.js)**:
   - `pnpm --filter @social-pro/web dev` ile baslat
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` ile kontrol

5. **Ozet rapor ver**:

   | Servis | URL | Durum |
   |--------|-----|-------|
   | Frontend | http://localhost:3000 | OK/FAIL |
   | API | http://localhost:4000 | OK/FAIL |
   | Swagger | http://localhost:4000/api/docs | OK/FAIL |
   | PostgreSQL | localhost:5432 | OK/FAIL |
   | Redis | localhost:6379 | OK/FAIL |
   | MinIO | localhost:9000 | OK/FAIL |
   | MailHog | localhost:8025 | OK/FAIL |

   "Test ortami hazir." veya bulunan hatalari bildir

NOT: Servisleri `nohup` ile arka planda baslatarak persistent tut.

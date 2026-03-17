Tum degisiklikleri stage, commit ve push et:

1. `git status` — degisen dosyalari gor
2. `git diff --stat` — degisiklik ozeti
3. `sp-tasks/task-index.md` oku — task durumu kontrol et
4. Bitmis IN_PROGRESS task varsa → COMPLETED yap, dashboard guncelle, CHANGELOG'a ekle
5. .env dosyalarinin stage'lenmediginden emin ol
6. Dosyalari stage et (.env, credentials haric)
7. Commit mesaji yaz: `feat(TASK-XXX): aciklama` + Co-Authored-By
8. `git push` ile push et
9. Son commit'leri goster

NOT: .env, credentials veya secret iceren dosyalari ASLA commit etme.

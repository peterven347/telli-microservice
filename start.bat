@echo off
cls
start npm run start:dev --watch gateway
<<<<<<< HEAD
timeout /t 1 /nobreak
cls
start npm run start:dev --watch chat
timeout /t 1 /nobreak
cls
start npm run start:dev --watch livestream
timeout /t 1 /nobreak
cls
start npm run start:dev --watch post
timeout /t 1 /nobreak
cls
start npm run start:dev --watch user
timeout /t 1 /nobreak
cls
=======
timeout /t 3 /nobreak
cls
start npm run start:dev --watch chat
timeout /t 3 /nobreak
cls
start npm run start:dev --watch post
timeout /t 3 /nobreak
cls
start npm run start:dev --watch user
timeout /t 3 /nobreak
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

@echo off
cls
start npm run start:dev --watch gateway
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

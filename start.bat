@echo off
cls
start npm run start:dev --watch gateway
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

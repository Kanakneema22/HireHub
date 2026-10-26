@echo off
setlocal
cd /d "%~dp0"
for %%D in (
  client\src\components
  client\src\pages
  client\src\app
  client\src\features
  client\src\services
  server\src\config
  server\src\controllers
  server\src\models
  server\src\routes
  server\src\middleware
) do if not exist "%%D" mkdir "%%D"
for %%F in (
  client\src\App.jsx
  client\src\main.jsx
  client\src\index.css
  client\package.json
  server\src\app.js
  server\src\server.js
  server\.env
  server\.env.example
  server\package.json
  .env
  .env.example
  .gitignore
  README.md
  package.json
) do if not exist "%%F" type nul > "%%F"
echo HireHub folders and files are ready.

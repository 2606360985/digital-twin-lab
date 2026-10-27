@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 数字孪生教学实验
node serve.mjs
pause

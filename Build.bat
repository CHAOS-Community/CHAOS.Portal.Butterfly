@echo off

rem Needed to update variable in loop
setlocal enabledelayedexpansion

rem Set current dir to bat file location
CD /D %~dp0

for %%i in (src\app\CHAOS.Portal.Butterfly\*.ts) do (set files=!files!%%~i )

echo Compiling

tsc --declaration --out build\Butterfly.js %files%

echo Minifing

tools\AjaxMin\AjaxMin.exe -clobber -rename:none build\Butterfly.js -out build\Butterfly.min.js

echo Done
!macro NSIS_HOOK_POSTINSTALL

  Var /GLOBAL SecondaryInstaller
  StrCpy $SecondaryInstaller "installer.exe"

  Sleep 1000

  ${If} ${FileExists} "$INSTDIR\$SecondaryInstaller"
    DetailPrint "Executing $SecondaryInstaller as admin..."

    SetOutPath "$INSTDIR"

    ExecShell "runas" "$INSTDIR\$SecondaryInstaller"
  ${Else}
    DetailPrint "Secondary installer not found."
  ${EndIf}

!macroend
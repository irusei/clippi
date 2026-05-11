!macro NSIS_HOOK_POSTINSTALL
  Var /GLOBAL SecondaryInstaller
  StrCpy $SecondaryInstaller "installer.exe"

  ${If} ${FileExists} "$INSTDIR\$SecondaryInstaller"
    DetailPrint "Executing $SecondaryInstaller..."
    
    ExecWait '"$INSTDIR\$SecondaryInstaller" /passive' $0

    ${If} $0 == 0
      DetailPrint "Installation successful."
    ${Else}
      DetailPrint "Installation failed with code: $0"
    ${EndIf}

    Delete "$INSTDIR\$SecondaryInstaller"
  ${EndIf}
!macroend
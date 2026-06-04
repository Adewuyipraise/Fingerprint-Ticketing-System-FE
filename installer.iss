; =========================================
; CanteenTrack Installer
; =========================================

[Setup]
AppName=CanteenTrack
AppVersion=1.0.1
DefaultDirName={commonpf}\CanteenTrack
DefaultGroupName=CanteenTrack
OutputDir=.\installer-output
OutputBaseFilename=CanteenTrack-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

; ---------- BRANDING ----------
SetupIconFile=assets\PRTOappicon.ico
WizardImageFile=assets\PRTOappicon.bmp
WizardSmallImageFile=assets\PRTOappicon.bmp


; =========================================
; FILES
; =========================================
[Files]
Source: "canteen-ticket-backend\*"; DestDir: "{app}\backend"; Flags: recursesubdirs ignoreversion
Source: "canteen-ticket\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs ignoreversion
Source: "start-all.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: recursesubdirs ignoreversion


; =========================================
; SHORTCUTS
; =========================================
[Icons]
Name: "{group}\Start CanteenTrack"; \
    Filename: "{app}\start.bat"; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\assets\PRTOappicon.ico"

Name: "{commondesktop}\CanteenTrack"; \
    Filename: "{app}\start.bat"; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\assets\PRTOappicon.ico"


; =========================================
; AUTO RUN AFTER INSTALL
; =========================================
[Run]
Filename: "{app}\start-all.bat"; \
Description: "Start CanteenTrack"; \
Flags: nowait postinstall skipifsilent


; =========================================
; CODE
; =========================================
[Code]

var
  DBServerPage: TInputQueryWizardPage;
  DBCredPage: TInputQueryWizardPage;
  AppPage: TInputQueryWizardPage;
  ApiHostPage: TInputQueryWizardPage;


procedure InitializeWizard;
begin

  { PAGE 1 - DB SERVER }
  DBServerPage :=
    CreateInputQueryPage(
      wpWelcome,
      'Database Server',
      'PostgreSQL Server Configuration',
      'Enter your PostgreSQL server information'
    );

  DBServerPage.Add('DB Host:', False);
  DBServerPage.Add('DB Port:', False);

  DBServerPage.Values[0] := 'localhost';
  DBServerPage.Values[1] := '5432';


  { PAGE 2 - DB LOGIN }
  DBCredPage :=
    CreateInputQueryPage(
      DBServerPage.ID,
      'Database Credentials',
      'PostgreSQL Login',
      'Enter your PostgreSQL username and password'
    );

  DBCredPage.Add('DB User:', False);
  DBCredPage.Add('DB Password:', True);

  DBCredPage.Values[0] := 'postgres';


  { PAGE 3 - APP SETTINGS }
  AppPage :=
    CreateInputQueryPage(
      DBCredPage.ID,
      'Application Settings',
      'CanteenTrack Configuration',
      'Configure database name and backend port'
    );

  AppPage.Add('Database Name:', False);
  AppPage.Add('Backend Port:', False);

  AppPage.Values[0] := 'fingerprint_ticket_db';
  AppPage.Values[1] := '3001';


  { PAGE 4 - FRONTEND API }
  ApiHostPage :=
    CreateInputQueryPage(
      AppPage.ID,
      'Frontend Configuration',
      'Frontend API Settings',
      'Enter the server IP or hostname users will access from browser'
    );

  ApiHostPage.Add('Server IP / Hostname:', False);
  ApiHostPage.Values[0] := 'localhost';

end;


procedure CreateBackendEnv;
var
  EnvText: string;
begin
  EnvText :=
    'DB_HOST=' + DBServerPage.Values[0] + #13#10 +
    'DB_PORT=' + DBServerPage.Values[1] + #13#10 +
    'DB_USER=' + DBCredPage.Values[0] + #13#10 +
    'DB_PASSWORD=' + DBCredPage.Values[1] + #13#10 +
    'DB_NAME=' + AppPage.Values[0] + #13#10 +
    'PORT=' + AppPage.Values[1] + #13#10 +
    'NODE_ENV=production';

  SaveStringToFile(
    ExpandConstant('{app}\backend\.env'),
    EnvText,
    False
  );
end;


procedure CreateFrontendEnv;
var
  FrontEnv: string;
begin
  FrontEnv :=
    'NEXT_PUBLIC_API_URL=http://' +
    ApiHostPage.Values[0] +
    ':' +
    AppPage.Values[1] +
    ''#13#10;

  SaveStringToFile(
    ExpandConstant('{app}\frontend\.env.local'),
    FrontEnv,
    False
  );
end;


procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateBackendEnv;
    CreateFrontendEnv;
  end;
end;
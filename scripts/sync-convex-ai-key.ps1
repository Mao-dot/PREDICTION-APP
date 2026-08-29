$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'No se encontró .env.local. Crea el archivo desde .env.example.'
}

$values = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $values[$matches[1]] = $matches[2]
  }
}

$apiKey = $values['LLM_API_KEY']
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw 'Agrega tu clave después de LLM_API_KEY= en .env.local y vuelve a ejecutar este comando.'
}

function Set-ConvexEnvValue([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  & npx convex env set $name $value
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo configurar $name en Convex."
  }
}

Set-ConvexEnvValue 'LLM_API_KEY' $apiKey
Set-ConvexEnvValue 'LLM_MODEL' $values['LLM_MODEL']
Set-ConvexEnvValue 'LLM_API_URL' $values['LLM_API_URL']

Write-Host 'La clave de IA quedó configurada en el entorno de desarrollo de Convex.'

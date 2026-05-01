param(
  [string]$AwsRegion = "ap-southeast-2",
  [string]$AccountId = "604545443541",
  [string]$Prefix = "calbook-serverless"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\..\.."
& "$root\services\core-api\enable-https.ps1" -AwsRegion $AwsRegion -AccountId $AccountId -Prefix $Prefix

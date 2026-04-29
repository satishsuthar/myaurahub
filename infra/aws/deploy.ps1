param(
  [Parameter(Mandatory = $true)][string]$AwsRegion,
  [Parameter(Mandatory = $true)][string]$AccountId,
  [string]$StackName = "coaching-saas-calendar",
  [string]$DbPassword,
  [string]$JwtSecret
)

$ErrorActionPreference = "Stop"

if (-not $DbPassword) {
  $DbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
}

if (-not $JwtSecret) {
  $JwtSecret = "$([guid]::NewGuid())$([guid]::NewGuid())$([guid]::NewGuid())"
}

$apiRepo = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/coaching-saas-api"
$frontendRepo = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/coaching-saas-frontend"

function Ensure-EcrRepository {
  param([string]$Name)

  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  aws ecr describe-repositories --repository-names $Name --region $AwsRegion *> $null
  $exists = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $oldPreference

  if (-not $exists) {
    aws ecr create-repository --repository-name $Name --region $AwsRegion
  }
}

Ensure-EcrRepository "coaching-saas-api"
Ensure-EcrRepository "coaching-saas-frontend"

aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"

$apiImage = "${apiRepo}:latest"
$frontendImage = "${frontendRepo}:latest"

docker build -t $apiImage -f CoachingSaaS.Api/Dockerfile .
if ($LASTEXITCODE -ne 0) { throw "API image build failed." }
docker push $apiImage
if ($LASTEXITCODE -ne 0) { throw "API image push failed." }

docker build -t $frontendImage -f frontend/Dockerfile --build-arg "VITE_API_BASE_URL=/" .
if ($LASTEXITCODE -ne 0) { throw "Frontend image build failed." }
docker push $frontendImage
if ($LASTEXITCODE -ne 0) { throw "Frontend image push failed." }

aws cloudformation deploy `
  --region $AwsRegion `
  --stack-name $StackName `
  --template-file infra/aws/cloudformation.yml `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides ApiImage="$apiImage" FrontendImage="$frontendImage" DbPassword="$DbPassword" JwtSecret="$JwtSecret"

aws cloudformation describe-stacks --region $AwsRegion --stack-name $StackName --query "Stacks[0].Outputs"

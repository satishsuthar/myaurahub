param(
  [string]$AwsRegion = "ap-southeast-2",
  [string]$AccountId = "604545443541",
  [string]$Prefix = "calbook-serverless"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\..\.."
$build = Join-Path $root "serverless\aws\build"
$zip = Join-Path $build "lambda.zip"
$tableName = "$Prefix-data"
$roleName = "$Prefix-lambda-role"
$functionName = "$Prefix-api"
$apiName = "$Prefix-http-api"
$bucketName = "$Prefix-frontend-$AccountId-$AwsRegion"
$tags = @("Key=Project,Value=calbook", "Key=App,Value=calbook")
$sessionSecret = "$([guid]::NewGuid())$([guid]::NewGuid())$([guid]::NewGuid())"

function Test-AwsCommand {
  param([scriptblock]$Command)
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $Command *> $null
  $ok = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $oldPreference
  return $ok
}

New-Item -ItemType Directory -Force -Path $build | Out-Null
Compress-Archive -Path "$PSScriptRoot\app.py" -DestinationPath $zip -Force

if (-not (Test-AwsCommand { aws dynamodb describe-table --region $AwsRegion --table-name $tableName })) {
  aws dynamodb create-table --region $AwsRegion --table-name $tableName --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST --tags $tags
  aws dynamodb wait table-exists --region $AwsRegion --table-name $tableName
}

$trust = Join-Path $build "trust.json"
@'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
'@ | Set-Content -Path $trust -Encoding ascii

if (-not (Test-AwsCommand { aws iam get-role --role-name $roleName })) {
  aws iam create-role --role-name $roleName --assume-role-policy-document "file://$trust" --tags $tags
  aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
}

$policy = Join-Path $build "policy.json"
@"
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:Query","dynamodb:DeleteItem","dynamodb:BatchWriteItem","dynamodb:UpdateItem"],"Resource":"arn:aws:dynamodb:${AwsRegion}:${AccountId}:table/$tableName"}]}
"@ | Set-Content -Path $policy -Encoding ascii
aws iam put-role-policy --role-name $roleName --policy-name "$Prefix-dynamodb" --policy-document "file://$policy"
Start-Sleep -Seconds 10

$roleArn = "arn:aws:iam::${AccountId}:role/$roleName"
if (-not (Test-AwsCommand { aws lambda get-function --region $AwsRegion --function-name $functionName })) {
  aws lambda create-function --region $AwsRegion --function-name $functionName --runtime python3.12 --role $roleArn --handler app.handler --zip-file "fileb://$zip" --timeout 30 --memory-size 256 --environment "Variables={TABLE_NAME=$tableName,SESSION_SECRET=$sessionSecret}" --tags Project=calbook,App=calbook
} else {
  $existingSecret = aws lambda get-function-configuration --region $AwsRegion --function-name $functionName --query "Environment.Variables.SESSION_SECRET" --output text
  if ($existingSecret -and $existingSecret -ne "None") {
    $sessionSecret = $existingSecret
  }
  aws lambda update-function-code --region $AwsRegion --function-name $functionName --zip-file "fileb://$zip"
  aws lambda wait function-updated --region $AwsRegion --function-name $functionName
  aws lambda update-function-configuration --region $AwsRegion --function-name $functionName --environment "Variables={TABLE_NAME=$tableName,SESSION_SECRET=$sessionSecret}"
}

$functionArn = "arn:aws:lambda:${AwsRegion}:${AccountId}:function:$functionName"
$apiId = aws apigatewayv2 get-apis --region $AwsRegion --query "Items[?Name=='$apiName'].ApiId | [0]" --output text
if ($apiId -eq "None") {
  $apiId = aws apigatewayv2 create-api --region $AwsRegion --name $apiName --protocol-type HTTP --cors-configuration "AllowOrigins=['*'],AllowMethods=['GET','POST','PUT','DELETE','OPTIONS'],AllowHeaders=['authorization','content-type','x-workspace-id','x-user-id']" --tags Project=calbook,App=calbook --query ApiId --output text
  $integrationId = aws apigatewayv2 create-integration --region $AwsRegion --api-id $apiId --integration-type AWS_PROXY --integration-uri $functionArn --payload-format-version 2.0 --query IntegrationId --output text
  aws apigatewayv2 create-route --region $AwsRegion --api-id $apiId --route-key "ANY /{proxy+}" --target "integrations/$integrationId"
  aws apigatewayv2 create-route --region $AwsRegion --api-id $apiId --route-key "ANY /" --target "integrations/$integrationId"
  aws apigatewayv2 create-stage --region $AwsRegion --api-id $apiId --stage-name '$default' --auto-deploy
  aws lambda add-permission --region $AwsRegion --function-name $functionName --statement-id "$Prefix-apigw" --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:${AwsRegion}:${AccountId}:$apiId/*/*/*"
}

$apiUrl = "https://$apiId.execute-api.$AwsRegion.amazonaws.com"

if (-not (Test-AwsCommand { aws s3api head-bucket --bucket $bucketName })) {
  aws s3api create-bucket --region $AwsRegion --bucket $bucketName --create-bucket-configuration LocationConstraint=$AwsRegion
  aws s3api put-bucket-tagging --bucket $bucketName --tagging "TagSet=[{Key=Project,Value=calbook},{Key=App,Value=calbook}]"
}

aws s3api put-public-access-block --bucket $bucketName --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
aws s3 website "s3://$bucketName" --index-document index.html --error-document index.html
$bucketPolicy = Join-Path $build "bucket-policy.json"
@"
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::$bucketName/*"}]}
"@ | Set-Content -Path $bucketPolicy -Encoding ascii
aws s3api put-bucket-policy --bucket $bucketName --policy "file://$bucketPolicy"

Push-Location "$root\frontend"
$env:VITE_API_BASE_URL = $apiUrl
npm.cmd run build
Pop-Location
aws s3 sync "$root\frontend\dist" "s3://$bucketName" --delete

$siteUrl = "http://$bucketName.s3-website-$AwsRegion.amazonaws.com"
[pscustomobject]@{
  ApiUrl = $apiUrl
  SiteUrl = $siteUrl
  CustomerUrl = "$siteUrl/book/acme-coaching/discovery-call"
  AdminUrl = $siteUrl
  DynamoDbTable = $tableName
  LambdaFunction = $functionName
  HttpApiId = $apiId
  S3Bucket = $bucketName
} | ConvertTo-Json

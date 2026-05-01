param(
  [string]$AccountId = "604545443541",
  [string]$BucketName = "calbook-serverless-frontend-604545443541-ap-southeast-2",
  [string]$BucketRegion = "ap-southeast-2",
  [string]$Comment = "calbook-serverless-frontend"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\..\.."
$build = Join-Path $root "services\core-api\build"
New-Item -ItemType Directory -Force -Path $build | Out-Null

$existingDistributionId = aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$Comment'].Id | [0]" --output text
if ($existingDistributionId -and $existingDistributionId -ne "None") {
  $domainName = aws cloudfront get-distribution --id $existingDistributionId --query "Distribution.DomainName" --output text
  [pscustomobject]@{
    DistributionId = $existingDistributionId
    HttpsUrl = "https://$domainName"
    CustomerUrl = "https://$domainName/book/acme-coaching/discovery-call"
  } | ConvertTo-Json
  exit 0
}

$originDomain = "$BucketName.s3-website-$BucketRegion.amazonaws.com"
$callerReference = "calbook-$([guid]::NewGuid())"
$configPath = Join-Path $build "cloudfront-distribution.json"

@"
{
  "DistributionConfigWithTags": {
    "DistributionConfig": {
      "CallerReference": "$callerReference",
      "Comment": "$Comment",
      "Enabled": true,
      "DefaultRootObject": "index.html",
      "Origins": {
        "Quantity": 1,
        "Items": [
          {
            "Id": "s3-website-origin",
            "DomainName": "$originDomain",
            "CustomOriginConfig": {
              "HTTPPort": 80,
              "HTTPSPort": 443,
              "OriginProtocolPolicy": "http-only",
              "OriginSslProtocols": {
                "Quantity": 1,
                "Items": ["TLSv1.2"]
              },
              "OriginReadTimeout": 30,
              "OriginKeepaliveTimeout": 5
            }
          }
        ]
      },
      "DefaultCacheBehavior": {
        "TargetOriginId": "s3-website-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 3,
          "Items": ["GET", "HEAD", "OPTIONS"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "Compress": true,
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 60,
        "MaxTTL": 300
      },
      "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
          {
            "ErrorCode": 403,
            "ResponsePagePath": "/index.html",
            "ResponseCode": "200",
            "ErrorCachingMinTTL": 0
          },
          {
            "ErrorCode": 404,
            "ResponsePagePath": "/index.html",
            "ResponseCode": "200",
            "ErrorCachingMinTTL": 0
          }
        ]
      },
      "PriceClass": "PriceClass_100",
      "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
      },
      "HttpVersion": "http2",
      "IsIPV6Enabled": true
    },
    "Tags": {
      "Items": [
        {
          "Key": "Project",
          "Value": "calbook"
        },
        {
          "Key": "App",
          "Value": "calbook"
        }
      ]
    }
  }
}
"@ | Set-Content -Path $configPath -Encoding ascii

$created = aws cloudfront create-distribution-with-tags --cli-input-json "file://$configPath" | ConvertFrom-Json
$distributionId = $created.Distribution.Id
$domainName = $created.Distribution.DomainName

[pscustomobject]@{
  DistributionId = $distributionId
  HttpsUrl = "https://$domainName"
  CustomerUrl = "https://$domainName/book/acme-coaching/discovery-call"
} | ConvertTo-Json

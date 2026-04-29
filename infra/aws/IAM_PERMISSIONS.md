# AWS permissions needed

To deploy this module, the AWS user or role needs permission to manage:

- CloudFormation stacks
- ECS clusters, services, task definitions
- ECR repositories and image pushes
- Elastic Load Balancing v2
- RDS PostgreSQL
- Secrets Manager
- IAM roles for ECS task execution and task runtime
- VPC, subnets, security groups, and related networking resources
- CloudWatch Logs

For a quick prototype, `AdministratorAccess` is simplest.

For a tighter deployment user, attach permissions covering these actions:

```text
cloudformation:*
ecs:*
ecr:*
elasticloadbalancing:*
rds:*
secretsmanager:*
iam:CreateRole
iam:DeleteRole
iam:GetRole
iam:PassRole
iam:AttachRolePolicy
iam:DetachRolePolicy
iam:PutRolePolicy
iam:DeleteRolePolicy
iam:TagRole
logs:*
ec2:CreateVpc
ec2:DeleteVpc
ec2:CreateSubnet
ec2:DeleteSubnet
ec2:CreateSecurityGroup
ec2:DeleteSecurityGroup
ec2:AuthorizeSecurityGroupIngress
ec2:AuthorizeSecurityGroupEgress
ec2:RevokeSecurityGroupIngress
ec2:RevokeSecurityGroupEgress
ec2:CreateInternetGateway
ec2:AttachInternetGateway
ec2:DetachInternetGateway
ec2:DeleteInternetGateway
ec2:CreateRouteTable
ec2:DeleteRouteTable
ec2:CreateRoute
ec2:AssociateRouteTable
ec2:DisassociateRouteTable
ec2:Describe*
ec2:CreateTags
ec2:DeleteTags
```

You also need permission to create a database password secret. Do not send long-term AWS access keys in chat. The safest path is to configure AWS SSO or a short-lived deployment role on your machine, then run the deployment commands from this workspace.

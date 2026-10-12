output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "database_subnets" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "node_subnet_ids" {
  description = "EKS node subnet IDs"
  value       = module.eks.node_subnet_ids
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.rds.endpoint
}

output "rds_arn" {
  description = "RDS PostgreSQL ARN"
  value       = aws_db_instance.rds.arn
}

output "rds_replica_endpoint" {
  description = "RDS replica endpoint (DR region)"
  value       = var.enable_cross_region_replication ? aws_db_instance.rds_replica[0].endpoint : ""
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint
}

output "redis_reader_endpoint" {
  description = "ElastiCache Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint
}

output "s3_backups_bucket" {
  description = "S3 backups bucket name"
  value       = aws_s3_bucket.backups.id
}

output "s3_models_bucket" {
  description = "S3 models bucket name"
  value       = aws_s3_bucket.models.id
}

output "s3_logs_bucket" {
  description = "S3 logs bucket name"
  value       = aws_s3_bucket.logs.id
}

output "node_api_ecr_uri" {
  description = "ECR URI for Node API image"
  value       = aws_ecr_repository.node_api.repository_url
}

output "python_api_ecr_uri" {
  description = "ECR URI for Python API image"
  value       = aws_ecr_repository.python_api.repository_url
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.primary.arn
}

output "secrets_arn" {
  description = "Secrets Manager ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "cluster_ca_certificate" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_certificate_authority
  sensitive   = true
}

output "cluster_token" {
  description = "EKS cluster auth token"
  value       = module.eks.cluster_token
  sensitive   = true
}

output "kms_eks_arn" {
  description = "EKS KMS key ARN"
  value       = aws_kms_key.eks.arn
}

output "kms_rds_arn" {
  description = "RDS KMS key ARN"
  value       = aws_kms_key.rds.arn
}

output "route53_name_servers" {
  description = "Route53 name servers (if not using existing hosted zone)"
  value       = data.aws_route53_zone.primary.name_servers
}

output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    region      = var.aws_region
    environment = var.environment
    vpc         = module.vpc.vpc_id
    eks_cluster = module.eks.cluster_name
    rds         = aws_db_instance.rds.endpoint
    redis       = aws_elasticache_replication_group.redis.primary_endpoint
    alb         = aws_lb.main.dns_name
    domain      = "https://app.${var.domain_name}"
  }
}
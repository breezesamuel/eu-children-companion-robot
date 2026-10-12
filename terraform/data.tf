# KMS Key for RDS
resource "aws_kms_key" "rds" {
  description             = "RDS encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowRDS"
      Effect    = "Allow"
      Principal = { "Service": "rds.amazonaws.com" }
      Action    = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"]
      Resource  = "*"
    }]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.environment}-robot-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "rds" {
  name       = "${var.environment}-robot-rds-subnet"
  subnet_ids = module.vpc.database_subnet_ids
  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.environment}-robot-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_db_instance" "rds" {
  identifier             = "${var.environment}-robot-rds"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  max_allocated_storage  = var.rds_allocated_storage * 5
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.rds.arn

  db_name  = "robot_prod"
  username = "robot"
  password = var.postgres_password

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  copy_tags_to_snapshot = true
  deletion_protection   = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "${var.environment}-robot-rds-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  apply_immediately = false

  tags = {
    Environment = var.environment
  }
}

# Cross-region read replica for DR
resource "aws_db_instance" "rds_replica" {
  count = var.enable_cross_region_replication ? 1 : 0

  identifier          = "${var.environment}-robot-rds-replica"
  replicate_source_db = aws_db_instance.rds.arn
  instance_class      = var.rds_instance_class
  engine              = "postgres"
  engine_version      = "16.3"
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.rds.arn

  publicly_accessible = false
  backup_retention_period = var.backup_retention_days
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Environment = var.environment
    Role        = "replica"
    Region      = var.dr_region
  }

  provider = aws.dr
}

# Provider for DR region
provider "aws" {
  alias  = "dr"
  region = var.dr_region
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-robot-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.environment}-robot-redis-subnet"
  subnet_ids = module.vpc.database_subnet_ids
}

resource "aws_security_group" "redis" {
  name        = "${var.environment}-robot-redis"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${var.environment}-robot-redis"
  engine                        = "redis"
  engine_version                = "7.1"
  node_type                     = var.redis_node_type
  number_cache_clusters         = var.redis_num_cache_nodes
  port                          = 6379
  parameter_group_name          = "default.redis7"
  engine_version                = "7.1"

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = var.redis_auth_token

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = var.backup_retention_days
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "Mon:04:00-Mon:05:00"

  at_rest_encryption_kms_key_id = aws_kms_key.redis.arn

  tags = {
    Environment = var.environment
  }
}

# KMS Key for ElastiCache
resource "aws_kms_key" "redis" {
  description             = "ElastiCache encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = {
    Environment = var.environment
  }
}

# S3 Buckets for backups, models, logs
resource "aws_s3_bucket" "backups" {
  bucket = "robot-${var.environment}-backups-${random_id.suffix.hex}"
  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true
    id      = "expire-old-backups"
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_version_expiration_days = 30
    }
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket" "models" {
  bucket = "robot-${var.environment}-models-${random_id.suffix.hex}"
  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  versioning {
    enabled = true
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://*.children-robot.com"]
    max_age         = 3600
  }

  lifecycle_rule {
    enabled = true
    id      = "expire-old-models"
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "robot-${var.environment}-logs-${random_id.suffix.hex}"
  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    enabled = true
    id      = "expire-old-logs"
    expiration {
      days = var.log_retention_days
    }
  }
}

resource "random_id" "suffix" {
  byte_length = 8
}

# S3 Bucket for Terraform state (if not using existing)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "robot-terraform-state"
  force_destroy = false

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    enabled = true
    id      = "prevent-destroy"
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }
}
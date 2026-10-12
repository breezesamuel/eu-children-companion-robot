# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.environment}-robot-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = [for k, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets  = [for k, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, k + 16)]
  database_subnets = [for k, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, k + 32)]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_classiclink     = false
  enable_classiclink_dns = false

  # NAT Gateway for private subnet egress
  nat_gateway_elastic_ips = true

  # VPC Flow Logs
  flow_log_destination_arn = aws_cloudwatch_log_group.vpc_flow_logs.arn
  flow_log_traffic_type    = "ALL"
  flow_log_max_aggregation_interval = 600

  # Tags
  tags = {
    Name        = "${var.environment}-robot-vpc"
    Environment = var.environment
  }

  public_subnet_tags = {
    Type = "public"
  }

  private_subnet_tags = {
    Type = "private"
  }

  database_subnet_tags = {
    Type = "database"
  }
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/${var.environment}-robot-vpc/flowlogs"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
  }
}

# VPC Endpoints for AWS Services (private access)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
  policy            = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Principal = "*"
      Action   = "s3:*"
      Resource = "*"
    }]
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "cloudwatch_monitoring" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.monitoring"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecs" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.ecs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecs_agent" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.ecs-agent"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ssm" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.ssm"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "kms" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.kms"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.environment}-vpc-endpoints"
  description = "Security group for VPC endpoints"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
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
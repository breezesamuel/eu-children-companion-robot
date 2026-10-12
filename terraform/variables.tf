variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-central-1"
  validation {
    condition     = contains(["eu-central-1", "eu-west-1", "eu-west-3", "eu-north-1"], var.aws_region)
    error_message = "Must be an EU region for GDPR compliance."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Must be development, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
}

variable "eks_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "EC2 instance types for node groups"
  type        = map(string)
  default = {
    general   = "m6i.xlarge"
    compute   = "c6i.xlarge"
    memory    = "r6i.xlarge"
    gpu       = "g5.xlarge"
  }
}

variable "node_group_sizes" {
  description = "Node group scaling configuration"
  type        = map(object({
    min_size = number
    max_size = number
    desired  = number
  }))
  default = {
    general = { min_size = 2, max_size = 10, desired = 3 }
    compute = { min_size = 1, max_size = 5,  desired = 2 }
    memory  = { min_size = 1, max_size = 3,  desired = 1 }
    gpu     = { min_size = 0, max_size = 2,  desired = 0 }
  }
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 200
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.xlarge"
}

variable "redis_num_cache_nodes" {
  description = "Number of ElastiCache nodes"
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "children-robot.com"
}

variable "certificate_arn" {
  description = "ACM certificate ARN for TLS"
  type        = string
  default     = ""
}

variable "container_images" {
  description = "Container image URIs"
  type        = map(string)
  default = {
    node_api     = "ghcr.io/your-org/robot-node-api:latest"
    python_api   = "ghcr.io/your-org/robot-python-api:latest"
    nginx        = "nginx:alpine"
    certbot      = "certbot/certbot"
    prometheus   = "prom/prometheus:v2.47.0"
    grafana      = "grafana/grafana:10.1.0"
    alertmanager = "prom/alertmanager:v0.26.0"
    loki         = "grafana/loki:2.9.0"
    promtail     = "grafana/promtail:2.9.0"
    jaeger       = "jaegertracing/all-in-one:1.50"
  }
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook for alerts"
  type        = string
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key"
  type        = string
  sensitive   = true
}

variable "enable_gpu_nodes" {
  description = "Enable GPU node group for ML inference"
  type        = bool
  default     = true
}

variable "enable_cross_region_replication" {
  description = "Enable cross-region DR replication"
  type        = bool
  default     = true
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "eu-west-1"
}

variable "backup_retention_days" {
  description = "RDS backup retention days"
  type        = number
  default     = 30
}

variable "monitoring_retention_days" {
  description = "Prometheus metrics retention"
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "Loki log retention"
  type        = number
  default     = 90
}
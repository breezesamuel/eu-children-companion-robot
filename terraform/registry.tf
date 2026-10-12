
# ECR Repositories
resource "aws_ecr_repository" "node_api" {
  name                 = "robot-node-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key_arn     = aws_kms_key.ecr.arn
  }

  tags = {
    Environment = var.environment
    Component   = "node-api"
  }
}

resource "aws_ecr_repository" "python_api" {
  name                 = "robot-python-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key_arn     = aws_kms_key.ecr.arn
  }

  tags = {
    Environment = var.environment
    Component   = "python-api"
  }
}

# KMS Key for ECR
resource "aws_kms_key" "ecr" {
  description             = "ECR encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = {
    Environment = var.environment
  }
}

# ECR Lifecycle Policy - keep only tagged/recent images
resource "aws_ecr_lifecycle_policy" "node_api" {
  repository = aws_ecr_repository.node_api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images older than 7 days"
      selection = {
        tagStatus = "untagged"
        countType  = "sinceImagePushed"
        countUnit  = "days"
        countValue = 7
      }
      action = {
        type = "expire"
      }
    }, {
      rulePriority = 2
      description  = "Keep only last 20 tagged images"
      selection = {
        tagStatus = "any"
        countType  = "imageCountMoreThan"
        countValue = 20
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "python_api" {
  repository = aws_ecr_repository.python_api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images older than 7 days"
      selection = {
        tagStatus = "untagged"
        countType  = "sinceImagePushed"
        countUnit  = "days"
        countValue = 7
      }
      action = {
        type = "expire"
      }
    }, {
      rulePriority = 2
      description  = "Keep only last 20 tagged images"
      selection = {
        tagStatus = "any"
        countType  = "imageCountMoreThan"
        countValue = 20
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ECR Registry Policy - restrict to IAM roles
resource "aws_ecr_repository_policy" "node_api" {
  repository = aws_ecr_repository.node_api.name

  policy = jsonencode({
    Version = "2008-10-17"
    Statement = [{
      Sid       = "AllowPull"
      Effect    = "Allow"
      Principal = { "AWS": "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability", "ecr:GetAuthorizationToken"]
    }]
  })
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "robot/${var.environment}/app-secrets"
  description = "Application secrets for robot companion ${var.environment}"

  kms_key_id = aws_kms_key.secrets.arn

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    jwt_secret          = var.jwt_secret
    jwt_refresh_secret  = var.jwt_secret
    postgres_password   = var.postgres_password
    redis_auth_token    = var.redis_auth_token
    stripe_secret_key   = var.stripe_secret_key
    openai_api_key      = var.openai_api_key
    slack_webhook_url   = var.slack_webhook_url
    pagerduty_key       = var.pagerduty_integration_key
  })
}

resource "aws_kms_key" "secrets" {
  description             = "Secrets Manager encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSecretsManager"
      Effect    = "Allow"
      Principal = { "Service": "secretsmanager.amazonaws.com" }
      Action    = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"]
      Resource  = "*"
    }, {
      Sid       = "AllowEKSUse"
      Effect    = "Allow"
      Principal = { "AWS": aws_iam_role.node_group.arn }
      Action    = ["kms:Decrypt", "kms:GenerateDataKey"]
      Resource  = "*"
    }]
  })
  tags = {
    Environment = var.environment
  }
}

# ACM Certificate
resource "aws_acm_certificate" " primary" {
  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.domain_name,
    "app.${var.domain_name}",
    "api.${var.domain_name}",
    "parent.${var.domain_name}",
    "monitoring.${var.domain_name}",
    "jaeger.${var.domain_name}",
    "grafana.${var.domain_name}",
    "lti.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# Route53 hosted zone
data "aws_route53_zone" "primary" {
  name         = var.domain_name
  private_zone = false
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  count = 8

  zone_id         = data.aws_route53_zone.primary.zone_id
  name            = element(aws_acm_certificate.primary.domain_validation_options, count.index).resource_record_name
  type            = element(aws_acm_certificate.primary.domain_validation_options, count.index).resource_record_type
  records         = [element(aws_acm_certificate.primary.domain_validation_options, count.index).resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

# ACM validation completion
resource "aws_acm_certificate_validation" "primary" {
  certificate_arn = aws_acm_certificate.primary.arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-robot-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2               = true
  idle_timeout               = 60

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb/${var.environment}"
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Target group for Node API HTTP
resource "aws_lb_target_group" "node_api" {
  name     = "${var.environment}-robot-node-api"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    enabled             = true
    path                = "/health/live"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Environment = var.environment
  }
}

# Target group for Python API HTTP
resource "aws_lb_target_group" "python_api" {
  name     = "${var.environment}-robot-python-api"
  port     = 8888
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    enabled             = true
    path                = "/health/live"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Environment = var.environment
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.primary.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.node_api.arn
  }
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener rule: /api/coppa, /api/dpp, etc. -> Python API
resource "aws_lb_listener_rule" "python_paths" {
  count = 8

  listener_arn = aws_lb_listener.https.arn
  priority     = count.index + 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.python_api.arn
  }

  condition {
    path_pattern {
      values = [element(["/api/vpc/*", "/api/dpp/*", "/api/edge-ai/*", "/api/coppa/*", "/api/dsa/*", "/api/lti/*", "/api/classroom/*", "/api/gdpr/sharing/*"], count.index)]
    }
  }
}

# Listener rule: Default -> Node API
resource "aws_lb_listener_rule" "default" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.node_api.arn
  }

  condition {
    source_ip {
      values = ["0.0.0.0/0"]
    }
  }
}

# EKS Node Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "${var.environment}-robot-eks-nodes"
  description = "Security group for EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    description = "Allow all traffic from cluster control plane and node-to-node"
    self        = true
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    description     = "HTTPS from anywhere (for node bootstrapping/VPC endpoints)"
    cidr_blocks     = ["0.0.0.0/0"]
  }

  ingress {
    from_port       = 10250
    to_port         = 10250
    protocol        = "tcp"
    description     = "Kubelet API from control plane"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    description = "Allow all egress"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment                                        = var.environment
    "kubernetes.io/cluster/${module.eks.cluster_name}" = "shared"
  }
}

# Security group for ALB
resource "aws_security_group" "alb" {
  name        = "${var.environment}-robot-alb"
  description = "Security group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    description = "HTTP (redirects to HTTPS)"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    description = "HTTPS"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    description = "Allow all egress to pods/nodes"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Environment = var.environment
  }
}

# Security group rule: ALB -> nodes on service ports
resource "aws_security_group_rule" "alb_to_nodes" {
  type                     = "ingress"
  description              = "Allow ALB to reach node ports"
  from_port                = 30000
  to_port                  = 32767
  protocol                 = "tcp"
  security_group_id        = aws_security_group.eks_nodes.id
  source_security_group_id = aws_security_group.alb.id
}

# Security group for internal service-to-service communication
resource "aws_security_group" "internal" {
  name        = "${var.environment}-robot-internal"
  description = "Internal service mesh communication"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 8888
    to_port         = 8888
    protocol        = "tcp"
    description     = "Python API"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    description     = "Node API"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 9090
    to_port         = 9090
    protocol        = "tcp"
    description     = "Prometheus"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 3100
    to_port         = 3100
    protocol        = "tcp"
    description     = "Loki"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 16686
    to_port         = 16686
    protocol        = "tcp"
    description     = "Jaeger"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 4317
    to_port         = 4317
    protocol        = "tcp"
    description     = "OTLP gRPC"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 4318
    to_port         = 4318
    protocol        = "tcp"
    description     = "OTLP HTTP"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 9091
    to_port         = 9091
    protocol        = "tcp"
    description     = "Prometheus Pushgateway"
    security_groups = [module.eks.cluster_security_group_id, aws_security_group.eks_nodes.id]
  }

  tags = {
    Environment = var.environment
  }
}

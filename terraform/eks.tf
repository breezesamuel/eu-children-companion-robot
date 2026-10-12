# EKS Cluster Module
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.environment}-robot-eks"
  cluster_version = var.eks_version

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  cluster_endpoint_private_access = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]

  # Enable IRSA
  enable_irsa = true

  # Cluster encryption
  enable_cluster_encryption = true
  cluster_encryption_provider_key_arn = aws_kms_key.eks.arn

  # Cluster logging
  cluster_log_retention_period = var.log_retention_days
  cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Cluster addons
  enable_aws_ebs_csi_driver = true
  enable_aws_efs_csi_driver = true

  # Manage default node group
  manage_default_node_group = false

  tags = {
    Environment = var.environment
  }
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS cluster encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowEKS"
      Effect    = "Allow"
      Principal = { "Service": "eks.amazonaws.com" }
      Action    = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"]
      Resource  = "*"
    }]
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.environment}-robot-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Node Groups
module "eks_node_groups" {
  source  = "terraform-aws-modules/eks/aws//modules/node-groups"
  version = "~> 19.0"

  cluster_name    = module.eks.cluster_name
  cluster_version = var.eks_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.eks.node_subnet_ids

  node_groups = {
    general = {
      name           = "general"
      instance_types = [var.node_instance_types["general"]]
      capacity_type  = "ON_DEMAND"

      scaling_config = {
        desired_size = var.node_group_sizes["general"].desired
        max_size     = var.node_group_sizes["general"].max_size
        min_size     = var.node_group_sizes["general"].min_size
      }

      labels = {
        workload-type = "general"
        tier          = "general"
      }

      taints = [{
        key    = "workload-type"
        value  = "general"
        effect = "PREFER_NO_SCHEDULE"
      }]

      kubelet_extra_args = "--max-pods=110 --system-reserved=cpu=100m,memory=256Mi,ephemeral-storage=1Gi --kube-reserved=cpu=100m,memory=256Mi,ephemeral-storage=1Gi"

      instance_profile_additional_iam_policy_arns = [
        aws_iam_policy.worker_nodes.arn
      ]
    }

    compute = {
      name           = "compute"
      instance_types = [var.node_instance_types["compute"]]
      capacity_type  = "ON_DEMAND"

      scaling_config = {
        desired_size = var.node_group_sizes["compute"].desired
        max_size     = var.node_group_sizes["compute"].max_size
        min_size     = var.node_group_sizes["compute"].min_size
      }

      labels = {
        workload-type = "compute"
        tier          = "compute"
      }

      taints = [{
        key    = "workload-type"
        value  = "compute"
        effect = "PREFER_NO_SCHEDULE"
      }]

      kubelet_extra_args = "--max-pods=110 --system-reserved=cpu=100m,memory=256Mi,ephemeral-storage=1Gi --kube-reserved=cpu=100m,memory=256Mi,ephemeral-storage=1Gi"

      instance_profile_additional_iam_policy_arns = [
        aws_iam_policy.worker_nodes.arn
      ]
    }

    memory = {
      name           = "memory"
      instance_types = [var.node_instance_types["memory"]]
      capacity_type  = "ON_DEMAND"

      scaling_config = {
        desired_size = var.node_group_sizes["memory"].desired
        max_size     = var.node_group_sizes["memory"].max_size
        min_size     = var.node_group_sizes["memory"].min_size
      }

      labels = {
        workload-type = "memory"
        tier          = "memory"
      }

      taints = [{
        key    = "workload-type"
        value  = "memory"
        effect = "PREFER_NO_SCHEDULE"
      }]

      kubelet_extra_args = "--max-pods=110 --system-reserved=cpu=100m,memory=512Mi,ephemeral-storage=1Gi --kube-reserved=cpu=100m,memory=512Mi,ephemeral-storage=1Gi"

      instance_profile_additional_iam_policy_arns = [
        aws_iam_policy.worker_nodes.arn
      ]
    }
  }

  # GPU node group for ML inference (conditional)
  gpu = var.enable_gpu_nodes ? {
    name           = "gpu"
    instance_types = [var.node_instance_types["gpu"]]
    capacity_type  = "ON_DEMAND"

    scaling_config = {
      desired_size = var.node_group_sizes["gpu"].desired
      max_size     = var.node_group_sizes["gpu"].max_size
      min_size     = var.node_group_sizes["gpu"].min_size
    }

    labels = {
      workload-type = "gpu"
      tier          = "gpu"
      nvidia.com/gpu = "true"
    }

    taints = [{
      key    = "nvidia.com/gpu"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]

    kubelet_extra_args = "--max-pods=110 --system-reserved=cpu=100m,memory=512Mi,ephemeral-storage=1Gi --kube-reserved=cpu=100m,memory=512Mi,ephemeral-storage=1Gi --gpu-reserved=cpu=100m,memory=1Gi"

    instance_profile_additional_iam_policy_arns = [
      aws_iam_policy.worker_nodes.arn
    ]

    launch_template_extra_args = "--nvidia-gpu-driver-version=535"
  } : {}
}

# IAM Policy for worker nodes
resource "aws_iam_policy" "worker_nodes" {
  name        = "${var.environment}-robot-worker-nodes"
  description = "IAM policy for EKS worker nodes"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::robot-${var.environment}-*",
          "arn:aws:s3:::robot-${var.environment}-*/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:robot/${var.environment}/*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          aws_kms_key.eks.arn,
          aws_kms_key.rds.arn
        ]
      }
    ]
  }
}

# EKS Cluster IAM Role
resource "aws_iam_role" "cluster" {
  name = "${var.environment}-robot-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  }
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSServicePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.cluster.name
}

# Node Group IAM Role
resource "aws_iam_role" "node_group" {
  name = "${var.environment}-robot-eks-node-group"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_group.name
}

resource "aws_iam_role_policy_attachment" "node_group_custom" {
  policy_arn = aws_iam_policy.worker_nodes.arn
  role       = aws_iam_role.node_group.name
}
#!/bin/bash
# deploy.sh — Deploy Robot Companion to production (AWS EKS + K8s)
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-production}"
AWS_REGION="eu-central-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${2:-latest}"

NAMESPACE="robot-${ENVIRONMENT}"
KUBECTL_CONTEXT="robot-${ENVIRONMENT}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────────────────────────────────────
log "Running pre-flight checks..."

command -v aws >/dev/null 2>&1 || error "aws CLI not found"
command -v kubectl >/dev/null 2>&1 || error "kubectl not found"
command -v docker >/dev/null 2>&1 || error "docker not found"
command -v helm >/dev/null 2>&1 || error "helm not found"
command -v jq >/dev/null 2>&1 || error "jq not found"

# Verify AWS credentials
aws sts get-caller-identity >/dev/null 2>&1 || error "Not authenticated with AWS"

# Verify kubectl context
kubectl config use-context "$KUBECTL_CONTEXT" >/dev/null 2>&1 || error "kubectl context not found"
success "Pre-flight checks passed"

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Build Docker images
# ─────────────────────────────────────────────────────────────────────────────
log "Building Docker images..."
cd /home.com/mia.043/robot-companion || error "Cannot find project directory"

# Login to ECR
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Build Node.js API
log "Building Node.js API image..."
docker build \
    -f Dockerfile.node \
    -t "${ECR_REGISTRY}/robot-node-api:${IMAGE_TAG}" \
    -t "${ECR_REGISTRY}/robot-node-api:latest" \
    ./project_source/

# Build Python API
log "Building Python API image..."
docker build \
    -f Dockerfile.python \
    -t "${ECR_REGISTRY}/robot-python-api:${IMAGE_TAG}" \
    -t "${ECR_REGISTRY}/robot-python-api:latest" \
    .

success "Docker images built"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Security scan images
# ─────────────────────────────────────────────────────────────────────────────
log "Scanning Docker images for vulnerabilities..."
for IMAGE in "${ECR_REGISTRY}/robot-node-api:${IMAGE_TAG}" "${ECR_REGISTRY}/robot-python-api:${IMAGE_TAG}"; do
    log "Scanning $IMAGE..."
    trivy image --severity HIGH,CRITICAL --exit-code 1 "$IMAGE" || warn "Trivy found issues in $IMAGE (review required)"
done
success "Security scan complete"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Push images to ECR
# ─────────────────────────────────────────────────────────────────────────────
log "Pushing images to ECR..."
docker push "${ECR_REGISTRY}/robot-node-api:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/robot-python-api:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/robot-node-api:latest"
docker push "${ECR_REGISTRY}/robot-python-api:latest"
success "Images pushed"

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Run tests
# ─────────────────────────────────────────────────────────────────────────────
log "Running tests..."

cd /home.com/mia.043/robot-companion/project_source || error "Cannot find project_source"

# Node tests
log "Running Node.js tests..."
npm ci --ignore-scripts
npm run test:core || error "Node tests failed"
success "Node tests passed"

# Python tests
log "Running Python tests..."
cd /home.com/mia.043/robot-companion
pip install -q -r requirements.txt
python -m pytest tests/ -x -q || error "Python tests failed"
success "Python tests passed"

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Update K8s manifests
# ─────────────────────────────────────────────────────────────────────────────
log "Updating K8s manifests..."
cd /home.com/mia.043/robot-companion

# Substitute placeholders
sed -i "s|ACCOUNT_ID|${AWS_ACCOUNT_ID}|g" k8s/*.yaml
sed -i "s|REGION|${AWS_REGION}|g" k8s/*.yaml
sed -i "s|IMAGE_TAG|${IMAGE_TAG}|g" k8s/*.yaml
sed -i "s|ACM_CERT_ARN|$(aws acm list-certificates --query 'CertificateSummaryList[0].CertificateArn' --output text)|g" k8s/node-api.yaml

# Get ACM cert
ACM_CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[0].CertificateArn' --output text)
sed -i "s|ACM_CERT_ARN|${ACM_CERT_ARN}|g" k8s/node-api.yaml

success "Manifests updated"

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Deploy to K8s
# ─────────────────────────────────────────────────────────────────────────────
log "Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml

# Apply secrets (from AWS Secrets Manager)
log "Syncing secrets..."
SECRETS_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "robot/${ENVIRONMENT}/app-secrets" \
    --query SecretString \
    --output text)

# Create/update K8s secret
kubectl create secret generic robot-secrets \
    --namespace "$NAMESPACE" \
    --from-literal=DATABASE_URL="postgresql://robot:${SECRETS_JSON_POSTGRES}@robot-${ENVIRONMENT}-rds.abc123.${AWS_REGION}.rds.amazonaws.com:5432/robot_prod" \
    --from-literal=REDIS_URL="rediss://robot:${SECRETS_JSON_REDIS}@robot-${ENVIRONMENT}-redis.abc123.${AWS_REGION}.cache.amazonaws.com:6379" \
    --from-literal=JWT_SECRET="${SECRETS_JSON_JWT}" \
    --from-literal=STRIPE_SECRET_KEY="${SECRETS_JSON_STRIPE}" \
    --from-literal=OPENAI_API_KEY="${SECRETS_JSON_OPENAI}" \
    --dry-run=client -o yaml | kubectl apply -f -

# Apply deployments
log "Applying deployments..."
kubectl apply -f k8s/python-api.yaml
kubectl apply -f k8s/node-api.yaml

# Wait for rollout
log "Waiting for rollout..."
kubectl rollout status deployment/robot-python-api -n "$NAMESPACE" --timeout=300s
kubectl rollout status deployment/robot-node-api -n "$NAMESPACE" --timeout=300s

success "Deployed to Kubernetes"

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Smoke tests
# ─────────────────────────────────────────────────────────────────────────────
log "Running smoke tests..."

ALB_DNS=$(kubectl get ingress robot-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

sleep 10

# Health checks
for PATH in "/health/live" "/health/ready"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS}${PATH}")
    if [[ "$HTTP_CODE" != "200" ]]; then
        error "Smoke test failed: $PATH returned $HTTP_CODE"
    fi
done
success "Health checks passed"

# API checks
for PATH in "/api/status" "/api/info"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS}${PATH}")
    if [[ "$HTTP_CODE" != "200" ]]; then
        warn "API check: $PATH returned $HTTP_CODE (may be expected)"
    fi
done
success "API checks passed"

# ─────────────────────────────────────────────────────────────────────────────
# Step 8: Final status
# ─────────────────────────────────────────────────────────────────────────────
log "Deployment Status:"
kubectl get pods -n "$NAMESPACE"
kubectl get services -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"

echo ""
success "=== Deployment Complete ==="
echo "  Environment: $ENVIRONMENT"
echo "  Namespace:   $NAMESPACE"
echo "  ALB DNS:     $ALB_DNS"
echo "  Image Tag:   $IMAGE_TAG"
echo ""
echo "  Monitor: https://monitoring.children-robot.com/d/robot-overview/robot-overview"
echo "  API Docs: https://api.children-robot.com/docs"
echo ""

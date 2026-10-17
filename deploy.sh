#!/bin/bash
# Quick deployment script for Inventory Management System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Inventory Management System - Kubernetes Deployment ===${NC}\n"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl not found${NC}"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo -e "${RED}helm not found${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}\n"

# Configuration
NAMESPACE=${1:-inventory}
RELEASE_NAME=${2:-inventory}
HOSTNAME=${3:-inventory.example.com}
IMAGE_TAG=${4:-latest}

echo -e "${BLUE}Deployment Configuration:${NC}"
echo "  Namespace:    $NAMESPACE"
echo "  Release Name: $RELEASE_NAME"
echo "  Hostname:     $HOSTNAME"
echo "  Image Tag:    $IMAGE_TAG"
echo ""

# Create namespace
echo -e "${BLUE}Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace ready${NC}\n"

# Check for Gateway
echo -e "${BLUE}Checking for Gateway API...${NC}"
if kubectl get gateway inventory-gateway -n $NAMESPACE >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Gateway found${NC}"
else
  echo -e "${BLUE}Note: No gateway found. Creating example gateway...${NC}"
  kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: inventory-gateway
  namespace: $NAMESPACE
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: All
EOF
  echo -e "${GREEN}✓ Gateway created (using nginx - adjust gatewayClassName if needed)${NC}"
fi
echo ""

# Deploy with Helm
echo -e "${BLUE}Deploying with Helm...${NC}"
helm upgrade --install $RELEASE_NAME ./helm/inventory \
  --namespace $NAMESPACE \
  --set frontend.image.tag=$IMAGE_TAG \
  --set backend.image.tag=$IMAGE_TAG \
  --set httpRoute.hostname=$HOSTNAME \
  --wait
echo -e "${GREEN}✓ Helm deployment complete${NC}\n"

# Wait for rollout
echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
kubectl rollout status deployment/$RELEASE_NAME-backend -n $NAMESPACE --timeout=5m || true
kubectl rollout status deployment/$RELEASE_NAME-frontend -n $NAMESPACE --timeout=5m || true
echo -e "${GREEN}✓ Deployments ready${NC}\n"

# Display status
echo -e "${BLUE}Deployment Status:${NC}"
kubectl get all -n $NAMESPACE
echo ""

echo -e "${BLUE}Services:${NC}"
kubectl get services -n $NAMESPACE
echo ""

echo -e "${BLUE}HTTPRoute:${NC}"
kubectl get httproutes -n $NAMESPACE
echo ""

# Port forwarding instructions
echo -e "${BLUE}Access Instructions:${NC}"
echo "1. Port forward to test locally:"
echo "   kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-frontend 8080:80"
echo "   kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-backend 3000:3000"
echo ""
echo "2. Then access:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3000"
echo ""
echo "3. For production, configure DNS for: $HOSTNAME"
echo ""

# Check pod status
PODS=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=inventory -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
if [ -z "$PODS" ]; then
  echo -e "${GREEN}✓ All pods are running${NC}"
else
  echo -e "${RED}⚠ Some pods are not running: $PODS${NC}"
  echo "   Run: kubectl describe pod <pod-name> -n $NAMESPACE"
fi
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "For more details, see DEPLOYMENT.md"

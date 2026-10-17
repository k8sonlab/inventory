# Inventory Management System - Kubernetes Deployment Guide

## Overview

This guide covers deploying the Inventory Management System to Kubernetes using Helm charts. The deployment consists of:
- **Frontend**: Vue.js 3 + Vite, served via Nginx (2+ replicas with auto-scaling)
- **Backend**: Node.js + Express, running the API server (2+ replicas with auto-scaling)
- **Storage**: Persistent volume for SQLite database
- **Networking**: Gateway API with HTTPRoute support for frontend access
- **CI/CD**: GitHub Actions workflows for automated builds and deployments

## Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3.10+
- kubectl configured with cluster access
- GitHub repository with Actions enabled
- Container registry access (GHCR by default)

## Project Structure

```
.
├── helm/
│   └── inventory/
│       ├── Chart.yaml                 # Helm chart metadata
│       ├── values.yaml                # Default values
│       └── templates/
│           ├── _helpers.tpl           # Template helpers
│           ├── backend.yaml           # Backend deployment & service
│           ├── frontend.yaml          # Frontend deployment & service
│           ├── httproute.yaml         # Gateway API HTTPRoute
│           ├── hpa.yaml               # Horizontal Pod Autoscaling
│           └── pvc.yaml               # Persistent Volume Claim
├── .github/workflows/
│   ├── build-backend.yml              # Build & push backend image
│   ├── build-frontend.yml             # Build & push frontend image
│   └── deploy.yml                     # Helm deployment to K8s
├── client/
│   ├── Dockerfile                     # Frontend container image
│   └── nginx.conf                     # Nginx configuration
├── server/
│   └── Dockerfile                     # Backend container image
└── README.md
```

## Deployment Steps

### 1. Prerequisites Setup

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify Helm installation
helm version

# Verify kubectl access
kubectl cluster-info
```

### 2. Gateway API Setup (for HTTPRoute)

If your cluster uses Istio or another Gateway Controller:

```bash
# For Istio
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.18/samples/bookinfo/gateway-api/sample-apps-mtls.yaml

# Or configure your gateway:
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: inventory-gateway
  namespace: default
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: All
EOF
```

### 3. Deploy with Helm

#### Option A: Default Deployment

```bash
# Add chart repo (if hosting externally)
helm repo add inventory https://your-registry.com/charts
helm repo update

# Install
helm install inventory ./helm/inventory \
  --namespace inventory \
  --create-namespace

# Or upgrade existing release
helm upgrade --install inventory ./helm/inventory \
  --namespace inventory \
  --create-namespace
```

#### Option B: Custom Configuration

```bash
# Override default values
helm install inventory ./helm/inventory \
  --namespace inventory \
  --create-namespace \
  --set frontend.replicaCount=3 \
  --set backend.replicaCount=3 \
  --set frontend.image.tag=v1.0.0 \
  --set backend.image.tag=v1.0.0 \
  --set httpRoute.hostname=inventory.example.com
```

### 4. Verify Deployment

Configure Gateway attachments through `httpRoute.parentRefs` in your Helm values:

```yaml
httpRoute:
  parentRefs:
    - group: gateway.networking.k8s.io
      kind: Gateway
      name: inventory-gateway
      namespace: default
      sectionName: http
```

The chart renders this list directly, supporting multiple parents and optional fields such as `namespace`, `sectionName`, and `port`. An omitted namespace refers to the HTTPRoute's namespace. The former `httpRoute.gatewayName` setting is no longer used.

```bash
# Check deployment status
kubectl get deployments -n inventory
kubectl get pods -n inventory
kubectl get services -n inventory

# View HTTPRoute
kubectl get httproutes -n inventory
kubectl describe httproute inventory-frontend -n inventory

# Check pod logs
kubectl logs -n inventory -l component=backend
kubectl logs -n inventory -l component=frontend

# Port forward to test locally
kubectl port-forward -n inventory svc/inventory-frontend 8080:80
kubectl port-forward -n inventory svc/inventory-backend 3000:3000

# Navigate to http://localhost:8080
```

### 5. GitHub Actions CI/CD Setup

The workflows automatically:
1. **Build Backend** when `server/` changes
2. **Build Frontend** when `client/` changes
3. **Deploy** when Helm chart changes or builds complete

#### Workflow Triggers

- **Push to main branch** → Build images and push to GHCR
- **Pull requests** → Build images (don't push)
- **Helm changes** → Trigger Helm deployment

#### Required Secrets (Optional - uses GITHUB_TOKEN by default)

For private registries, add to GitHub Secrets:
```bash
REGISTRY_USERNAME=your-username
REGISTRY_PASSWORD=your-token
```

#### Manual Trigger (if needed)

```bash
# Trigger workflow manually
gh workflow run build-backend.yml
gh workflow run build-frontend.yml
gh workflow run deploy.yml
```

## Container Images

### Container logging

Both the production Nginx frontend and Express backend write one JSON access-log line per request to stdout, including health probes and failed requests. Logs include timestamp, method, path (without query strings), status, duration, and direct peer address. Backend duration is in milliseconds; Nginx duration is in seconds and also includes bytes sent. Backend aborted responses use log status 499.

Backend query-count and SQL debug output is suppressed when `NODE_ENV=production`, but remains available in development. Startup, migration/import progress, and error messages are retained. Errors use stderr; access logs use stdout. Request bodies, authorization headers, and query parameters are not included in access logs. Peer addresses identify the direct proxy when requests pass through Nginx or a gateway.

View logs with `kubectl logs -n inventory -l component=backend` or `kubectl logs -n inventory -l component=frontend`. The production frontend uses the configuration embedded in its image; the chart's optional Nginx ConfigMap includes the same logging directives.

### Backend Image (Node.js Alpine)

- **Base**: `node:24-alpine`
- **Container user**: unprivileged `node` (UID/GID 1000). The Helm chart sets `fsGroup: 1000` so mounted volumes are writable; adjust `backend.podSecurityContext` if your storage class needs different ownership.
- **Shutdown**: handles `SIGTERM` (Kubernetes) and `SIGINT`: stops accepting connections, finishes in-flight requests, saves/closes the database, then exits (forced after 25 s).
- **Errors**: unexpected and database errors return a generic message; details are logged to stderr.
- **Port**: 3000
- **Liveness / container healthcheck**: `/healthz` (HTTP 200, independent of database connectivity)
- **Readiness**: `/healthz/ready` (HTTP 200 for SQLite or reachable PostgreSQL; HTTP 503 if configured PostgreSQL is unavailable). PostgreSQL connections and readiness queries each time out after 2 seconds; the readiness probe timeout is 5 seconds.
- **Database**: SQLite at `/data/inventory.db`
- **Environment**: NODE_ENV=production

### Frontend Image (Nginx Alpine)

- **Base**: `nginx:alpine`
- **Container port**: 5174 (Nginx, container healthcheck, and Kubernetes probes)
- **Service port**: 80, forwarded to container port 5174
- **Container user**: Unchanged (root). The unprivileged listening port prepares for a future non-root setup; Nginx PID/cache permissions still need configuration before changing the user.
- **API Proxy**: `/api/*` → backend service
- **SPA Routing**: Fallback to `index.html`
- **Caching**: Static assets cached for 1 year
- **Health**: `/health` endpoint

## Single Container Alternative

If you prefer a monolithic approach, you could:

```dockerfile
# All-in-one image
FROM node:24-alpine
RUN apk add --no-cache nginx
COPY server/ /app/server
COPY client/ /app/client
RUN cd /app/client && npm run build
RUN cd /app/server && npm ci --production
EXPOSE 80 3000
CMD sh -c "nginx & node server/server.js"
```

**Tradeoffs**:
- ✅ Single image to manage
- ❌ Cannot scale frontend separately
- ❌ Cannot update frontend without restarting backend
- ❌ Larger image size
- ❌ Harder to maintain

**Recommendation**: Keep 2 separate images for production.

## Scaling & Autoscaling

### Manual Scaling

```bash
# Scale backend to 5 replicas
kubectl scale deployment inventory-backend -n inventory --replicas=5

# Scale frontend to 3 replicas
kubectl scale deployment inventory-frontend -n inventory --replicas=3
```

### Autoscaling (Horizontal Pod Autoscaler)

By default, both deployments have HPA enabled (2-5 replicas, 70% CPU target).

```bash
# View HPA status
kubectl get hpa -n inventory
kubectl describe hpa inventory-backend-hpa -n inventory

# Adjust scaling
helm upgrade inventory ./helm/inventory \
  --set backend.autoscaling.maxReplicas=10 \
  --set frontend.autoscaling.maxReplicas=8
```

## Storage & Persistence

### Database Persistence

```bash
# Check PVC
kubectl get pvc -n inventory
kubectl describe pvc inventory-pvc -n inventory

# Mount options
- Storage Class: standard (configurable)
- Size: 5Gi (configurable)
- Mount Path: /data in backend pod
```

### Backup Database

```bash
# Copy database from pod
kubectl cp inventory/inventory-backend-xxx:/data/inventory.db ./inventory-backup.db -n inventory

# Restore from backup
kubectl cp ./inventory-backup.db inventory/inventory-backend-xxx:/data/inventory.db -n inventory
```

## Troubleshooting

### Pod Stuck in Pending

```bash
kubectl describe pod <pod-name> -n inventory
# Check: PVC status, node resources, image pulls
```

### CrashLoopBackOff

```bash
kubectl logs <pod-name> -n inventory
# Check: Application logs, missing environment variables, port conflicts
```

### Service Not Accessible

```bash
# Verify HTTPRoute
kubectl describe httproute inventory-frontend -n inventory

# Check service endpoints
kubectl get endpoints -n inventory

# Test connectivity
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# Inside: wget http://inventory-frontend:80
```

### Database Locked

```bash
# Restart backend pods (might be necessary if DB is corrupted)
kubectl rollout restart deployment/inventory-backend -n inventory
```

## Monitoring & Logging

### View Logs

```bash
# Real-time logs
kubectl logs -f -n inventory -l component=backend

# Last 100 lines
kubectl logs --tail=100 -n inventory -l component=frontend

# All pods in namespace
kubectl logs -n inventory --all-containers=true -l app.kubernetes.io/name=inventory
```

### Monitoring Integration (Optional)

For Prometheus/Grafana:
1. Add ServiceMonitor resources
2. Configure metrics endpoints in deployment
3. Update Helm templates with `--metrics` flags

## Undeployment

```bash
# Delete entire release
helm uninstall inventory -n inventory

# Delete namespace (removes all resources)
kubectl delete namespace inventory

# Delete PVC separately if needed
kubectl delete pvc inventory-pvc -n inventory
```

## Next Steps

1. Update `values.yaml` with your registry and hostname
2. Configure GitHub repository secrets (if using private registry)
3. Push code to `main` branch to trigger CI/CD
4. Monitor GitHub Actions workflows
5. Verify deployment with `kubectl get all -n inventory`
6. Access frontend at your configured hostname

## Support

For issues:
1. Check pod logs: `kubectl logs <pod-name> -n inventory`
2. Describe pod: `kubectl describe pod <pod-name> -n inventory`
3. Check events: `kubectl get events -n inventory`
4. Review GitHub Actions logs in repository > Actions tab

# Receta para construir la "cajita" (contenedor) de FrescoTrack.

# Paso 1: construir la app del celular (React) y dejarla lista en client/dist
FROM node:22-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Paso 2: el servidor que guarda los datos y entrega la app
FROM node:22-slim
WORKDIR /app/server
ENV NODE_ENV=production \
    TZ=America/Mexico_City \
    PORT=3000 \
    DB_FILE=/app/data/frescotrack.db \
    CLIENT_DIST=/app/client/dist
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY --from=client /app/client/dist /app/client/dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.js"]

# ============================================================
#  Web Ventas — imagen única para Railway (API + frontend)
#  El backend Express sirve la API en /api y el frontend compilado.
# ============================================================

# ---- 1) Compilar el frontend (React + Vite) ----
FROM node:20-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- 2) Backend (instala deps, genera Prisma) e imagen final ----
FROM node:20-alpine AS server
# Prisma en Alpine necesita openssl.
RUN apk add --no-cache openssl
WORKDIR /app

COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate

# Copiar el frontend compilado a ./public (lo sirve Express).
COPY --from=client /client/dist ./public

ENV NODE_ENV=production
# Railway define PORT automáticamente; el server usa process.env.PORT.
EXPOSE 4000

# Al arrancar: aplica el esquema a la BD, asegura el superadmin y levanta la API.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node scripts/ensure-superadmin.js && node src/index.js"]

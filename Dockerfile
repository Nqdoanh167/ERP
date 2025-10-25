FROM node:18.20.4 as env

FROM env as build

WORKDIR /app

COPY package*.json /app/
COPY ./src/json ./json

RUN npm ci --only=production
# RUN npm install --omit=dev

FROM build as compile

WORKDIR /app

COPY . .
COPY --from=build /app/node_modules /app/node_modules

RUN npm run build

FROM env as production

WORKDIR /app

# # # Copy File từ stage compile => App hiện tại
COPY --from=compile /app/dist ./dist
COPY --from=compile /app/.env.example ./.env.example
COPY --from=compile /app/node_modules ./node_modules
COPY --from=compile /app/package*.json ./
COPY --from=compile /app/json ./dist/json
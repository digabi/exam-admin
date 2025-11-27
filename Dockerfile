FROM node:22-slim

RUN apt-get update
RUN apt-get install -y python3 python3-pip zip postgresql

WORKDIR /app

COPY lerna.json .
COPY package.json .
COPY packages/ ./packages

RUN npm install --force

# The compile step needs these things to exist.
# Change as necessary for your own deployment.
RUN touch packages/arpajs/server/s3_encrypt.pub
RUN touch packages/sa/public/img/logo.svg
RUN touch packages/sa/public/img/bertta-icon.svg

COPY templates/arpajs_dev_env.ts ./packages/arpajs/server/config/env/development.ts
COPY templates/arpajs_env_map.ts ./packages/arpajs/server/config/env/env-map.ts
COPY templates/sa_dev_env.ts ./packages/sa/server/config/env/development.ts
COPY templates/sa_env_map.ts ./packages/sa/server/config/env/env-map.ts

COPY templates/sa_client_config.ts ./packages/sa/public/js/config.ts
COPY templates/nsa-scripts.zip ./packages/arpajs/server/nsa-scripts.zip
RUN echo 'export const fiOverrides = {}' > ./packages/sa/public/locales/fi_overrides.ts
RUN echo 'export const svOverrides = {}' > ./packages/sa/public/locales/sv_overrides.ts

RUN npx lerna run --stream compile

COPY start.sh .
RUN chmod +x ./start.sh

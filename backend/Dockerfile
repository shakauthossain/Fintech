FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY src ./src

RUN mkdir -p data secrets

ENV NODE_ENV=production

EXPOSE 8001

CMD ["node", "src/index.js"]

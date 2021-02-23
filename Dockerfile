FROM node:alpine

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE 443 80 8080 3000

CMD npm run start
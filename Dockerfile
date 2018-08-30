FROM node:latest

RUN apt-get update
RUN apt-get install -y python-pip
RUN pip install mcstatus

EXPOSE 8080

WORKDIR /app

COPY index.js /app/index.js
COPY package.json /app/package.json

RUN npm install

CMD node index.js
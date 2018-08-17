FROM node:9.6.1

RUN mkdir /usr/src/app
WORKDIR /usr/src/app

ENV PATH /usr/src/app/node_modules/.bin:$PATH

COPY . /usr/src/app

RUN npm install --silent
RUN npm install react-scripts@1.1.1 -g -slient

EXPOSE 3000


CMD ["npm","start"]

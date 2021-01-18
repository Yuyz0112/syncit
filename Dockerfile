FROM node:14.9.0 as build-deps

RUN mkdir /usr/app

WORKDIR /usr/app

COPY . /usr/app

RUN npm install

RUN sh -c "yarn install && yarn lerna run prepublish"

EXPOSE 5000

CMD yarn --cwd packages/ui dev
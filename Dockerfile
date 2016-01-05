FROM ubuntu
MAINTAINER Joaquin Bucca
RUN apt-get update && \
    apt-get -y install curl && \
    curl -sL https://deb.nodesource.com/setup | sudo bash - && \
    apt-get -y install python build-essential nodejs

RUN npm install -g nodemon bower gulp yo generator-express

RUN mkdir -p /src

WORKDIR /src
ADD . /src

EXPOSE 3000

CMD ["gulp"]

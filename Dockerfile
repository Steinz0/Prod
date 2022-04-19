FROM beevelop/nodejs-python:nightly
WORKDIR /foot
RUN mkdir /foot/app
RUN mkdir /foot/gameEngine
RUN mkdir /foot/logsGames
COPY /app/package.json /foot/app
RUN npm install --prefix /foot/app
COPY /app/dist /foot/app/dist
COPY /app/webapp /foot/app/webapp
COPY /app/*.js /foot/app/
COPY /app/Data /foot/app/
COPY /gameEngine /foot/gameEngine
COPY /logsGames /foot/logsGames 
COPY run_celery.sh /foot
RUN pip install -e /foot/gameEngine --user
RUN pip install celery==4.4.6
RUN pip install typing-extensions
CMD ./run_celery.sh
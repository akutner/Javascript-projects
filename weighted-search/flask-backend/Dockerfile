FROM python:3.6

WORKDIR /flask-backend

ADD . /flask-backend 

RUN pip install --trusted-host pypi.python.org -r requirements.txt
RUN python -m spacy download en

EXPOSE 5000

ENV NAME flask-backend

CMD ["python","app.py"]

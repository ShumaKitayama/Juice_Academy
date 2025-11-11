# backend/Dockerfile
FROM golang:1.20-alpine

WORKDIR /app

COPY go.mod .
COPY go.sum .
RUN go mod download

COPY . .

RUN go build -o main .

RUN adduser -D -s /bin/sh appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["./main"]
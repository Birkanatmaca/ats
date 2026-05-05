FROM golang:1.23-alpine AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/ots-api ./cmd/api

FROM alpine:3.21

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /out/ots-api /app/ots-api

USER app
EXPOSE 8080

ENTRYPOINT ["/app/ots-api"]


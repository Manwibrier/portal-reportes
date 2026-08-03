FROM alpine:3.22

ARG PB_VERSION=0.39.10
ARG TARGETARCH

RUN apk add --no-cache ca-certificates unzip wget su-exec \
    && addgroup -S pocketbase \
    && adduser -S -G pocketbase -h /pb pocketbase \
    && mkdir -p /pb/pb_data /pb/pb_migrations \
    && wget -q -O /tmp/pocketbase.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
    && unzip /tmp/pocketbase.zip -d /pb \
    && rm -f /tmp/pocketbase.zip \
    && chmod +x /pb/pocketbase

COPY pb_migrations /pb/pb_migrations
COPY entrypoint.sh /usr/local/bin/pocketbase-entrypoint
RUN chmod +x /usr/local/bin/pocketbase-entrypoint

WORKDIR /pb
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/pocketbase-entrypoint"]

FROM postgres:15-alpine

# Install git to grab the initialization script from the repo
RUN apk add --no-cache git

# Clone the repo into a temporary directory
RUN git clone -b backend https://github.com/Kr1sh-gupta/OpticRetail.git /tmp/repo

# Copy the initialization script to Postgres's auto-init directory
RUN cp /tmp/repo/init.sql /docker-entrypoint-initdb.d/init.sql

# Cleanup the repo to keep the image small
RUN rm -rf /tmp/repo

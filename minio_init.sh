#!/bin/sh
set -e

mc alias set minio http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

mc mb -p minio/avatars || true
mc mb -p minio/posts || true
mc mb -p minio/chat-avatars || true

mc anonymous set public minio/avatars
mc anonymous set public minio/posts
mc anonymous set public minio/chat-avatars
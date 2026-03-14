from contextlib import asynccontextmanager
from typing import BinaryIO

from aiobotocore.session import get_session


class S3Storage:
    def __init__(
            self,
            access_key: str,
            secret_key: str,
            bucket_name: str,
            internal_endpoint_url: str,
            public_endpoint_url: str
        ):
        self.config = {
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key
        }
        self.bucket_name = bucket_name
        self.internal_endpoint = internal_endpoint_url
        self.public_endpoint = public_endpoint_url
        self.session = get_session()

    @asynccontextmanager
    async def get_internal_client(self):
        async with self.session.create_client(
            "s3",
            endpoint_url=self.internal_endpoint,
            **self.config
        ) as client:
            yield client

    @asynccontextmanager
    async def get_public_client(self):
        async with self.session.create_client(
            "s3",
            endpoint_url=self.public_endpoint,
            **self.config
        ) as client:
            yield client

    async def upload(self, object_name: str, body: BinaryIO, content_type: str) -> None:
        async with self.get_internal_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=body,
                ContentType=content_type
            )

    async def delete(self, object_key: str) -> None:
        async with self.get_internal_client() as client:
            await client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )

    def get_file_url(self, object_key):
        return f"{self.public_endpoint}/media/{self.bucket_name}/{object_key}"

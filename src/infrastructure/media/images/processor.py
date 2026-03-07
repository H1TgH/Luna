from io import BytesIO
from typing import BinaryIO

from PIL import Image


class ImageProcessor:
    def convert_to_webp(self, image_stream: BinaryIO):
        image_stream.seek(0)
        with Image.open(image_stream) as image:
            converted_image = BytesIO()
            image.save(converted_image, format="WEBP", quality=75, optimize=True)
            converted_image.seek(0)

        return converted_image

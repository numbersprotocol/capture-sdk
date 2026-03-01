"""Tests for the Capture client."""

import io

import pytest

from numbersprotocol_capture import AsyncCapture, Capture, ValidationError


class TestCaptureClient:
    """Tests for Capture client initialization."""

    def test_init_with_token(self) -> None:
        """Test client initialization with token."""
        capture = Capture(token="test-token")
        assert capture._token == "test-token"
        assert capture._testnet is False
        capture.close()

    def test_init_without_token_raises_error(self) -> None:
        """Test that missing token raises ValidationError."""
        with pytest.raises(ValidationError, match="token is required"):
            Capture(token="")

    def test_init_with_testnet(self) -> None:
        """Test client initialization with testnet flag."""
        capture = Capture(token="test-token", testnet=True)
        assert capture._testnet is True
        capture.close()

    def test_init_with_custom_base_url(self) -> None:
        """Test client initialization with custom base URL."""
        capture = Capture(token="test-token", base_url="https://custom.api.com")
        assert capture._base_url == "https://custom.api.com"
        capture.close()

    def test_context_manager(self) -> None:
        """Test client as context manager."""
        with Capture(token="test-token") as capture:
            assert capture._token == "test-token"


class TestValidation:
    """Tests for input validation."""

    def test_register_empty_file_raises_error(self, tmp_path) -> None:
        """Test that empty file raises ValidationError."""
        empty_file = tmp_path / "empty.txt"
        empty_file.write_bytes(b"")

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="file cannot be empty"):
                capture.register(str(empty_file))

    def test_register_headline_too_long_raises_error(self, tmp_path) -> None:
        """Test that headline over 25 chars raises ValidationError."""
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"test content")

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="headline must be 25 characters or less"):
                capture.register(str(test_file), headline="a" * 30)

    def test_register_binary_without_filename_raises_error(self) -> None:
        """Test that binary input without filename raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="filename is required"):
                capture.register(b"test content")

    def test_get_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.get("")

    def test_update_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError."""
        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="nid is required"):
                capture.update("", caption="test")

    def test_register_file_like_empty_raises_error(self) -> None:
        """Test that empty file-like object raises ValidationError."""
        empty_stream = io.BytesIO(b"")
        empty_stream.name = "empty.txt"  # type: ignore[attr-defined]

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="file cannot be empty"):
                capture.register(empty_stream)

    def test_register_file_like_without_filename_raises_error(self) -> None:
        """Test that file-like object without name or filename option raises ValidationError."""
        stream = io.BytesIO(b"some content")

        with Capture(token="test-token") as capture:
            with pytest.raises(ValidationError, match="filename is required"):
                capture.register(stream)


class TestFileHandleStreaming:
    """Tests for file-like object (streaming) input support."""

    def test_normalize_file_accepts_io_bytes(self, tmp_path) -> None:
        """Test that IO[bytes] objects are accepted by _normalize_file."""
        from numbersprotocol_capture.client import _normalize_file

        test_file = tmp_path / "photo.jpg"
        test_file.write_bytes(b"fake image data")

        with test_file.open("rb") as f:
            data, filename, mime_type = _normalize_file(f)

        assert filename == "photo.jpg"
        assert mime_type == "image/jpeg"

    def test_normalize_file_uses_name_attribute(self) -> None:
        """Test that file-like objects use their name attribute for filename detection."""
        from numbersprotocol_capture.client import _normalize_file

        stream = io.BytesIO(b"data")
        stream.name = "document.pdf"  # type: ignore[attr-defined]

        data, filename, mime_type = _normalize_file(stream)

        assert filename == "document.pdf"
        assert mime_type == "application/pdf"

    def test_normalize_file_uses_options_filename_for_io(self) -> None:
        """Test that filename option is used when IO object has no name attribute."""
        from numbersprotocol_capture.client import _normalize_file
        from numbersprotocol_capture.types import RegisterOptions

        stream = io.BytesIO(b"data")
        options = RegisterOptions(filename="image.png")

        data, filename, mime_type = _normalize_file(stream, options)

        assert filename == "image.png"
        assert mime_type == "image/png"

    def test_normalize_path_returns_file_handle(self, tmp_path) -> None:
        """Test that str/Path inputs return a file handle instead of bytes."""
        from numbersprotocol_capture.client import _normalize_file

        test_file = tmp_path / "video.mp4"
        test_file.write_bytes(b"fake video content")

        data, filename, mime_type = _normalize_file(str(test_file))
        try:
            assert hasattr(data, "read")  # file-like object
            assert filename == "video.mp4"
            assert mime_type == "video/mp4"
        finally:
            data.close()  # type: ignore[union-attr]

    def test_register_path_closes_file_handle_after_upload(self, tmp_path, respx_mock) -> None:
        """Test that file handles opened from paths are closed after upload."""
        import respx
        from httpx import Response

        test_file = tmp_path / "photo.jpg"
        test_file.write_bytes(b"fake image data")

        mock_response = {
            "id": "bafybeitest",
            "asset_file_name": "photo.jpg",
            "asset_file_mime_type": "image/jpeg",
        }

        with respx.mock:
            respx.post("https://api.numbersprotocol.io/api/v3/assets/").mock(
                return_value=Response(201, json=mock_response)
            )

            with Capture(token="test-token") as capture:
                asset = capture.register(str(test_file))

        assert asset.nid == "bafybeitest"
        assert asset.filename == "photo.jpg"

    def test_register_io_bytes_input(self, respx_mock) -> None:
        """Test that IO[bytes] file objects can be registered."""
        import respx
        from httpx import Response

        stream = io.BytesIO(b"fake image data")
        stream.name = "photo.png"  # type: ignore[attr-defined]

        mock_response = {
            "id": "bafybeitest",
            "asset_file_name": "photo.png",
            "asset_file_mime_type": "image/png",
        }

        with respx.mock:
            respx.post("https://api.numbersprotocol.io/api/v3/assets/").mock(
                return_value=Response(201, json=mock_response)
            )

            with Capture(token="test-token") as capture:
                asset = capture.register(stream)

        assert asset.nid == "bafybeitest"


class TestAsyncCapture:
    """Tests for AsyncCapture client."""

    def test_async_capture_init_with_token(self) -> None:
        """Test AsyncCapture initialization with token."""
        import asyncio

        async def _run() -> None:
            capture = AsyncCapture(token="test-token")
            assert capture._token == "test-token"
            assert capture._testnet is False
            await capture.aclose()

        asyncio.run(_run())

    def test_async_capture_init_without_token_raises_error(self) -> None:
        """Test that AsyncCapture raises ValidationError when token is missing."""
        with pytest.raises(ValidationError, match="token is required"):
            AsyncCapture(token="")

    def test_async_capture_context_manager(self) -> None:
        """Test AsyncCapture async context manager."""
        import asyncio

        async def _run() -> None:
            async with AsyncCapture(token="test-token") as capture:
                assert capture._token == "test-token"

        asyncio.run(_run())

    def test_async_capture_get_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError in async get."""
        import asyncio

        async def _run() -> None:
            async with AsyncCapture(token="test-token") as capture:
                with pytest.raises(ValidationError, match="nid is required"):
                    await capture.get("")

        asyncio.run(_run())

    def test_async_capture_update_empty_nid_raises_error(self) -> None:
        """Test that empty NID raises ValidationError in async update."""
        import asyncio

        async def _run() -> None:
            async with AsyncCapture(token="test-token") as capture:
                with pytest.raises(ValidationError, match="nid is required"):
                    await capture.update("", caption="test")

        asyncio.run(_run())

    def test_async_capture_register_empty_file_raises_error(self, tmp_path) -> None:
        """Test that empty file raises ValidationError in async register."""
        import asyncio

        empty_file = tmp_path / "empty.txt"
        empty_file.write_bytes(b"")

        async def _run() -> None:
            async with AsyncCapture(token="test-token") as capture:
                with pytest.raises(ValidationError, match="file cannot be empty"):
                    await capture.register(str(empty_file))

        asyncio.run(_run())

    def test_async_capture_register_headline_too_long_raises_error(self, tmp_path) -> None:
        """Test that headline over 25 chars raises ValidationError in async register."""
        import asyncio

        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"test content")

        async def _run() -> None:
            async with AsyncCapture(token="test-token") as capture:
                with pytest.raises(
                    ValidationError, match="headline must be 25 characters or less"
                ):
                    await capture.register(str(test_file), headline="a" * 30)

        asyncio.run(_run())

    def test_async_capture_register_returns_asset(self, tmp_path) -> None:
        """Test that AsyncCapture.register returns an Asset on success."""
        import asyncio

        import respx
        from httpx import Response

        test_file = tmp_path / "photo.jpg"
        test_file.write_bytes(b"fake image data")

        mock_response = {
            "id": "bafybeiasync",
            "asset_file_name": "photo.jpg",
            "asset_file_mime_type": "image/jpeg",
        }

        async def _run() -> None:
            with respx.mock:
                respx.post("https://api.numbersprotocol.io/api/v3/assets/").mock(
                    return_value=Response(201, json=mock_response)
                )

                async with AsyncCapture(token="test-token") as capture:
                    asset = await capture.register(str(test_file))

            assert asset.nid == "bafybeiasync"
            assert asset.filename == "photo.jpg"

        asyncio.run(_run())

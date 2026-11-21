"""
Module: preprocessing.ingest_stream
Description: Stream and ingest a targeted sample of Amazon Reviews 2023 (Electronics)
             from Hugging Face without downloading the entire multi-gigabyte repository.
Principles: Follows 'clean-code' standards and 'hugging-face-datasets' streaming protocols.
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Optional
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

HF_STREAM_URL = (
    "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/"
    "raw/review_categories/Electronics.jsonl"
)
DEFAULT_SAMPLE_SIZE = 50_000
DEFAULT_RAW_OUTPUT = Path("data/raw/electronics_50k_raw.jsonl")


def stream_amazon_reviews(
    target_count: int = DEFAULT_SAMPLE_SIZE,
    output_path: Path = DEFAULT_RAW_OUTPUT,
    source_url: str = HF_STREAM_URL,
    chunk_size: int = 1024 * 1024,
) -> int:
    """Streams a specified number of review records from Hugging Face and saves to raw JSONL.
    
    Args:
        target_count: Number of JSONL records to stream.
        output_path: Path to destination file. Raw file is never mutated afterwards.
        source_url: Direct Hugging Face download URL.
        chunk_size: Stream buffer size in bytes.

    Returns:
        Number of successfully written records.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Connecting to Hugging Face stream: %s", source_url)
    logger.info("Target sample count: %d records", target_count)
    logger.info("Destination path: %s", output_path.resolve())

    headers = {"User-Agent": "Antigravity-Research/1.0 (Federated Learning Project)"}
    start_time = time.time()
    saved_count = 0

    try:
        with requests.get(source_url, headers=headers, stream=True, timeout=60) as response:
            response.raise_for_status()
            logger.info("HTTP Connection established (Status %d). Starting stream ingest...", response.status_code)

            with open(output_path, "w", encoding="utf-8") as out_file:
                for line in response.iter_lines(chunk_size=chunk_size):
                    if not line:
                        continue
                    
                    decoded_line = line.decode("utf-8")
                    # Light structural validation to ensure valid JSON before writing raw
                    json.loads(decoded_line)
                    
                    out_file.write(decoded_line + "\n")
                    saved_count += 1

                    if saved_count % 10_000 == 0:
                        elapsed = time.time() - start_time
                        logger.info("Progress: %d / %d records written (%.1fs elapsed)...", saved_count, target_count, elapsed)

                    if saved_count >= target_count:
                        break

    except Exception as exc:
        logger.error("Streaming error encountered after %d records: %s", saved_count, exc)
        raise

    total_time = time.time() - start_time
    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    logger.info("Ingest complete: %d records written in %.2f seconds (%.2f MB).", saved_count, total_time, file_size_mb)
    return saved_count


if __name__ == "__main__":
    stream_amazon_reviews()

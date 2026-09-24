import pytest
from app.agent.router import QueryRouter
from app.schemas.analysis import TaskType, ModalityType


def test_route_single_image_vqa():
    task, specialist, rationale = QueryRouter.route(
        query="Is there water in this image?",
        num_images=1,
        modalities=[ModalityType.OPTICAL]
    )
    assert task == TaskType.VQA
    assert specialist == "vqa"


def test_route_single_image_captioning():
    task, specialist, rationale = QueryRouter.route(
        query="Describe this satellite image and its land cover.",
        num_images=1,
        modalities=[ModalityType.OPTICAL]
    )
    assert task == TaskType.CAPTIONING
    assert specialist == "captioning"


def test_route_single_image_grounding():
    task, specialist, rationale = QueryRouter.route(
        query="Highlight the water body and show bounding boxes.",
        num_images=1,
        modalities=[ModalityType.OPTICAL]
    )
    assert task == TaskType.GROUNDING
    assert specialist == "grounding"


def test_route_bitemporal_change_detection():
    task, specialist, rationale = QueryRouter.route(
        query="Detect changes between these two images.",
        num_images=2,
        modalities=[ModalityType.OPTICAL, ModalityType.OPTICAL]
    )
    assert task in [TaskType.CHANGE_DETECTION, TaskType.CHANGE_VQA]
    assert specialist in ["change_detection", "change_vqa"]


def test_route_bitemporal_change_vqa():
    task, specialist, rationale = QueryRouter.route(
        query="What changed between these two images?",
        num_images=2,
        modalities=[ModalityType.OPTICAL, ModalityType.OPTICAL]
    )
    assert task == TaskType.CHANGE_VQA
    assert specialist == "change_vqa"


def test_route_optical_sar_analysis():
    task, specialist, rationale = QueryRouter.route(
        query="Use the optical and SAR images to identify built-up areas.",
        num_images=2,
        modalities=[ModalityType.OPTICAL, ModalityType.SAR]
    )
    assert task == TaskType.OPTICAL_SAR_ANALYSIS
    assert specialist == "optical_sar"

from app.evidence.geojson_export import generate_geojson
from app.schemas.analysis import (
    AnalyzeResponse, TaskType, ImageMetadata, ModalityType, EvidenceArtifact
)


def test_geojson_export():
    meta = ImageMetadata(
        id="img_sdsc",
        filename="isro_sdsc_optical.tif",
        original_name="isro_sdsc_optical.tif",
        file_path="storage/samples/isro_sdsc_optical.tif",
        width=512,
        height=512,
        bands=3,
        crs="EPSG:4326",
        bounds={"minx": 80.21, "miny": 13.71, "maxx": 80.25, "maxy": 13.75},
        modality=ModalityType.OPTICAL,
        file_size_bytes=204800,
        has_geotiff_metadata=True
    )

    art = EvidenceArtifact(
        id="art_box_1",
        type="bounding_box",
        title="Detected Launchpads",
        description="Grounded SLP launchpad structure",
        url="/api/v1/artifacts/box_1.png",
        properties={
            "boxes": [
                {
                    "label": "Second Launch Pad (SLP)",
                    "score": 0.95,
                    "box_2d": [0.45, 0.48, 0.58, 0.55]
                }
            ]
        }
    )

    resp = AnalyzeResponse(
        id="test_sess_01",
        task=TaskType.GROUNDING,
        query="Highlight launchpads",
        answer="Second Launch Pad located.",
        confidence=0.95,
        confidence_label="95% (Calibrated)",
        models=["Grounding-Specialist"],
        images=[meta],
        evidence=[art],
        trace=[],
        statistics={},
        execution_time_ms=120.0,
        status="success"
    )

    geojson_data = generate_geojson(resp)

    assert geojson_data["type"] == "FeatureCollection"
    assert "features" in geojson_data
    assert len(geojson_data["features"]) >= 2  # Scene footprint + 1 detected target

    target_feature = geojson_data["features"][1]
    assert target_feature["type"] == "Feature"
    assert target_feature["geometry"]["type"] == "Polygon"
    assert len(target_feature["geometry"]["coordinates"][0]) == 5  # Closed ring of 4 vertices + 1
    assert target_feature["properties"]["label"] == "Second Launch Pad (SLP)"

    # Coordinates must be within WGS84 bounds of SDSC SHAR
    coords = target_feature["geometry"]["coordinates"][0]
    for lon, lat in coords:
        assert 80.20 <= lon <= 80.26
        assert 13.70 <= lat <= 13.76

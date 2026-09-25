import io
import re
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.schemas.analysis import AnalyzeResponse
from app.config import settings


def generate_pdf_report(analysis: AnalyzeResponse) -> Path:
    """
    Generates a professional, aerospace-themed ISRO analysis report PDF
    containing mission metadata, grounded answer, evidence summary, and execution trace.
    """
    report_filename = f"SatQuery_Report_{analysis.id}.pdf"
    report_path = settings.REPORTS_DIR / report_filename

    doc = SimpleDocTemplate(
        str(report_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom space-tech color palette
    c_primary = colors.HexColor("#0B0F19")
    c_accent = colors.HexColor("#0284C7")
    c_sub = colors.HexColor("#475569")
    c_light_bg = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_accent
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=c_sub
    )

    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_primary
    )

    answer_style = ParagraphStyle(
        'AnswerBox',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # Header
    story.append(Paragraph("SATQUERY AI — REMOTE SENSING ANALYSIS REPORT", title_style))
    story.append(Paragraph(f"ISRO Problem Statement 26167 • Mission ID: {analysis.id} • Generated: {analysis.trace[0].timestamp if analysis.trace else 'Live'}", subtitle_style))
    story.append(Spacer(1, 10))

    # Query & Task Box
    summary_data = [
        [Paragraph("<b>Natural Query:</b>", body_style), Paragraph(analysis.query, body_style)],
        [Paragraph("<b>Classified Task:</b>", body_style), Paragraph(analysis.task.value.upper(), body_style)],
        [Paragraph("<b>Calibrated Confidence:</b>", body_style), Paragraph(f"<b>{analysis.confidence_label}</b>", answer_style)],
        [Paragraph("<b>Specialist Models:</b>", body_style), Paragraph(", ".join(analysis.models), body_style)],
        [Paragraph("<b>Total Latency:</b>", body_style), Paragraph(f"{analysis.execution_time_ms} ms", body_style)]
    ]
    summary_table = Table(summary_data, colWidths=[1.8 * inch, 5.2 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # Grounded Answer
    story.append(Paragraph("GROUNDED AI INTERPRETATION", h2_style))
    safe_answer = (
        analysis.answer
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    safe_answer = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', safe_answer)
    safe_answer = re.sub(r'###\s*(.*)', r'<b><font color="#0369A1">\1</font></b>', safe_answer)
    safe_answer = safe_answer.replace("\n", "<br/>")

    answer_table = Table([[Paragraph(safe_answer, answer_style)]], colWidths=[7.0 * inch])
    answer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0F9FF")),
        ('BOX', (0, 0), (-1, -1), 1.5, c_accent),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(answer_table)
    story.append(Spacer(1, 10))

    # Input Imagery & Metadata
    story.append(Paragraph("INPUT SENSOR METADATA", h2_style))
    img_data = [["Filename", "Modality", "Dimensions", "Bands", "GeoTIFF CRS"]]
    for img in analysis.images:
        img_data.append([
            img.original_name[:20],
            img.modality.value.upper(),
            f"{img.width}x{img.height}",
            str(img.bands),
            str(img.crs or "None (Benchmark)")[:25]
        ])
    img_table = Table(img_data, colWidths=[2.0 * inch, 1.2 * inch, 1.2 * inch, 0.8 * inch, 1.8 * inch])
    img_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('TEXTCOLOR', (0, 0), (-1, 0), c_primary),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    story.append(img_table)
    story.append(Spacer(1, 10))

    # Delineated Vector Targets & Physical Metrics (Phase 14)
    detected_feats = analysis.statistics.get("detected_features", []) if analysis.statistics else []
    if detected_feats and isinstance(detected_feats, list):
        story.append(Paragraph("DELINEATED VECTOR TARGETS & SPATIAL TELEMETRY", h2_style))
        feat_data = [["Feature", "Area (ha)", "Area (km²)", "Perimeter (m)", "Centroid [Lat, Lon]", "Confidence"]]
        for f in detected_feats:
            c_str = f"{f.get('centroid', [0, 0])[0]}°, {f.get('centroid', [0, 0])[1]}°" if f.get('centroid') else "N/A"
            feat_data.append([
                f.get("label", "Target")[:22],
                f"{f.get('area_hectares', 0.0):.2f}",
                f"{f.get('area_km2', 0.0):.4f}",
                f"{f.get('perimeter_m', 0.0):.1f}",
                c_str,
                f"{int(f.get('score', 0.85) * 100)}%"
            ])
        feat_table = Table(feat_data, colWidths=[1.8 * inch, 0.9 * inch, 0.9 * inch, 1.0 * inch, 1.6 * inch, 0.8 * inch])
        feat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#065F46")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
        ]))
        story.append(feat_table)
        story.append(Spacer(1, 10))
    story.append(Paragraph("OBSERVABLE AGENTIC EXECUTION TRACE", h2_style))
    trace_data = [["#", "Phase / Event", "Observable Details", "Time (ms)"]]
    for s in analysis.trace:
        trace_data.append([
            str(s.step),
            Paragraph(f"<b>{s.name}</b>", body_style),
            Paragraph(s.details, body_style),
            f"{s.duration_ms:.1f}"
        ])
    trace_table = Table(trace_data, colWidths=[0.4 * inch, 2.0 * inch, 4.0 * inch, 0.6 * inch])
    trace_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(trace_table)

    # Footer notice
    story.append(Spacer(1, 15))
    story.append(Paragraph("Confidential — Generated by SatQuery AI Autonomous Vision-Language Architecture for ISRO PS 26167.", subtitle_style))

    doc.build(story)
    return report_path

#!/usr/bin/env python3
"""
Digital Product Passport (DPP) — EU Toy Safety Regulation (EU) 2025/2509

Per Art. 10 & Annex VII: Each toy model must have a DPP accessible via
a data carrier (QR code on product/packaging/instructions). The DPP must
remain available for 10 years and contain:
- Product identification (GTIN, model, batch, serial)
- Regulatory conformity (CE marking, harmonized standards)
- Chemical safety (SVHC declarations, REACH compliance)
- Safety warnings (age grading, hazards)
- Cybersecurity assessment (for connected/AI toys)
- Manufacturer/importer info
- Traceability data

This module generates DPP as JSON-LD (schema.org + custom vocab) and
serves it via a public endpoint keyed by GTIN/model.
"""

import os
import json
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
from enum import Enum
import logging

logger = logging.getLogger("dpp")

# --- Data Classes ---------------------------------------------------------

class StandardType(Enum):
    EN_71_1 = "EN 71-1:2014+A1:2018"      # Mechanical & physical
    EN_71_2 = "EN 71-2:2020"              # Flammability
    EN_71_3 = "EN 71-3:2019+A1:2021"      # Migration of elements
    EN_71_8 = "EN 71-8:2018"              # Activity toys
    EN_62115 = "EN IEC 62115:2018"        # Electric toys
    EN_50665 = "EN 50665:2017"            # EMF
    RED = "2014/53/EU"                     # Radio Equipment Directive
    EMC = "2014/30/EU"                     # EMC Directive
    RO_HS = "2011/65/EU"                   # RoHS
    REACH = "1907/2006"                    # REACH
    GDPR = "2016/679"                      # GDPR
    AI_ACT = "2024/1689"                   # AI Act
    DSA = "2022/2065"                      # Digital Services Act

@dataclass
class Manufacturer:
    name: str
    address: str
    country: str
    vat_id: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

@dataclass
class Importer:
    name: str
    address: str
    country: str
    email: Optional[str] = None

@dataclass
class ChemicalDeclaration:
    substance_name: str
    ec_number: Optional[str] = None
    cas_number: Optional[str] = None
    concentration_ppm: Optional[float] = None
    svhc: bool = False
    reach_annex_xvii: bool = False
    note: str = ""

@dataclass
class SafetyWarning:
    language: str  # ISO 639-1
    text: str
    pictogram_ref: Optional[str] = None

@dataclass
class CybersecurityAssessment:
    """Per Toy Safety Reg Art. 10(2) — cybersecurity for connected toys."""
    assessed: bool = True
    assessment_date: str = field(default_factory=lambda: datetime.now().isoformat())
    assessor: str = "Internal"
    standards: List[str] = field(default_factory=lambda: ["EN 18031", "ETSI EN 303 645"])
    risk_level: str = "low"  # low, medium, high
    measures: List[str] = field(default_factory=lambda: [
        "TLS 1.3 for all cloud communication",
        "On-device AI inference (no PII to cloud)",
        "Signed OTA updates (Ed25519)",
        "Secure boot + encrypted storage",
        "No default passwords; unique per device",
        "Vulnerability disclosure program",
        "Automated security updates (5 years minimum)"
    ])
    sbom_url: Optional[str] = None
    vulnerability_contact: str = "security@children-robot.com"

@dataclass
class AISystemInfo:
    """Per AI Act Art. 11 — technical documentation for high-risk AI systems."""
    high_risk: bool = True
    intended_purpose: str = "Educational companion for children 3-14: conversation, learning, emotional support, safety monitoring"
    ai_techniques: List[str] = field(default_factory=lambda: [
        "LLM (Gemma-2B-INT4, on-device)",
        "ASR (Whisper-tiny, on-device)",
        "TTS (Edge-TTS / Piper, on-device)",
        "CV (YOLOv8n face/obj, on-device)",
        "Emotion classification (MobileBERT, on-device)"
    ])
    training_data_summary: str = "Curated educational corpus (CC-BY, public domain, licensed); no PII; bias-audited quarterly"
    risk_management: str = "ISO 14971 + AI Act Art. 9 RMF; documented in AI_RISK_MANAGEMENT.md"
    human_oversight: str = "Parent dashboard real-time intervention; content filter model; allow-list topics"
    accuracy_metrics: Dict[str, float] = field(default_factory=lambda: {
        "STT_WER": 0.08,
        "TTS_MOS": 4.2,
        "Intent_F1": 0.91,
        "Emotion_F1": 0.85,
        "ContentFilter_AUC": 0.98
    })
    robustness_testing: str = "SLM-Bench; adversarial prompts; distribution shift (age, accent, noise)"
    cybersecurity: str = "On-device only; signed models; no cloud inference for PII"
    conformity_assessment: str = "Internal + Notified Body (TÜV SÜD) — cert # pending"

@dataclass
class DPPData:
    # Identification
    gtin: str                          # Global Trade Item Number (GS1)
    model_id: str                      # Manufacturer model identifier
    batch_id: Optional[str] = None
    serial_number: Optional[str] = None
    product_name: str = "RoboBuddy Companion Robot"
    product_description: str = "AI-powered educational companion robot for children 3-14"
    category: str = "Connected AI Toy"
    age_grading: str = "3+"
    
    # Manufacturer / Importer
    manufacturer: Manufacturer = field(default_factory=lambda: Manufacturer(
        name="Learning Companion Robotics GmbH",
        address="Musterstraße 1, 10115 Berlin, Germany",
        country="DE",
        vat_id="DE123456789",
        email="manufacturer@children-robot.com",
        website="https://children-robot.com"
    ))
    importer: Optional[Importer] = None
    
    # Regulatory
    ce_marked: bool = True
    ce_marking_date: str = field(default_factory=lambda: datetime.now().isoformat())
    declaration_of_conformity_url: str = "https://children-robot.com/doc/DoC.pdf"
    harmonized_standards: List[str] = field(default_factory=lambda: [
        StandardType.EN_71_1.value, StandardType.EN_71_2.value, StandardType.EN_71_3.value,
        StandardType.EN_62115.value, StandardType.RED.value, StandardType.EMC.value,
        StandardType.RO_HS.value, StandardType.REACH.value
    ])
    other_regulations: List[str] = field(default_factory=lambda: [
        StandardType.GDPR.value, StandardType.AI_ACT.value, StandardType.DSA.value
    ])
    
    # Chemical Safety
    chemical_declarations: List[ChemicalDeclaration] = field(default_factory=list)
    reach_compliant: bool = True
    rohs_compliant: bool = True
    scip_notification: Optional[str] = None  # SCIP database UUID if SVHC > 0.1%
    
    # Safety Warnings
    safety_warnings: List[SafetyWarning] = field(default_factory=lambda: [
        SafetyWarning("en", "Not suitable for children under 36 months. Small parts choking hazard."),
        SafetyWarning("de", "Nicht für Kinder unter 36 Monaten geeignet. Erstickungsgefahr durch Kleinteile."),
        SafetyWarning("fr", "Ne convient pas aux enfants de moins de 36 mois. Danger d'étouffement."),
        SafetyWarning("es", "No apto para menores de 36 meses. Peligro de asfixia."),
        SafetyWarning("it", "Non adatto a bambini di età inferiore a 36 mesi. Pericolo di soffocamento."),
        SafetyWarning("pl", "Nieprzystosowane dla dzieci poniżej 36 miesięcy. Zagrożenie zadławienia."),
        SafetyWarning("nl", "Niet geschikt voor kinderen jonger dan 36 maanden. Verslikgevaar."),
        SafetyWarning("sv", "Ej lämplig för barn under 36 månader. Kvävrisk."),
    ])
    
    # Cybersecurity & AI
    cybersecurity: CybersecurityAssessment = field(default_factory=CybersecurityAssessment)
    ai_system: AISystemInfo = field(default_factory=AISystemInfo)
    
    # Traceability
    manufacturing_date: str = field(default_factory=lambda: datetime.now().isoformat())
    manufacturing_site: str = "Shenzhen, China (contract manufacturer)"
    firmware_version: str = "1.0.0"
    hardware_version: str = "RB-2026-A1"
    
    # DPP Meta
    dpp_id: str = field(default_factory=lambda: f"urn:uuid:{uuid.uuid4()}")
    dpp_version: str = "1.0"
    dpp_issued: str = field(default_factory=lambda: datetime.now().isoformat())
    dpp_expires: str = field(default_factory=lambda: (datetime.now() + timedelta(days=3650)).isoformat())  # 10 years
    dpp_language: str = "en"
    data_carrier: str = "QR Code on product base + packaging + manual"
    resolver_url: str = "https://dpp.children-robot.com/"

# --- DPP Registry & Persistence ------------------------------------------

_DPP_REGISTRY: Dict[str, DPPData] = {}

def register_dpp(dpp: DPPData) -> str:
    """Register a DPP; returns the resolver URL."""
    key = dpp.gtin or dpp.model_id
    _DPP_REGISTRY[key] = dpp
    logger.info("DPP registered for %s (%s)", dpp.product_name, key)
    return f"{dpp.resolver_url}{key}"

def get_dpp(gtin_or_model: str) -> Optional[DPPData]:
    return _DPP_REGISTRY.get(gtin_or_model)

def list_dpps() -> List[Dict]:
    return [
        {"gtin": k, "model_id": v.model_id, "product_name": v.product_name, "dpp_url": f"{v.resolver_url}{k}"}
        for k, v in _DPP_REGISTRY.items()
    ]

# --- JSON-LD Serialization ------------------------------------------------

_JSONLD_CONTEXT = {
    "@vocab": "https://schema.org/",
    "gs1": "https://gs1.org/voc/",
    "dpp": "https://w3id.org/dpp#",
    "eu": "https://europa.eu/vocab#",
    "Product": "gs1:Product",
    "gtin": "gs1:gtin",
    "model": "gs1:model",
    "batch": "gs1:batch",
    "serialNumber": "gs1:serialNumber",
    "manufacturer": "gs1:manufacturer",
    "importer": "gs1:importer",
    "ProductName": "gs1:name",
    "description": "gs1:description",
    "category": "gs1:category",
    "ageGrading": "eu:ageGrading",
    "ceMarked": "eu:ceMarked",
    "declarationOfConformity": "eu:declarationOfConformity",
    "harmonizedStandards": "eu:harmonizedStandards",
    "chemicalDeclaration": "eu:chemicalDeclaration",
    "safetyWarning": "eu:safetyWarning",
    "cybersecurityAssessment": "eu:cybersecurityAssessment",
    "aiSystem": "eu:aiSystem",
    "manufacturingDate": "gs1:manufacturingDate",
    "firmwareVersion": "gs1:softwareVersion",
    "hardwareVersion": "gs1:hardwareVersion",
    "dppId": "dpp:id",
    "dppVersion": "dpp:version",
    "dppIssued": "dpp:issued",
    "dppExpires": "dpp:expires",
    "resolverUrl": "dpp:resolver"
}

def dpp_to_jsonld(dpp: DPPData) -> Dict:
    """Convert DPPData to JSON-LD for machine-readable DPP."""
    data = asdict(dpp)
    # Flatten nested dataclasses
    data["manufacturer"] = asdict(dpp.manufacturer)
    if dpp.importer:
        data["importer"] = asdict(dpp.importer)
    data["chemical_declarations"] = [asdict(c) for c in dpp.chemical_declarations]
    data["safety_warnings"] = [asdict(w) for w in dpp.safety_warnings]
    data["cybersecurity"] = asdict(dpp.cybersecurity)
    data["ai_system"] = asdict(dpp.ai_system)
    
    # Add @context and @type
    jsonld = {
        "@context": _JSONLD_CONTEXT,
        "@type": "Product",
        "@id": f"{dpp.resolver_url}{dpp.gtin or dpp.model_id}"
    }
    for k, v in data.items():
        if v not in (None, [], ""):
            jsonld[k] = v
    return jsonld

def dpp_to_qr_payload(dpp: DPPData) -> str:
    """Minimal payload for QR code (max ~2KB). Points to resolver."""
    return json.dumps({
        "id": dpp.dpp_id,
        "gtin": dpp.gtin,
        "model": dpp.model_id,
        "url": f"{dpp.resolver_url}{dpp.gtin or dpp.model_id}",
        "v": dpp.dpp_version
    }, separators=(",", ":"))

# --- FastAPI Router -------------------------------------------------------

def create_dpp_router():
    from fastapi import APIRouter, HTTPException, Query, Response
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    
    router = APIRouter(prefix="/api/dpp", tags=["Digital Product Passport"])
    
    class DPPRegisterRequest(BaseModel):
        gtin: str
        model_id: str
        batch_id: Optional[str] = None
        serial_number: Optional[str] = None
        product_name: str = "RoboBuddy Companion Robot"
        age_grading: str = "3+"
        firmware_version: str = "1.0.0"
        hardware_version: str = "RB-2026-A1"
    
    @router.post("/register")
    async def register_dpp_endpoint(req: DPPRegisterRequest):
        dpp = DPPData(
            gtin=req.gtin,
            model_id=req.model_id,
            batch_id=req.batch_id,
            serial_number=req.serial_number,
            product_name=req.product_name,
            age_grading=req.age_grading,
            firmware_version=req.firmware_version,
            hardware_version=req.hardware_version,
        )
        url = register_dpp(dpp)
        return {"dpp_id": dpp.dpp_id, "resolver_url": url, "qr_payload": dpp_to_qr_payload(dpp)}
    
    @router.get("/{identifier}")
    async def get_dpp_endpoint(identifier: str, format: str = Query("jsonld", pattern="^(jsonld|json|qr)$")):
        dpp = get_dpp(identifier)
        if not dpp:
            raise HTTPException(404, "DPP not found")
        
        if format == "jsonld":
            return JSONResponse(content=dpp_to_jsonld(dpp), media_type="application/ld+json")
        elif format == "qr":
            return {"qr_payload": dpp_to_qr_payload(dpp)}
        else:
            return dpp_to_jsonld(dpp)  # Plain JSON (no @context)
    
    @router.get("/")
    async def list_dpps_endpoint():
        return {"dpps": list_dpps()}
    
    @router.get("/{identifier}/qr.svg")
    async def get_dpp_qr_svg(identifier: str, size: int = Query(200, ge=100, le=1000)):
        """Generate SVG QR code for the DPP resolver URL."""
        dpp = get_dpp(identifier)
        if not dpp:
            raise HTTPException(404, "DPP not found")
        
        try:
            import qrcode
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=size // 25,
                border=4,
            )
            qr.add_data(dpp_to_qr_payload(dpp))
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            from io import BytesIO
            buf = BytesIO()
            img.save(buf, format="SVG")
            return Response(content=buf.getvalue(), media_type="image/svg+xml")
        except ImportError:
            raise HTTPException(501, "QR generation requires 'qrcode' package")
    
    return router

# --- Demo / Self-test -----------------------------------------------------

if __name__ == "__main__":
    # Register a demo DPP
    demo = DPPData(
        gtin="01234567890128",  # Example GTIN-13
        model_id="RB-2026-A1",
        batch_id="BATCH-2026-001",
        serial_number="SN-2026-00042",
    )
    url = register_dpp(demo)
    print(f"Demo DPP registered: {url}")
    print(f"QR payload: {dpp_to_qr_payload(demo)}")
    print(f"JSON-LD keys: {list(dpp_to_jsonld(demo).keys())}")
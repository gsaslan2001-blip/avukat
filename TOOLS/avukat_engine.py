#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AVUKAT AI SKILL — 2 AŞAMALI RAG YÖNLENDİRİCİ VE ATIF/USUL DOĞRULAMA MOTORU

Okunan konfigürasyonlar:
  - ./config/routing_rules.yaml
  - ./config/citation_validator.json

Gereksinimler:
  pip install pyyaml
  (yerel LLM için) pip install requests

Kullanım:
  python TOOLS/avukat_engine.py --test
  python TOOLS/avukat_engine.py --validate dosya.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

try:
    import yaml
except ImportError:
    print("HATA: PyYAML gerekli. Kurulum: pip install pyyaml", file=sys.stderr)
    raise


# ============================================================================
# VERİ YAPILARI
# ============================================================================

@dataclass
class RoutedContext:
    """RAG yönlendiricisinin bir aşama için topladığı bağlam ve üstveriler."""
    stage: int
    matched_procedural_routes: List[str] = field(default_factory=list)
    matched_crime_routes: List[str] = field(default_factory=list)
    detected_tck_articles: List[str] = field(default_factory=list)
    stage_1_focus_points: List[str] = field(default_factory=list)
    mandatory_warnings: List[str] = field(default_factory=list)
    loaded_files: List[str] = field(default_factory=list)
    missing_files: List[str] = field(default_factory=list)
    combined_rag_text: str = ""
    verified_ek_pairs: Set[Tuple[str, str]] = field(default_factory=set)
    temperature: float = 0.15


@dataclass
class ValidationIssue:
    issue_type: str          # HALLUCINATED_CITATION | BANNED_RULE | JURISDICTION_WARN | CHECKLIST_MISSING
    severity: str            # CRITICAL | WARNING
    original_text: str
    message: str
    replacement_applied: Optional[str] = None


@dataclass
class ValidationResult:
    is_valid: bool
    sanitized_petition: str
    issues: List[ValidationIssue] = field(default_factory=list)
    verified_citations_kept: List[str] = field(default_factory=list)
    hallucinated_citations_removed: List[str] = field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "CRITICAL")

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "WARNING")


# ============================================================================
# 1. HİBRİT RAG YÖNLENDİRİCİ (routing_rules.yaml)
# ============================================================================

class LegalKnowledgeRouter:
    """
    routing_rules.yaml kurallarını işletir.
      Aşama 1: suç ayrım matrisleri + 5 soru odak noktaları
      Aşama 2: mevzuat + şerh + içtihat + şablon, ve doğrulanmış künye beyaz listesi
    """

    EK_EXTRACTION_PATTERN = re.compile(
        r"(?:E\.?\s*|Esas\s*[:No\.]*\s*)?(?P<esas>\d{4}/(?:\d+-)?\d+)\s*(?:E\.?|Esas)?\s*[,/-]\s*"
        r"(?:K\.?\s*|Karar\s*[:No\.]*\s*)?(?P<karar>\d{4}/\d+)\s*(?:K\.?|Karar)?",
        re.IGNORECASE,
    )

    TCK_MENTION_PATTERN = re.compile(
        r"(?:TCK|m\.|madde)\s*(?P<madde>\d{1,3}(?:/\d+(?:-[a-zçğıöşü])?)?)", re.IGNORECASE
    )

    def __init__(self, base_dir: Path, routing_yaml_path: Optional[Path] = None):
        self.base_dir = Path(base_dir)
        self.routing_yaml_path = routing_yaml_path or (self.base_dir / "config" / "routing_rules.yaml")
        if not self.routing_yaml_path.exists():
            raise FileNotFoundError(f"Routing dosyası bulunamadı: {self.routing_yaml_path}")
        with self.routing_yaml_path.open("r", encoding="utf-8") as f:
            self.rules: Dict[str, Any] = yaml.safe_load(f) or {}
        self._path_map: Dict[str, str] = self.rules.get("path_map", {}) or {}

    # ------------------------------------------------------------------
    @staticmethod
    def _normalize_tr(text: str) -> str:
        return text.replace("İ", "i").replace("I", "ı").lower()

    def _resolve_path(self, rel_path: str) -> str:
        """Taslak yolunu depodaki gerçek yola çevirir."""
        if "#" in rel_path:
            head, anchor = rel_path.split("#", 1)
            resolved = self._path_map.get(head, head)
            return f"{resolved}#{anchor}"
        return self._path_map.get(rel_path, rel_path)

    def _detect_routes_and_articles(self, user_text: str) -> Tuple[List[str], List[str], List[str]]:
        norm_text = self._normalize_tr(user_text)

        matched_proc: List[str] = []
        for route_name, cfg in (self.rules.get("procedural_routes") or {}).items():
            keywords = [self._normalize_tr(k) for k in cfg.get("trigger_keywords", [])]
            if any(kw in norm_text for kw in keywords):
                matched_proc.append(route_name)

        civil_hits: List[str] = []
        for route_name, cfg in (self.rules.get("civil_routes") or {}).items():
            keywords = [self._normalize_tr(k) for k in cfg.get("trigger_keywords", [])]
            if any(kw in norm_text for kw in keywords):
                civil_hits.append(route_name)

        if not matched_proc and not civil_hits:
            matched_proc.append("sorusturma_sikayet")  # fail-safe: en geniş rota

        matched_crimes: List[str] = []
        detected_tck: Set[str] = set()

        for match in self.TCK_MENTION_PATTERN.finditer(user_text):
            detected_tck.add(match.group("madde"))

        for cat_name, cfg in (self.rules.get("crime_category_routes") or {}).items():
            keywords = [self._normalize_tr(k) for k in cfg.get("trigger_keywords", [])]
            tck_range = [str(m) for m in cfg.get("tck_range", [])]

            kw_hit = any(kw in norm_text for kw in keywords)
            tck_hit = any(
                any(det == r or det.startswith(f"{r}/") for r in tck_range) for det in detected_tck
            )
            if kw_hit or tck_hit:
                matched_crimes.append(cat_name)
                for r in tck_range:
                    if f" {r} " in f" {norm_text} ":
                        detected_tck.add(r)

        # Özel hukuk rotaları crime route gibi taşınır (aynı yükleyici kullanılır)
        matched_crimes.extend(civil_hits)

        return matched_proc, matched_crimes, sorted(detected_tck)

    # ------------------------------------------------------------------
    def _read_file_with_anchor(self, rel_path_with_anchor: str) -> Tuple[str, Set[Tuple[str, str]], bool]:
        """Dosyayı okur; çapa varsa ilgili blokları süzer; gerçek E/K çiftlerini çıkarır."""
        resolved = self._resolve_path(rel_path_with_anchor)
        if "#" in resolved:
            rel_path, anchor = resolved.split("#", 1)
        else:
            rel_path, anchor = resolved, None

        # Glob desteği (örn. "04_ictihat_ve_emsal_bankasi/yargitay_cgk/")
        if rel_path.endswith("/"):
            candidates = sorted((self.base_dir / rel_path).glob("*.md")) + sorted(
                (self.base_dir / rel_path).glob("*.jsonl")
            )
        else:
            p = self.base_dir / rel_path
            candidates = [p] if p.exists() else []

        if not candidates:
            return f"[BİLGİ: '{rel_path}' bulunamadı — yol henüz doldurulmamış.]\n", set(), False

        blocks: List[str] = []
        pairs: Set[Tuple[str, str]] = set()

        for full_path in candidates:
            try:
                raw = full_path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue

            if full_path.suffix.lower() == ".jsonl":
                lines_out: List[str] = []
                for line in raw.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        lines_out.append(line)
                        continue
                    esas = str(obj.get("esas_no", "")).strip()
                    karar = str(obj.get("karar_no", "")).strip()
                    if esas and karar:
                        pairs.add((esas, karar))
                    lines_out.append(
                        f"- [{obj.get('merci', 'Yargıtay')} | E. {esas}, K. {karar} | "
                        f"T. {obj.get('tarih', '-')}]: {obj.get('ilke_ozeti', obj.get('metin', ''))}"
                    )
                content = "\n".join(lines_out)
            else:
                content = raw
                if anchor:
                    tokens = [t for t in anchor.lower().split("_") if t]
                    picked = [
                        blk.strip()
                        for blk in re.split(r"(?=\n##?\s+)", raw)
                        if any(tok in blk.lower() for tok in tokens)
                    ]
                    if picked:
                        content = "\n\n".join(picked)

            for m in self.EK_EXTRACTION_PATTERN.finditer(content):
                pairs.add((m.group("esas").strip(), m.group("karar").strip()))

            blocks.append(f"=== KAYNAK: {full_path.relative_to(self.base_dir).as_posix()} ===\n{content.strip()}\n")

        return "\n".join(blocks), pairs, True

    @staticmethod
    def _add_unique(target: List[str], paths: List[str]) -> None:
        for p in paths:
            if p not in target:
                target.append(p)

    # ------------------------------------------------------------------
    def build_stage_1_context(self, user_story: str) -> RoutedContext:
        cfg = (self.rules.get("global_context") or {}).get("stage_1_questioning", {}) or {}
        proc, crimes, tck = self._detect_routes_and_articles(user_story)

        ctx = RoutedContext(
            stage=1,
            matched_procedural_routes=proc,
            matched_crime_routes=crimes,
            detected_tck_articles=tck,
            temperature=float(cfg.get("temperature", 0.15)),
        )

        files: List[str] = []
        self._add_unique(files, cfg.get("always_load", []) or [])

        for key in crimes:
            c = (self.rules.get("crime_category_routes") or {}).get(key) or \
                (self.rules.get("civil_routes") or {}).get(key) or {}
            ctx.stage_1_focus_points.extend(c.get("stage_1_focus_matrix", []) or [])
            # Aşama 1'de yalnızca ayrım matrisleri yüklenir (bağlam tasarrufu)
            for p in c.get("load_doctrine", []) or []:
                if "suc_ayrim_matrisleri" in p:
                    self._add_unique(files, [p])
            self._add_unique(files, c.get("load_workflows", []) or [])

        blocks: List[str] = []
        for f in files:
            text, pairs, ok = self._read_file_with_anchor(f)
            (ctx.loaded_files if ok else ctx.missing_files).append(f)
            ctx.verified_ek_pairs.update(pairs)
            blocks.append(text)

        ctx.combined_rag_text = "\n".join(blocks)
        return ctx

    # ------------------------------------------------------------------
    def build_stage_2_context(
        self,
        user_story: str,
        user_answers: str,
        explicit_tck_codes: Optional[List[str]] = None,
    ) -> RoutedContext:
        combined = f"{user_story}\n{user_answers}"
        cfg = (self.rules.get("global_context") or {}).get("stage_2_drafting", {}) or {}
        proc, crimes, tck = self._detect_routes_and_articles(combined)

        if explicit_tck_codes:
            for c in explicit_tck_codes:
                if c not in tck:
                    tck.append(c)

        ctx = RoutedContext(
            stage=2,
            matched_procedural_routes=proc,
            matched_crime_routes=crimes,
            detected_tck_articles=sorted(tck),
            temperature=float(cfg.get("temperature", 0.10)),
        )

        files: List[str] = []
        self._add_unique(files, cfg.get("always_load", []) or [])

        for key in proc:
            p = (self.rules.get("procedural_routes") or {}).get(key) or {}
            for k in ("load_legislation", "load_doctrine", "load_precedents", "load_templates", "load_workflows"):
                self._add_unique(files, p.get(k, []) or [])

        for key in crimes:
            c = (self.rules.get("crime_category_routes") or {}).get(key) or \
                (self.rules.get("civil_routes") or {}).get(key) or {}
            ctx.stage_1_focus_points.extend(c.get("stage_1_focus_matrix", []) or [])
            for k in ("load_legislation", "load_doctrine", "load_precedents", "load_templates", "load_workflows"):
                self._add_unique(files, c.get(k, []) or [])

        # Çapraz kesen enjeksiyonlar
        for inj in self.rules.get("cross_cutting_injections", []) or []:
            triggers = [str(x) for x in inj.get("when_tck_in", []) or []]
            hit = any(
                det == t or det.startswith(f"{t}/") or t.startswith(f"{det}/")
                for det in tck
                for t in triggers
            )
            if hit:
                self._add_unique(files, inj.get("inject_files", []) or [])
                if inj.get("mandatory_warning"):
                    ctx.mandatory_warnings.append(inj["mandatory_warning"])

        # Sınır koruması
        cap = int((self.rules.get("guardrails") or {}).get("max_files_per_query", 14))
        if len(files) > cap:
            files = files[:cap]

        blocks: List[str] = []
        for f in files:
            text, pairs, ok = self._read_file_with_anchor(f)
            (ctx.loaded_files if ok else ctx.missing_files).append(f)
            ctx.verified_ek_pairs.update(pairs)
            blocks.append(text)

        ctx.combined_rag_text = "\n".join(blocks)
        return ctx


# ============================================================================
# 2. ATIF VE USUL DOĞRULAYICI (citation_validator.json)
# ============================================================================

class CitationAndProcedureValidator:
    """
    1. Uydurma Yargıtay künyelerini yakalar → ilkesel atfa çevirir.
    2. Mülga kanun ve süre hatalarını yakalar → düzeltir.
    3. 5235 görev matrisini denetler.
    4. Zorunlu dilekçe unsurlarını kontrol eder.
    """

    CITATION_FINDER = re.compile(
        r"Yargıtay\s+"
        r"(?P<merci>İBK|İçtihadı\s+Birleştirme\s+Kurulu|CGK|Ceza\s+Genel\s+Kurulu|(?:[1-9]|1[0-9]|2[0-3])\.\s*(?:CD|Ceza\s+Dairesi))"
        r"['’]?[nNuÜıİi]*\s*"
        r"(?:\d{2}\.\d{2}\.\d{4}\s*(?:T\.|tarihli)\s*(?:ve|,)?\s*)?"
        r"(?:E\.?\s*|Esas\s*)?(?P<esas>\d{4}/(?:\d+-)?\d+)\s*(?:E\.?|Esas)?\s*[,/-]\s*"
        r"(?:K\.?\s*|Karar\s*)?(?P<karar>\d{4}/\d+)\s*(?:K\.?|Karar)?"
        r"(?:\s*sayılı\s*(?:ilamı|kararı)[ndaek]*)?",
        re.IGNORECASE,
    )

    # Süre hatalarını yapısal olarak yakalayan desen
    SURE_HATASI = re.compile(
        r"(?P<sayi>\d{1,2})\s*(?P<birim>gün|hafta)\s*(?:içinde|lük|lik)?\s*"
        r"(?P<islem>itiraz|istinaf|temyiz|başvuru)",
        re.IGNORECASE,
    )

    def __init__(self, validator_json_path: Path):
        self.path = Path(validator_json_path)
        if not self.path.exists():
            raise FileNotFoundError(f"Validator dosyası bulunamadı: {self.path}")
        with self.path.open("r", encoding="utf-8") as f:
            self.schema: Dict[str, Any] = json.load(f)

        self.guard = self.schema.get("hallucination_guardrails", {}) or {}
        self.fallbacks = self.guard.get("fallback_principle_templates", {}) or {}
        self.banned = self.schema.get("banned_repealed_laws_and_outdated_rules", []) or []
        self.jurisdiction = self.schema.get("court_jurisdiction_matrix_5235_sk", {}) or {}
        self.checklist = self.schema.get("mandatory_petition_checklist", {}) or {}

    # ------------------------------------------------------------------
    def _fix_sure_errors(self, text: str, issues: List[ValidationIssue]) -> str:
        """'7 gün içinde itiraz' gibi hataları yapısal olarak 'iki hafta içinde itiraz'a çevirir."""
        def repl(m: re.Match) -> str:
            sayi = int(m.group("sayi"))
            birim = m.group("birim").lower()
            islem = m.group("islem")
            gun = sayi * 7 if birim.startswith("hafta") else sayi

            # Doğru süreler (7 gün İİK ödeme emri, 30 gün AYM/İYUK) korunur
            if gun in (7,) and islem.lower() in ("itiraz",) and "icra" in text.lower():
                return m.group(0)
            if gun in (30, 60):
                return m.group(0)
            if gun == 14:
                return m.group(0)

            if gun in (7, 15, 10):
                yeni = f"iki hafta içinde {islem}"
                issues.append(
                    ValidationIssue(
                        issue_type="BANNED_RULE",
                        severity="CRITICAL",
                        original_text=m.group(0),
                        message=(
                            f"Kanun yolu süresi hatası: '{m.group(0)}'. Yürürlükteki CMK m. 173, 268, "
                            f"273, 291 uyarınca süre İKİ HAFTADIR."
                        ),
                        replacement_applied=yeni,
                    )
                )
                return yeni
            return m.group(0)

        return self.SURE_HATASI.sub(repl, text)

    # ------------------------------------------------------------------
    def validate_and_sanitize(
        self,
        petition_text: str,
        verified_ek_pairs: Set[Tuple[str, str]],
        detected_tck_articles: Optional[List[str]] = None,
    ) -> ValidationResult:
        sanitized = petition_text
        issues: List[ValidationIssue] = []
        kept: List[str] = []
        removed: List[str] = []

        # ---- ADIM 1: Yargıtay künye halüsinasyonu ----
        if not self.guard.get("allow_unverified_case_numbers", False):
            def repl(m: re.Match) -> str:
                full = m.group(0)
                merci = m.group("merci").upper()
                esas = m.group("esas").strip()
                karar = m.group("karar").strip()

                if (esas, karar) in verified_ek_pairs:
                    kept.append(f"{merci} E. {esas}, K. {karar}")
                    return full

                removed.append(full)
                is_ust = any(t in merci for t in ("CGK", "GENEL", "İBK", "BİRLEŞTİRME"))
                key = "yargitay_cgk" if is_ust else "yargitay_daire"
                fallback = self.fallbacks.get(key, "Yargıtay'ın yerleşik içtihatlarında kabul edildiği üzere")
                fallback = fallback.rstrip(";")

                issues.append(
                    ValidationIssue(
                        issue_type="HALLUCINATED_CITATION",
                        severity="CRITICAL",
                        original_text=full,
                        message=(
                            f"RAG bilgi tabanında doğrulanamayan künye ({esas} E., {karar} K.) "
                            f"yakalandı ve ilkesel atfa dönüştürüldü."
                        ),
                        replacement_applied=fallback,
                    )
                )
                return fallback

            sanitized = self.CITATION_FINDER.sub(repl, sanitized)

        # ---- ADIM 2: Yasaklı kalıplar (mülga kanun, HAGB, süre) ----
        for rule in self.banned:
            rid = rule.get("id", "?")
            msg = rule.get("error_message", "")
            for pat in rule.get("forbidden_patterns", []) or []:
                if re.search(re.escape(pat), sanitized, re.IGNORECASE):
                    issues.append(
                        ValidationIssue(
                            issue_type="BANNED_RULE",
                            severity="CRITICAL",
                            original_text=pat,
                            message=f"[{rid}] {msg}",
                        )
                    )

        # ---- ADIM 3: Yapısal süre denetimi ----
        sanitized = self._fix_sure_errors(sanitized, issues)

        # ---- ADIM 4: 5235 görev denetimi ----
        if detected_tck_articles:
            agir_roots = {"81", "82", "148", "149", "250", "252", "188", "302", "309", "312"}
            needs_agir = any(
                a.split("/")[0] in agir_roots for a in detected_tck_articles
            )
            up = sanitized.upper()
            if needs_agir and ("ASLİYE CEZA MAHKEMESİ" in up) and ("AĞIR CEZA" not in up):
                issues.append(
                    ValidationIssue(
                        issue_type="JURISDICTION_WARN",
                        severity="CRITICAL",
                        original_text="ASLİYE CEZA MAHKEMESİNE",
                        message=(
                            f"Tespit edilen maddeler ({', '.join(detected_tck_articles)}) 5235 s.K. m. 12 "
                            f"kapsamında Ağır Ceza görev alanına girmektedir; başlıkta Asliye Ceza yazılmış."
                        ),
                    )
                )
            # TCK 158 özel uyarısı: kural olarak Asliye Ceza
            if any(a.startswith("158") for a in detected_tck_articles):
                if "AĞIR CEZA" in up and not any(
                    a.startswith("158/3") for a in detected_tck_articles
                ):
                    issues.append(
                        ValidationIssue(
                            issue_type="JURISDICTION_WARN",
                            severity="WARNING",
                            original_text="AĞIR CEZA MAHKEMESİ",
                            message=(
                                "TCK m. 158 temel cezası 3-10 yıldır → kural olarak ASLİYE CEZA görevlidir. "
                                "Ağır Ceza ancak m. 158/3 ağırlaştırması üst sınırı 10 yılı aşarsa doğru olur. "
                                "Her dosyada ceza hesabı yapılmalıdır."
                            ),
                        )
                    )

        # ---- ADIM 5: Zorunlu dilekçe unsurları ----
        up = sanitized.upper()
        if self.checklist.get("require_makam_header", True):
            if not any(m in up for m in ("BAŞSAVCILIĞINA", "MAHKEMESİNE", "HAKİMLİĞİNE", "DAİRESİNE")):
                issues.append(ValidationIssue("CHECKLIST_MISSING", "WARNING", "Başlık", "Resmî makam başlığı bulunamadı."))

        if self.checklist.get("require_procedural_section_before_merits", True):
            usul_i, esas_i = up.find("USUL"), up.find("ESAS")
            if usul_i == -1:
                issues.append(ValidationIssue("CHECKLIST_MISSING", "WARNING", "Usul", "'Usule İlişkin' bölümü eksik."))
            elif esas_i != -1 and usul_i > esas_i:
                issues.append(
                    ValidationIssue("CHECKLIST_MISSING", "WARNING", "Sıralama",
                                    "Usul bölümü Esas bölümünden ÖNCE gelmelidir.")
                )

        for req in self.checklist.get("require_constitutional_articles", []) or []:
            nums = re.findall(r"\d+", req)
            if nums and ("ANAYASA" not in up or nums[0] not in up):
                issues.append(
                    ValidationIssue("CHECKLIST_MISSING", "WARNING", req,
                                    f"Zorunlu anayasal dayanak eksik: {req}")
                )

        if self.checklist.get("require_terditli_sonuc_ve_istem", True):
            if "SONUÇ VE İSTEM" not in up and "NETİCE VE TALEP" not in up:
                issues.append(
                    ValidationIssue("CHECKLIST_MISSING", "WARNING", "SONUÇ VE İSTEM",
                                    "'Sonuç ve İstem' bölümü bulunamadı.")
                )

        # Ek eşleşmesi
        if self.checklist.get("require_ek_list_matches_citations", True):
            cited = set(re.findall(r"Ek-?(\d+)", sanitized))
            if cited:
                ek_block = re.search(r"EKLER?:?\s*\n((?:\s*\d+[\.\)].*\n?)+)", sanitized, re.IGNORECASE)
                listed = set(re.findall(r"^\s*(\d+)[\.\)]", ek_block.group(1), re.MULTILINE)) if ek_block else set()
                missing = cited - listed
                if missing:
                    issues.append(
                        ValidationIssue("CHECKLIST_MISSING", "WARNING", f"Ek-{sorted(missing)}",
                                        f"Metinde atıf var ama EKLER listesinde yok: {sorted(missing)}")
                    )

        unfixed = [i for i in issues if i.severity == "CRITICAL" and i.replacement_applied is None]
        return ValidationResult(
            is_valid=(len(unfixed) == 0),
            sanitized_petition=sanitized,
            issues=issues,
            verified_citations_kept=kept,
            hallucinated_citations_removed=removed,
        )


# ============================================================================
# 3. ORKESTRASYON
# ============================================================================

class AvukatSkillOrchestrator:
    def __init__(
        self,
        base_dir: str | Path = ".",
        llm_call: Optional[Callable[[str, str, float], str]] = None,
    ):
        self.base_dir = Path(base_dir).resolve()
        skill = self.base_dir / "SKILL.md"
        self.system_prompt = (
            skill.read_text(encoding="utf-8") if skill.exists() else "Sen uzman bir Türk hukuk avukatısın."
        )
        self.router = LegalKnowledgeRouter(self.base_dir)
        self.validator = CitationAndProcedureValidator(self.base_dir / "config" / "citation_validator.json")
        self.llm = llm_call or self._ollama

    @staticmethod
    def _ollama(system_prompt: str, user_prompt: str, temperature: float) -> str:
        import requests

        resp = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "qwen2.5:14b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "options": {"temperature": temperature},
                "stream": False,
            },
            timeout=300,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]

    def stage_1(self, user_story: str) -> Tuple[str, RoutedContext]:
        ctx = self.router.build_stage_1_context(user_story)
        focus = "\n".join(f"  - {x}" for x in ctx.stage_1_focus_points) or "  - Genel usul ve unsur matrisi"
        prompt = f"""[AŞAMA 1: ÖN ANALİZ VE 5 STRATEJİK SORU — DİLEKÇE YAZMA!]

OLAY:
\"\"\"{user_story}\"\"\"

TESPİT: usul={ctx.matched_procedural_routes} | suç={ctx.matched_crime_routes} | TCK={ctx.detected_tck_articles}

BU DOSYADA SORGULANACAK KRİTİK AYRIMLAR:
{focus}

BİLGİ TABANI:
{ctx.combined_rag_text}

GÖREV: 3-4 cümlelik ön değerlendirme + tam 5 numaralı stratejik soru."""
        return self.llm(self.system_prompt, prompt, ctx.temperature), ctx

    def stage_2(
        self,
        user_story: str,
        user_answers: str,
        explicit_tck: Optional[List[str]] = None,
    ) -> Tuple[ValidationResult, RoutedContext]:
        ctx = self.router.build_stage_2_context(user_story, user_answers, explicit_tck)
        white = (
            ", ".join(f"E. {e}, K. {k}" for e, k in sorted(ctx.verified_ek_pairs))
            if ctx.verified_ek_pairs
            else "YOK — SADECE İLKESEL ATIF KULLAN"
        )
        warn = "\n".join(f"  * {w}" for w in ctx.mandatory_warnings) or "  * Standart usul denetimi."
        prompt = f"""[AŞAMA 2: SINIFLANDIRMA + RESMÎ DİLEKÇE]

1) OLAY:
\"\"\"{user_story}\"\"\"

2) 5 SORU YANITLARI:
\"\"\"{user_answers}\"\"\"

3) ZORUNLU USUL UYARILARI:
{warn}

4) DOĞRULANMIŞ KÜNYELER (BEYAZ LİSTE — dışına çıkma!):
[{white}]

5) BİLGİ TABANI:
{ctx.combined_rag_text}

GÖREV: SKILL.md Aşama 2 formatına uy — Bölüm 1 Karnesi + Bölüm 2 Dilekçe."""
        raw = self.llm(self.system_prompt, prompt, ctx.temperature)
        result = self.validator.validate_and_sanitize(
            raw, ctx.verified_ek_pairs, ctx.detected_tck_articles
        )
        return result, ctx


# ============================================================================
# 4. CLI
# ============================================================================

def _print_report(r: ValidationResult) -> None:
    print(f"\n{'='*72}\nDOĞRULAMA RAPORU\n{'='*72}")
    print(f"Geçerli mi        : {'EVET' if r.is_valid else 'HAYIR'}")
    print(f"Korunan künye     : {len(r.verified_citations_kept)}")
    print(f"Silinen künye     : {len(r.hallucinated_citations_removed)}")
    print(f"CRITICAL / WARNING: {r.critical_count} / {r.warning_count}\n")
    for i, issue in enumerate(r.issues, 1):
        mark = "[CRIT]" if issue.severity == "CRITICAL" else "[WARN]"
        print(f"{mark} [{i}] {issue.issue_type}: {issue.message}")
        print(f"     Özgün: {issue.original_text[:100]}")
        if issue.replacement_applied:
            print(f"     Düzeltme: {issue.replacement_applied[:100]}")


def main() -> int:
    ap = argparse.ArgumentParser(description="AVUKAT motoru")
    ap.add_argument("--test", action="store_true", help="Yerleşik simülasyon")
    ap.add_argument("--validate", metavar="DOSYA", help="Bir dilekçe dosyasını denetle")
    ap.add_argument("--base", default=".", help="Proje kökü")
    ap.add_argument("--stage1", metavar="METIN", help="Aşama 1 bağlamını göster (LLM'siz)")
    args = ap.parse_args()

    base = Path(args.base).resolve()

    if args.stage1:
        router = LegalKnowledgeRouter(base)
        ctx = router.build_stage_1_context(args.stage1)
        print(f"Usul rotaları : {ctx.matched_procedural_routes}")
        print(f"Suç rotaları  : {ctx.matched_crime_routes}")
        print(f"TCK maddeleri : {ctx.detected_tck_articles}")
        print(f"Yüklenen      : {len(ctx.loaded_files)}")
        for f in ctx.loaded_files:
            print(f"  ✓ {f}")
        if ctx.missing_files:
            print(f"EKSİK        : {len(ctx.missing_files)}")
            for f in ctx.missing_files:
                print(f"  ✗ {f}")
        print(f"\nOdak noktaları:")
        for p in ctx.stage_1_focus_points:
            print(f"  • {p}")
        print(f"\nDoğrulanmış künye sayısı: {len(ctx.verified_ek_pairs)}")
        return 0

    if args.validate:
        v = CitationAndProcedureValidator(base / "config" / "citation_validator.json")
        text = Path(args.validate).read_text(encoding="utf-8")
        res = v.validate_and_sanitize(text, set(), [])
        _print_report(res)
        return 0 if res.is_valid else 1

    if args.test:
        # Bilinen gerçek bir Yargıtay künyesiyle simülasyon
        # (15. CD 2018/3412 E., 2018/5377 K. — EmsalBul doğrulamasıyla teyit edilmiş)
        gercek = ("2018/3412", "2018/5377")
        ornek = """T.C.
ANKARA CUMHURİYET BAŞSAVCILIĞINA

MÜŞTEKİ : Ahmet Yılmaz
ŞÜPHELİ : Mehmet Demir
SUÇ     : Nitelikli Dolandırıcılık (TCK m. 158/1-f)

AÇIKLAMALAR

I. OLAYLARIN ÖZETİ
Şüpheli sahte araç ilanıyla 50.000 TL kapora almıştır.

II. USULE İLİŞKİN AÇIKLAMA VE İTİRAZLARIMIZ
Suç TCK m. 158/1-f kapsamındadır. Basit yargılama kararına 7 gün içinde itiraz edilebilir.
HAGB kararına karşı nöbetçi ağır ceza mahkemesine itiraz edilecektir.
Ayrıca 765 sayılı TCK m. 456 hükümleri hatırlatılmalıdır.

III. ESASA VE SUÇUN UNSURLARINA İLİŞKİN HUKUKİ DEĞERLENDİRME
1. Yargıtay CGK, E. 2017/15-994, K. 2021/309 sayılı kararında belirtildiği üzere...
2. Yargıtay 15. CD, E. 2099/99999, K. 2099/88888 sayılı ilamında vurgulandığı üzere...
3. Yargıtay 15. Ceza Dairesi, E. 2018/3412, K. 2018/5377 sayılı kararında...

IV. ANAYASAL GÜVENCELER
Anayasa m. 36 ve Anayasa m. 38 kapsamında...

VII. SONUÇ VE İSTEM
Kamu davası açılmasına karar verilmesini arz ve talep ederim.

EKLER:
1. Dekont
"""
        v = CitationAndProcedureValidator(base / "config" / "citation_validator.json")
        res = v.validate_and_sanitize(ornek, {gercek}, ["158/1-f"])
        _print_report(res)
        print(f"\n{'='*72}\nTEMİZLENMİŞ METİN\n{'='*72}")
        print(res.sanitized_petition)
        return 0

    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())

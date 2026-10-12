import os
import json
import time
import uuid
import hashlib
import threading
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set, Any
from dataclasses import dataclass, field
from collections import defaultdict, Counter


@dataclass
class KnowledgeItem:
    id: str
    content: str
    category: str
    tags: List[str]
    language: str
    created_at: float
    updated_at: float
    source: str = "manual"
    confidence: float = 1.0
    embedding: Optional[List[float]] = None
    ttl: Optional[float] = None
    relationships: Dict[str, List[str]] = field(default_factory=lambda: {"related": [], "parent": [], "child": [], "synonym": []})
    version: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResult:
    item: KnowledgeItem
    score: float
    match_type: str = "keyword"


class KnowledgeBase:
    def __init__(self, data_dir: str = "./data/knowledge", embedding_dim: int = 384):
        self.data_dir = Path(data_dir)
        self.embedding_dim = embedding_dim
        self.knowledge: Dict[str, KnowledgeItem] = {}
        self.category_index: Dict[str, List[str]] = defaultdict(list)
        self.tag_index: Dict[str, List[str]] = defaultdict(list)
        self.language_index: Dict[str, List[str]] = defaultdict(list)
        self.relationship_graph: Dict[str, Set[str]] = defaultdict(set)
        self.category_hierarchy: Dict[str, List[str]] = defaultdict(list)
        self.embedding_matrix: Optional[np.ndarray] = None
        self.embedding_ids: List[str] = []
        self.synonym_map: Dict[str, str] = {}
        self._lock = threading.RLock()
        self._load_knowledge()
        self._build_embedding_index()

    def _load_knowledge(self):
        if not self.data_dir.exists():
            self.data_dir.mkdir(parents=True)
            return

        count = 0
        for file_path in sorted(self.data_dir.glob("*.json")):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if "id" not in data:
                        continue
                    if "ttl" in data and data["ttl"] and time.time() > data["ttl"]:
                        file_path.unlink()
                        continue
                    item = KnowledgeItem(**{k: v for k, v in data.items() if k in KnowledgeItem.__dataclass_fields__})
                    self.knowledge[item.id] = item
                    self._update_indexes(item)
                    count += 1
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

        # Load synonym map
        synonym_file = self.data_dir / "_synonyms.json"
        if synonym_file.exists():
            try:
                self.synonym_map = json.loads(synonym_file.read_text(encoding='utf-8'))
            except:
                pass

        # Load category hierarchy
        hierarchy_file = self.data_dir / "_categories.json"
        if hierarchy_file.exists():
            try:
                self.category_hierarchy = json.loads(hierarchy_file.read_text(encoding='utf-8'))
            except:
                pass

        print(f"Loaded {count} knowledge items")

    def _build_embedding_index(self):
        items_with_embeddings = [(item_id, item) for item_id, item in self.knowledge.items() if item.embedding]
        if items_with_embeddings:
            self.embedding_ids = [item_id for item_id, _ in items_with_embeddings]
            self.embedding_matrix = np.array([item.embedding for _, item in items_with_embeddings], dtype=np.float32)

    def _update_indexes(self, item: KnowledgeItem):
        self.category_index[item.category].append(item.id)
        for tag in item.tags:
            self.tag_index[tag].append(item.id)
        self.language_index[item.language].append(item.id)
        for rel_type, targets in item.relationships.items():
            for target in targets:
                if target in self.knowledge:
                    self.relationship_graph[item.id].add(target)
                    self.relationship_graph[target].add(item.id)

    def _save_item(self, item: KnowledgeItem):
        file_path = self.data_dir / f"{item.id}.json"
        data = {k: v for k, v in vars(item).items() if not k.startswith("_")}
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _compute_embedding(self, text: str) -> Optional[List[float]]:
        try:
            try:
                from sentence_transformers import SentenceTransformer
                model = SentenceTransformer('all-MiniLM-L6-v2')
                embedding = model.encode(text)
                return embedding.tolist()
            except ImportError:
                words = text.lower().split()
                vec = np.zeros(self.embedding_dim)
                for word in words:
                    seed = hashlib.md5(word.encode()).digest()
                    np.random.seed(int.from_bytes(seed[:4], 'little'))
                    vec += np.random.randn(self.embedding_dim)
                if len(words) > 0:
                    vec /= len(words)
                return vec.tolist()
        except:
            return None

    def add_knowledge(self, content: str, category: str, tags: List[str],
                      language: str = "en", source: str = "manual",
                      confidence: float = 1.0, ttl: Optional[float] = None,
                      relationships: Optional[Dict[str, List[str]]] = None,
                      metadata: Optional[Dict[str, Any]] = None) -> str:
        with self._lock:
            item_id = str(uuid.uuid4())
            timestamp = time.time()
            embedding = self._compute_embedding(content)

            item = KnowledgeItem(
                id=item_id,
                content=content,
                category=category,
                tags=tags,
                language=language,
                created_at=timestamp,
                updated_at=timestamp,
                source=source,
                confidence=confidence,
                embedding=embedding,
                ttl=ttl,
                relationships=relationships or {},
                metadata=metadata or {}
            )

            self.knowledge[item_id] = item
            self._update_indexes(item)
            self._save_item(item)

            if embedding:
                self._add_to_embedding_index(item_id, embedding)

            return item_id

    def _add_to_embedding_index(self, item_id: str, embedding: List[float]):
        emb = np.array(embedding, dtype=np.float32)
        if self.embedding_matrix is None:
            self.embedding_matrix = emb.reshape(1, -1)
            self.embedding_ids = [item_id]
        else:
            self.embedding_matrix = np.vstack([self.embedding_matrix, emb.reshape(1, -1)])
            self.embedding_ids.append(item_id)

    def update_knowledge(self, item_id: str, content: Optional[str] = None,
                         category: Optional[str] = None, tags: Optional[List[str]] = None,
                         confidence: Optional[float] = None,
                         relationships: Optional[Dict[str, List[str]]] = None) -> bool:
        with self._lock:
            if item_id not in self.knowledge:
                return False

            item = self.knowledge[item_id]

            if content is not None and content != item.content:
                item.content = content
                embedding = self._compute_embedding(content)
                if embedding:
                    item.embedding = embedding
                    self._rebuild_embedding_index()

            if category is not None:
                self.category_index[item.category].remove(item_id)
                item.category = category
                self.category_index[category].append(item_id)

            if tags is not None:
                for tag in item.tags:
                    if tag in self.tag_index and item_id in self.tag_index[tag]:
                        self.tag_index[tag].remove(item_id)
                item.tags = tags
                for tag in tags:
                    self.tag_index[tag].append(item_id)

            if confidence is not None:
                item.confidence = confidence

            if relationships is not None:
                for rel_type, targets in relationships.items():
                    item.relationships[rel_type] = targets
                    for target in targets:
                        if target in self.knowledge:
                            self.relationship_graph[item.id].add(target)
                            self.relationship_graph[target].add(item.id)

            item.version += 1
            item.updated_at = time.time()
            self._save_item(item)
            return True

    def _rebuild_embedding_index(self):
        self._build_embedding_index()

    def delete_knowledge(self, item_id: str) -> bool:
        with self._lock:
            if item_id not in self.knowledge:
                return False

            item = self.knowledge[item_id]
            self.category_index[item.category].remove(item_id)
            for tag in item.tags:
                if tag in self.tag_index and item_id in self.tag_index[tag]:
                    self.tag_index[tag].remove(item_id)
            if item.language in self.language_index and item_id in self.language_index[item.language]:
                self.language_index[item.language].remove(item_id)

            file_path = self.data_dir / f"{item_id}.json"
            if file_path.exists():
                file_path.unlink()

            del self.knowledge[item_id]
            self._rebuild_embedding_index()
            return True

    def search(self, query: str, language: str = "en",
               category: Optional[str] = None, top_k: int = 5,
               use_semantic: bool = False) -> List[SearchResult]:
        with self._lock:
            candidates = set()

            if category:
                candidates.update(self.category_index.get(category, []))
            else:
                candidates.update(self.language_index.get(language, []))

            if not candidates:
                candidates = set(self.knowledge.keys())

            results = []
            query_lower = query.lower()

            # Semantic search
            if use_semantic and self.embedding_matrix is not None and len(self.embedding_ids) > 0:
                query_emb = self._compute_embedding(query)
                if query_emb:
                    q = np.array(query_emb, dtype=np.float32)
                    sims = self.embedding_matrix @ q / (np.linalg.norm(self.embedding_matrix, axis=1) * np.linalg.norm(q) + 1e-8)
                    top_indices = np.argsort(sims)[::-1][:top_k]
                    for idx in top_indices:
                        item_id = self.embedding_ids[idx]
                        if item_id in candidates or not candidates:
                            item = self.knowledge[item_id]
                            results.append(SearchResult(item=item, score=float(sims[idx]), match_type="semantic"))

            # Keyword search
            for item_id in candidates:
                item = self.knowledge[item_id]
                kw_score = self._calculate_keyword_score(query_lower, item)
                if kw_score > 0:
                    # Merge with existing semantic result if any
                    existing = next((r for r in results if r.item.id == item_id), None)
                    if existing:
                        existing.score = max(existing.score, kw_score)
                    else:
                        results.append(SearchResult(item=item, score=kw_score, match_type="keyword"))

            results.sort(key=lambda x: x.score, reverse=True)
            return results[:top_k]

    def _calculate_keyword_score(self, query: str, item: KnowledgeItem) -> float:
        score = 0.0
        query_words = set(query.split())
        content_words = set(item.content.lower().split())
        tag_words = set(tag.lower() for tag in item.tags)

        common_content = query_words.intersection(content_words)
        common_tags = query_words.intersection(tag_words)

        score += len(common_content) * 0.5
        score += len(common_tags) * 0.3

        if item.category.lower() in query:
            score += 0.2

        # Synonym bonus
        for qw in query_words:
            if qw in self.synonym_map:
                synonym_target = self.synonym_map[qw]
                if synonym_target in content_words:
                    score += 0.25

        return score

    def hybrid_search(self, query: str, language: str = "en",
                      category: Optional[str] = None, top_k: int = 5,
                      keyword_weight: float = 0.4, semantic_weight: float = 0.6) -> List[SearchResult]:
        kw_results = self.search(query, language, category, top_k * 2, use_semantic=False)
        sem_results = self.search(query, language, category, top_k * 2, use_semantic=True)

        combined = {}
        for r in kw_results:
            combined[r.item.id] = {"result": r, "kw_score": r.score, "sem_score": 0}
        for r in sem_results:
            if r.item.id in combined:
                combined[r.item.id]["sem_score"] = r.score
            else:
                combined[r.item.id] = {"result": r, "kw_score": 0, "sem_score": r.score}

        scored = []
        for item_id, data in combined.items():
            final_score = (data["kw_score"] * keyword_weight + data["sem_score"] * semantic_weight)
            data["result"].score = final_score
            data["result"].match_type = "hybrid"
            scored.append(data["result"])

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]

    def add_synonym(self, word: str, target: str):
        self.synonym_map[word.lower()] = target.lower()
        self._save_synonyms()

    def remove_synonym(self, word: str):
        self.synonym_map.pop(word.lower(), None)
        self._save_synonyms()

    def _save_synonyms(self):
        synonym_file = self.data_dir / "_synonyms.json"
        synonym_file.write_text(json.dumps(self.synonym_map, indent=2, ensure_ascii=False))

    def add_category(self, category: str, parent: Optional[str] = None):
        if parent:
            self.category_hierarchy.setdefault(parent, [])
            if category not in self.category_hierarchy[parent]:
                self.category_hierarchy[parent].append(category)
        else:
            if category not in self.category_hierarchy:
                self.category_hierarchy[category] = []
        self._save_categories()

    def _save_categories(self):
        cat_file = self.data_dir / "_categories.json"
        cat_file.write_text(json.dumps(self.category_hierarchy, indent=2, ensure_ascii=False))

    def get_category_tree(self, root: Optional[str] = None) -> Dict:
        if root:
            return {root: self._build_category_tree(root)}
        tree = {}
        for cat, children in self.category_hierarchy.items():
            if not any(cat in v for v in self.category_hierarchy.values()):
                tree[cat] = self._build_category_tree(cat)
        return tree

    def _build_category_tree(self, category: str) -> Dict:
        children = self.category_hierarchy.get(category, [])
        return {child: self._build_category_tree(child) for child in children}

    def get_related(self, item_id: str, max_depth: int = 2) -> Dict[str, List[str]]:
        if item_id not in self.knowledge:
            return {}
        visited = set()
        related = {}
        def dfs(current: str, depth: int):
            if depth > max_depth or current in visited:
                return
            visited.add(current)
            neighbors = self.relationship_graph.get(current, set())
            for neighbor in neighbors:
                related.setdefault(f"depth_{depth}", []).append(neighbor)
                dfs(neighbor, depth + 1)
        dfs(item_id, 1)
        return related

    def get_query_suggestions(self, partial: str, max_suggestions: int = 5) -> List[str]:
        partial_lower = partial.lower()
        suggestions = set()
        for item in self.knowledge.values():
            if partial_lower in item.content.lower():
                words = item.content.lower().split()
                for w in words:
                    if w.startswith(partial_lower) and len(w) > 3:
                        suggestions.add(w)
            for tag in item.tags:
                if tag.lower().startswith(partial_lower):
                    suggestions.add(tag)
        return sorted(suggestions)[:max_suggestions]

    def validate_item(self, item_id: str) -> Dict[str, Any]:
        if item_id not in self.knowledge:
            return {"valid": False, "reason": "not_found"}
        item = self.knowledge[item_id]
        issues = []
        if not item.content or len(item.content.strip()) < 5:
            issues.append("content_too_short")
        if not item.category:
            issues.append("missing_category")
        if item.confidence < 0.1:
            issues.append("low_confidence")
        return {"valid": len(issues) == 0, "issues": issues, "confidence": item.confidence}

    def bulk_import(self, items: List[Dict]) -> Dict[str, int]:
        imported = 0
        failed = 0
        for data in items:
            try:
                self.add_knowledge(
                    content=data.get("content", ""),
                    category=data.get("category", "general"),
                    tags=data.get("tags", []),
                    language=data.get("language", "en"),
                    source=data.get("source", "bulk_import"),
                    confidence=data.get("confidence", 1.0),
                    metadata=data.get("metadata")
                )
                imported += 1
            except Exception as e:
                print(f"Bulk import failed: {e}")
                failed += 1
        return {"imported": imported, "failed": failed}

    def bulk_export(self, category: Optional[str] = None, language: Optional[str] = None) -> List[Dict]:
        items = []
        for item in self.knowledge.values():
            if category and item.category != category:
                continue
            if language and item.language != language:
                continue
            items.append(vars(item))
        return items

    def get_expired_items(self) -> List[str]:
        now = time.time()
        return [item_id for item_id, item in self.knowledge.items()
                if item.ttl and now > item.ttl]

    def clean_expired(self) -> int:
        expired = self.get_expired_items()
        for item_id in expired:
            self.delete_knowledge(item_id)
        return len(expired)

    def incremental_update(self, updates: List[Dict]):
        for update in updates:
            item_id = update.get("id")
            if item_id and item_id in self.knowledge:
                self.update_knowledge(item_id, **{k: v for k, v in update.items() if k != "id"})
            else:
                self.add_knowledge(
                    content=update.get("content", ""),
                    category=update.get("category", "general"),
                    tags=update.get("tags", []),
                    language=update.get("language", "en")
                )

    def get_statistics(self) -> Dict:
        categories = Counter(item.category for item in self.knowledge.values())
        languages = Counter(item.language for item in self.knowledge.values())
        total_relations = sum(len(rels) for rels in self.relationship_graph.values())
        return {
            "total_items": len(self.knowledge),
            "categories": dict(categories),
            "languages": dict(languages),
            "total_relations": total_relations,
            "avg_confidence": round(sum(item.confidence for item in self.knowledge.values()) / max(1, len(self.knowledge)), 3),
            "has_embeddings": sum(1 for item in self.knowledge.values() if item.embedding is not None),
            "expired_items": len(self.get_expired_items()),
            "synonyms": len(self.synonym_map)
        }

    def get_by_category(self, category: str, language: str = "en") -> List[KnowledgeItem]:
        item_ids = self.category_index.get(category, [])
        return [self.knowledge[item_id] for item_id in item_ids if self.knowledge[item_id].language == language]

    def get_by_tag(self, tag: str) -> List[KnowledgeItem]:
        item_ids = self.tag_index.get(tag, [])
        return [self.knowledge[item_id] for item_id in item_ids]

    def get_by_language(self, language: str) -> List[KnowledgeItem]:
        item_ids = self.language_index.get(language, [])
        return [self.knowledge[item_id] for item_id in item_ids]

    def get_by_source(self, source: str) -> List[KnowledgeItem]:
        return [item for item in self.knowledge.values() if item.source == source]

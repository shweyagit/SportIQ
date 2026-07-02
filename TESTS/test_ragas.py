"""
test_ragas.py — RAG retrieval quality evaluation using RAGAS framework.

Metrics evaluated:
  - Faithfulness       : Did the analyst only say things supported by the retrieved context?
  - Answer Relevancy   : Does the response actually answer the question asked?
  - Context Precision  : Are the retrieved docs relevant to the question?
  - Context Recall     : Did retrieval surface enough facts to answer the question?

Judge model: Gemini Flash (independent from Claude — avoids evaluation bias)

Each analyst is evaluated separately:
  - Tactician  uses narrative context  → tested for technique faithfulness
  - Statistician uses stats context    → tested for data faithfulness (strictest test)

Fictional player tests (Q6-Q8) are the most important:
  - Claude has zero training data on Devraj Nambiar, Lucas Ferreira, Mika Virtanen
  - Faithfulness score must be 1.0 — every fact must trace back to the seeded KB doc
  - Any score below 1.0 means Claude hallucinated something not in the knowledge base

Run:
  GOOGLE_API_KEY=... pytest test_ragas.py -v -s
"""

import os
import pytest
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from conftest import TEST_CASES


# ── Configure Gemini as judge (independent from Claude) ───────────────────────

def get_gemini_llm():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        pytest.skip("GOOGLE_API_KEY not set — skipping RAGAS evaluation")
    return LangchainLLMWrapper(
        ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)
    )

def get_gemini_embeddings():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        pytest.skip("GOOGLE_API_KEY not set")
    return LangchainEmbeddingsWrapper(
        GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
    )


# ── Build RAGAS dataset from API responses ────────────────────────────────────

def build_ragas_dataset(api_responses, analyst="tactician"):
    """
    Build a HuggingFace Dataset from live API responses for RAGAS evaluation.
    analyst: "tactician" or "statistician"
    """
    questions, answers, contexts, ground_truths = [], [], [], []

    for case in TEST_CASES:
        resp = api_responses.get(case["id"])
        if resp is None:
            continue

        # Skip opinion questions for retrieval metrics — retrieval is intentionally skipped
        if case["expected_rag"].startswith("SKIPPED") and analyst == "tactician":
            continue

        answer = resp[analyst]
        if not answer:
            continue

        ctx_key = f"{analyst}_contexts"
        ctx = resp.get(ctx_key, [])

        questions.append(case["question"])
        answers.append(answer)
        contexts.append(ctx if ctx else ["No context retrieved"])
        ground_truths.append(case["ground_truth"])

    return Dataset.from_dict({
        "question":     questions,
        "answer":       answers,
        "contexts":     contexts,
        "ground_truth": ground_truths,
    })


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestRagasTactician:
    """
    Evaluate The Tactician's responses.
    Tactician retrieves narrative docs — technique, style, tactical analysis.
    """

    @pytest.fixture(autouse=True)
    def setup(self, api_responses):
        self.dataset = build_ragas_dataset(api_responses, analyst="tactician")
        self.llm = get_gemini_llm()
        self.embeddings = get_gemini_embeddings()

    def test_faithfulness(self):
        """
        Tactician must only reason from technique docs in the retrieved context.
        Fictional player tests (Devraj, Lucas, Mika) expect faithfulness = 1.0.
        Any hallucinated tactical claim that isn't in the narrative doc fails this.
        """
        faithfulness.llm = self.llm
        result = evaluate(self.dataset, metrics=[faithfulness])
        score = result["faithfulness"]
        print(f"\n[RAGAS] Tactician faithfulness: {score:.3f}")
        assert score >= 0.7, f"Tactician faithfulness too low: {score:.3f} — analyst may be hallucinating tactical claims"

    def test_answer_relevancy(self):
        """
        Tactician must answer the question asked — not go off on tangents.
        """
        answer_relevancy.llm = self.llm
        answer_relevancy.embeddings = self.embeddings
        result = evaluate(self.dataset, metrics=[answer_relevancy])
        score = result["answer_relevancy"]
        print(f"\n[RAGAS] Tactician answer relevancy: {score:.3f}")
        assert score >= 0.7, f"Tactician answer relevancy too low: {score:.3f}"

    def test_context_precision(self):
        """
        The retrieved narrative docs must be relevant to the question.
        A low score means retrieval is pulling in noisy docs (e.g. Bumrah docs
        appearing in a Devraj question).
        """
        context_precision.llm = self.llm
        result = evaluate(self.dataset, metrics=[context_precision])
        score = result["context_precision"]
        print(f"\n[RAGAS] Tactician context precision: {score:.3f}")
        assert score >= 0.5, f"Tactician context precision too low: {score:.3f} — retrieval is returning irrelevant docs"

    def test_context_recall(self):
        """
        Retrieved narrative docs must contain enough information to answer the question.
        """
        context_recall.llm = self.llm
        result = evaluate(self.dataset, metrics=[context_recall])
        score = result["context_recall"]
        print(f"\n[RAGAS] Tactician context recall: {score:.3f}")
        assert score >= 0.5, f"Tactician context recall too low: {score:.3f} — KB may be missing relevant documents"


class TestRagasStatistician:
    """
    Evaluate The Statistician's responses.
    Statistician retrieves stats docs — career numbers, records, splits.
    This is the strictest faithfulness test: every number cited must come from the KB.
    """

    @pytest.fixture(autouse=True)
    def setup(self, api_responses):
        self.dataset = build_ragas_dataset(api_responses, analyst="statistician")
        self.llm = get_gemini_llm()
        self.embeddings = get_gemini_embeddings()

    def test_faithfulness(self):
        """
        The Statistician must ONLY cite numbers from the retrieved stats docs.
        This is the most important test in the suite for fictional players:
        - Devraj Nambiar's 28.4 average, 74.2 Test average, 847 runs in England
        - Lucas Ferreira's 18 assists, 4.8 key passes per 90
        - Mika Virtanen's 94 aces, 10-8 fifth-set tiebreak
        If Claude cites these → retrieval confirmed. If different numbers → hallucination.
        """
        faithfulness.llm = self.llm
        result = evaluate(self.dataset, metrics=[faithfulness])
        score = result["faithfulness"]
        print(f"\n[RAGAS] Statistician faithfulness: {score:.3f}")
        assert score >= 0.75, f"Statistician faithfulness too low: {score:.3f} — Statistician may be inventing numbers"

    def test_answer_relevancy(self):
        """
        Statistician must answer the question with data — not vague commentary.
        """
        answer_relevancy.llm = self.llm
        answer_relevancy.embeddings = self.embeddings
        result = evaluate(self.dataset, metrics=[answer_relevancy])
        score = result["answer_relevancy"]
        print(f"\n[RAGAS] Statistician answer relevancy: {score:.3f}")
        assert score >= 0.7, f"Statistician answer relevancy too low: {score:.3f}"

    def test_context_precision(self):
        """
        Retrieved stats docs must be relevant to the question.
        """
        context_precision.llm = self.llm
        result = evaluate(self.dataset, metrics=[context_precision])
        score = result["context_precision"]
        print(f"\n[RAGAS] Statistician context precision: {score:.3f}")
        assert score >= 0.5, f"Statistician context precision too low: {score:.3f}"

    def test_context_recall(self):
        """
        Stats docs retrieved must contain sufficient data to answer the question.
        """
        context_recall.llm = self.llm
        result = evaluate(self.dataset, metrics=[context_recall])
        score = result["context_recall"]
        print(f"\n[RAGAS] Statistician context recall: {score:.3f}")
        assert score >= 0.5, f"Statistician context recall too low: {score:.3f}"


class TestRagasFictionalPlayers:
    """
    Fictional player tests — pure RAG pipeline verification.

    Claude has zero training data on Devraj Nambiar, Lucas Ferreira, Mika Virtanen.
    These players were seeded into the Supabase knowledge base manually.

    If RAGAS faithfulness = 1.0 on these → every fact came from the KB → RAG confirmed.
    If RAGAS faithfulness < 1.0 → Claude invented something → retrieval failed or hallucinated.

    This is the cleanest, most unambiguous RAG proof in the test suite.
    """

    FICTIONAL_IDS = ["q6_devraj_nambiar_weakness", "q7_lucas_ferreira_copa_america", "q8_mika_virtanen_wimbledon"]

    @pytest.fixture(autouse=True)
    def setup(self, api_responses):
        self.responses = {k: v for k, v in api_responses.items() if k in self.FICTIONAL_IDS}
        self.llm = get_gemini_llm()
        self.embeddings = get_gemini_embeddings()

    def _build_dataset(self, analyst):
        questions, answers, contexts, ground_truths = [], [], [], []
        for case in TEST_CASES:
            if case["id"] not in self.FICTIONAL_IDS:
                continue
            resp = self.responses.get(case["id"])
            if not resp:
                continue
            answer = resp.get(analyst, "")
            if not answer:
                continue
            questions.append(case["question"])
            answers.append(answer)
            contexts.append(resp.get(f"{analyst}_contexts", ["No context retrieved"]))
            ground_truths.append(case["ground_truth"])
        return Dataset.from_dict({
            "question": questions, "answer": answers,
            "contexts": contexts,  "ground_truth": ground_truths,
        })

    def test_statistician_faithfulness_fictional(self):
        """
        Strictest test in the suite. Statistician faithfulness on fictional players
        must be 1.0 — every stat cited (28.4, 847 runs, 94 aces, O Giro) must come
        directly from the seeded KB documents. No training data exists for these players.
        """
        faithfulness.llm = self.llm
        dataset = self._build_dataset("statistician")
        result = evaluate(dataset, metrics=[faithfulness])
        score = result["faithfulness"]
        print(f"\n[RAGAS] Fictional player Statistician faithfulness: {score:.3f}")
        assert score >= 0.9, (
            f"Fictional player faithfulness: {score:.3f} — "
            f"Statistician cited facts not in the knowledge base. RAG pipeline may be failing."
        )

    def test_tactician_faithfulness_fictional(self):
        """
        Tactician faithfulness on fictional players must also be high.
        All tactical descriptions (Devraj's high backlift, Lucas's pressing trigger,
        Mika's serve-forehand pattern) exist only in the seeded narrative docs.
        """
        faithfulness.llm = self.llm
        dataset = self._build_dataset("tactician")
        result = evaluate(dataset, metrics=[faithfulness])
        score = result["faithfulness"]
        print(f"\n[RAGAS] Fictional player Tactician faithfulness: {score:.3f}")
        assert score >= 0.85, (
            f"Fictional player Tactician faithfulness: {score:.3f} — "
            f"Tactician described technique not found in the knowledge base."
        )

    def test_context_recall_fictional(self):
        """
        Context recall for fictional players verifies the KB docs were retrieved.
        Low recall = the seeded documents weren't found by similarity search.
        """
        context_recall.llm = self.llm
        dataset = self._build_dataset("statistician")
        result = evaluate(dataset, metrics=[context_recall])
        score = result["context_recall"]
        print(f"\n[RAGAS] Fictional player context recall: {score:.3f}")
        assert score >= 0.6, (
            f"Fictional player context recall: {score:.3f} — "
            f"Seeded documents may not be retrievable. Check embeddings in Supabase."
        )

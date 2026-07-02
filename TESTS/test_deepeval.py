"""
test_deepeval.py — Generation quality and behaviour evaluation using DeepEval.

DeepEval tests what RAGAS cannot:
  - Persona fidelity: does The Tactician stay tactical? Does The Statistician stay numerical?
  - Intent routing: did the opinion classifier correctly skip retrieval?
  - Hallucination: did Claude invent facts not in the context or real world?
  - Answer relevancy: does the response address the actual question?
  - G-Eval: custom criteria scored by Gemini (tone, confidence, analyst separation)

Judge model: Gemini Flash (independent from Claude — avoids evaluation bias)

Run:
  GOOGLE_API_KEY=... pytest test_deepeval.py -v -s

Note: DeepEval uses @pytest.mark.parametrize style via assert_test().
Each test creates LLMTestCase objects and runs metrics against them individually.
"""

import os
import pytest
from deepeval import evaluate as deepeval_evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    HallucinationMetric,
    GEval,
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import TEST_CASES


# ── Judge model ───────────────────────────────────────────────────────────────

def get_model():
    if not os.getenv("GOOGLE_API_KEY"):
        pytest.skip("GOOGLE_API_KEY not set — skipping DeepEval evaluation")
    return "gemini-1.5-flash"


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_case(test_cases, case_id):
    return next((c for c in test_cases if c["id"] == case_id), None)

def make_test_case(resp, case, analyst="tactician"):
    """Build a DeepEval LLMTestCase from a live API response."""
    ctx_key = f"{analyst}_contexts"
    return LLMTestCase(
        input=case["question"],
        actual_output=resp[analyst],
        expected_output=case["ground_truth"],
        retrieval_context=resp.get(ctx_key) or [],
    )


# ── Answer Relevancy ──────────────────────────────────────────────────────────

class TestAnswerRelevancy:
    """
    Both analysts must answer the actual question asked — not give generic sports commentary.
    Uses DeepEval AnswerRelevancyMetric with Gemini as judge.
    """

    def test_tactician_answers_question(self, api_responses, test_cases):
        model = get_model()
        metric = AnswerRelevancyMetric(threshold=0.7, model=model, include_reason=True)

        for case in test_cases:
            resp = api_responses.get(case["id"])
            if not resp or not resp["tactician"]:
                continue
            tc = make_test_case(resp, case, "tactician")
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Answer relevancy (tactician) — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.7, (
                f"[{case['id']}] Tactician answer relevancy: {metric.score:.3f} — "
                f"response did not address the question. Reason: {metric.reason}"
            )

    def test_statistician_answers_question(self, api_responses, test_cases):
        model = get_model()
        metric = AnswerRelevancyMetric(threshold=0.7, model=model, include_reason=True)

        for case in test_cases:
            resp = api_responses.get(case["id"])
            if not resp or not resp["statistician"]:
                continue
            tc = make_test_case(resp, case, "statistician")
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Answer relevancy (statistician) — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.7, (
                f"[{case['id']}] Statistician answer relevancy: {metric.score:.3f} — "
                f"response did not address the question. Reason: {metric.reason}"
            )


# ── Faithfulness ──────────────────────────────────────────────────────────────

class TestFaithfulness:
    """
    Analysts must stay grounded in the retrieved context — not invent claims.
    Only tested when context was actually retrieved (skipped for opinion questions).
    """

    def test_tactician_faithfulness(self, api_responses, test_cases):
        model = get_model()
        metric = FaithfulnessMetric(threshold=0.7, model=model, include_reason=True)

        for case in test_cases:
            if case["expected_rag"].startswith("SKIPPED"):
                continue  # opinion questions have no retrieval context to be faithful to
            resp = api_responses.get(case["id"])
            if not resp or not resp["tactician"] or not resp["tactician_contexts"]:
                continue
            tc = make_test_case(resp, case, "tactician")
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Faithfulness (tactician) — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.7, (
                f"[{case['id']}] Tactician faithfulness: {metric.score:.3f} — "
                f"analyst made claims not supported by retrieved context. Reason: {metric.reason}"
            )

    def test_statistician_faithfulness(self, api_responses, test_cases):
        model = get_model()
        metric = FaithfulnessMetric(threshold=0.75, model=model, include_reason=True)

        for case in test_cases:
            if case["expected_rag"].startswith("SKIPPED"):
                continue
            resp = api_responses.get(case["id"])
            if not resp or not resp["statistician"] or not resp["statistician_contexts"]:
                continue
            tc = make_test_case(resp, case, "statistician")
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Faithfulness (statistician) — {case['id']}: {metric.score:.3f} | {metric.reason}")
            # Statistician has higher threshold — citing wrong numbers is more harmful than vague tactics
            assert metric.score >= 0.75, (
                f"[{case['id']}] Statistician faithfulness: {metric.score:.3f} — "
                f"Statistician cited numbers not in the retrieved stats docs. Reason: {metric.reason}"
            )


# ── Hallucination ─────────────────────────────────────────────────────────────

class TestHallucination:
    """
    Hallucination checks whether the analyst invented facts that contradict or
    go beyond what was provided in context.

    Most critical for fictional players (Q6-Q8): Claude cannot know these players
    from training data, so any fact must come from the KB. Hallucination = 0.0 required.
    """

    def test_no_hallucination_fictional_players(self, api_responses, test_cases):
        """
        Devraj Nambiar, Lucas Ferreira, Mika Virtanen do not exist in Claude's training data.
        Any fact cited must come from the seeded knowledge base.
        Hallucination score must be 0.0 (no hallucination detected).
        """
        model = get_model()
        metric = HallucinationMetric(threshold=0.0, model=model, include_reason=True)
        fictional_ids = ["q6_devraj_nambiar_weakness", "q7_lucas_ferreira_copa_america", "q8_mika_virtanen_wimbledon"]

        for case in test_cases:
            if case["id"] not in fictional_ids:
                continue
            resp = api_responses.get(case["id"])
            if not resp:
                continue

            # Test both analysts for fictional players
            for analyst in ["tactician", "statistician"]:
                answer = resp.get(analyst, "")
                ctx = resp.get(f"{analyst}_contexts", [])
                if not answer or not ctx:
                    continue

                tc = LLMTestCase(
                    input=case["question"],
                    actual_output=answer,
                    context=ctx,  # HallucinationMetric uses `context`, not `retrieval_context`
                )
                metric.measure(tc)
                print(f"\n[DEEPEVAL] Hallucination ({analyst}) — {case['id']}: {metric.score:.3f} | {metric.reason}")
                assert metric.score == 0.0, (
                    f"[{case['id']}] {analyst} hallucination detected: {metric.score:.3f} — "
                    f"Claude invented facts about a fictional player. Reason: {metric.reason}"
                )

    def test_no_hallucination_real_players(self, api_responses, test_cases):
        """
        For real players with retrieved context, hallucination should still be low.
        A score above 0.3 means Claude significantly contradicted the retrieved context.
        """
        model = get_model()
        metric = HallucinationMetric(threshold=0.3, model=model, include_reason=True)
        real_ids = ["q1_messi_ronaldo", "q2_bumrah", "q3_sinner_alcaraz", "q5_greatest_test_batter"]

        for case in test_cases:
            if case["id"] not in real_ids:
                continue
            resp = api_responses.get(case["id"])
            if not resp:
                continue

            ctx = resp.get("statistician_contexts", [])
            answer = resp.get("statistician", "")
            if not answer or not ctx:
                continue

            tc = LLMTestCase(
                input=case["question"],
                actual_output=answer,
                context=ctx,
            )
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Hallucination (statistician) — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score <= 0.3, (
                f"[{case['id']}] Statistician hallucination: {metric.score:.3f} — "
                f"too many facts contradicted the retrieved context. Reason: {metric.reason}"
            )


# ── G-Eval: Persona Fidelity ──────────────────────────────────────────────────

class TestPersonaFidelity:
    """
    G-Eval tests that RAGAS and standard metrics cannot cover:
    - Does The Tactician stay in its lane (technique only, no stats)?
    - Does The Statistician stay in its lane (numbers only, no tactical opinion)?
    - Are the two analysts producing genuinely different responses?

    This verifies the dual isolated pipeline is working as designed.
    """

    def test_tactician_stays_tactical(self, api_responses, test_cases):
        """
        The Tactician must reason from technique, style, and tactical analysis.
        It must NOT cite statistics as its primary argument.
        """
        model = get_model()
        metric = GEval(
            name="Tactician Persona Fidelity",
            evaluation_steps=[
                "Check if the response reasons primarily from technique, playing style, or tactical analysis",
                "Check if the response avoids using raw statistics (career goals, averages, records) as the main argument",
                "Check if the response is specific about movements, tendencies, or tactical patterns rather than general commentary",
                "Check if the response takes a confident, opinionated stance rather than hedging",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        for case in test_cases:
            resp = api_responses.get(case["id"])
            if not resp or not resp["tactician"]:
                continue
            tc = LLMTestCase(input=case["question"], actual_output=resp["tactician"])
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Tactician persona fidelity — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.6, (
                f"[{case['id']}] Tactician persona score: {metric.score:.3f} — "
                f"analyst drifted from tactical reasoning. Reason: {metric.reason}"
            )

    def test_statistician_stays_numerical(self, api_responses, test_cases):
        """
        The Statistician must reason strictly from numbers and data.
        It must NOT make tactical or stylistic judgements as its primary argument.
        """
        model = get_model()
        metric = GEval(
            name="Statistician Persona Fidelity",
            evaluation_steps=[
                "Check if the response reasons primarily from statistics, numbers, records, or data",
                "Check if specific figures are cited (averages, percentages, counts, rankings)",
                "Check if the response avoids making purely tactical or stylistic judgements without data support",
                "Check if the response uses data to support or challenge a position",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        for case in test_cases:
            resp = api_responses.get(case["id"])
            if not resp or not resp["statistician"]:
                continue
            tc = LLMTestCase(input=case["question"], actual_output=resp["statistician"])
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Statistician persona fidelity — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.6, (
                f"[{case['id']}] Statistician persona score: {metric.score:.3f} — "
                f"analyst drifted from data-driven reasoning. Reason: {metric.reason}"
            )

    def test_analysts_give_different_responses(self, api_responses, test_cases):
        """
        The two analysts must produce meaningfully different responses to the same question.
        If they say the same thing, the dual pipeline has no value.
        Uses G-Eval to check that the responses are genuinely distinct in angle and content.
        """
        model = get_model()
        metric = GEval(
            name="Analyst Response Differentiation",
            evaluation_steps=[
                "Read both 'Tactician Response' and 'Statistician Response' in the input",
                "Check if the Tactician focuses on different aspects than the Statistician",
                "Check if the Tactician uses different evidence (technique/style) than the Statistician (numbers/data)",
                "Score HIGH if the two responses complement each other with genuinely different angles",
                "Score LOW if the two responses are saying essentially the same thing in different words",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        for case in test_cases:
            resp = api_responses.get(case["id"])
            if not resp or not resp["tactician"] or not resp["statistician"]:
                continue
            combined_input = (
                f"Question: {case['question']}\n\n"
                f"Tactician Response: {resp['tactician']}\n\n"
                f"Statistician Response: {resp['statistician']}"
            )
            tc = LLMTestCase(
                input=combined_input,
                actual_output="Evaluate whether these two responses are genuinely distinct in reasoning angle and evidence used.",
            )
            metric.measure(tc)
            print(f"\n[DEEPEVAL] Analyst differentiation — {case['id']}: {metric.score:.3f} | {metric.reason}")
            assert metric.score >= 0.6, (
                f"[{case['id']}] Analyst differentiation: {metric.score:.3f} — "
                f"both analysts gave too similar a response. Reason: {metric.reason}"
            )


# ── G-Eval: Intent Routing ────────────────────────────────────────────────────

class TestIntentRouting:
    """
    Verifies the Smart RAG intent classifier is working correctly.
    Opinion questions must skip retrieval and have Claude reason from its own knowledge.
    """

    def test_opinion_question_skips_retrieval(self, api_responses):
        """
        Q4: "Is the Premier League ruining international football?"
        This is an opinion question. The intent classifier should classify it as 'opinion'
        and skip retrieval entirely. The response should reason from expertise, not docs.
        """
        resp = api_responses.get("q4_premier_league_opinion")
        if not resp:
            pytest.skip("Q4 response not collected")

        # Verify intent was classified as opinion
        assert resp["intent"] == "opinion", (
            f"Intent classifier failed: expected 'opinion', got '{resp['intent']}'. "
            f"The classifier should have skipped retrieval for this question."
        )

        # Verify no docs were retrieved
        assert len(resp["tactician_sources"]) == 0, (
            f"Opinion question retrieved {len(resp['tactician_sources'])} docs — "
            f"retrieval should have been skipped for opinion questions."
        )
        assert len(resp["statistician_sources"]) == 0, (
            f"Opinion question retrieved {len(resp['statistician_sources'])} stats docs — "
            f"retrieval should have been skipped."
        )

        # G-Eval: verify the response is opinion-based reasoning, not doc-based
        model = get_model()
        metric = GEval(
            name="Opinion Routing Quality",
            evaluation_steps=[
                "Check if the response presents arguments and opinions rather than citing specific retrieved facts",
                "Check if the response takes a reasoned position on a subjective question",
                "Check if the response sounds like expert opinion rather than a document summary",
                "Score HIGH if the response demonstrates independent reasoning",
                "Score LOW if the response explicitly references 'context' or 'retrieved documents'",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        tc = LLMTestCase(
            input="Is the Premier League ruining international football?",
            actual_output=resp["tactician"] + " " + resp["statistician"],
        )
        metric.measure(tc)
        print(f"\n[DEEPEVAL] Opinion routing quality: {metric.score:.3f} | {metric.reason}")
        assert metric.score >= 0.6, (
            f"Opinion routing quality: {metric.score:.3f} — "
            f"response does not read like independent expert reasoning. Reason: {metric.reason}"
        )


# ── G-Eval: Fictional Player RAG Proof ───────────────────────────────────────

class TestFictionalPlayerRagProof:
    """
    The most important test in the suite.

    Devraj Nambiar, Lucas Ferreira, and Mika Virtanen are completely fictional.
    Claude has zero training data on them.

    If the analysts cite the specific invented facts (O Giro, 847 runs, 4 match points),
    those facts could ONLY have come from the seeded knowledge base.

    G-Eval checks that the response contains facts consistent with the seeded documents.
    """

    def test_devraj_nambiar_rag_facts(self, api_responses):
        """
        Devraj Nambiar: the response should mention his left-arm pace weakness,
        28.4 average against it, or his off stump guard — all from the seeded KB doc.
        """
        resp = api_responses.get("q6_devraj_nambiar_weakness")
        if not resp:
            pytest.skip("Q6 response not collected")

        model = get_model()
        metric = GEval(
            name="Devraj Nambiar RAG Fact Verification",
            evaluation_steps=[
                "Check if the response mentions Devraj Nambiar's weakness against left-arm pace",
                "Check if the response mentions a specific average (around 28.4) against left-arm pace",
                "Check if the response mentions his guard on off stump or any specific technical detail",
                "Check if the response mentions being dismissed multiple times (around 7) in a specific pattern",
                "Score HIGH if specific, verifiable facts about Nambiar are mentioned",
                "Score LOW if the response is vague or generic with no specific facts",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        full_response = resp["tactician"] + " " + resp["statistician"]
        tc = LLMTestCase(
            input="How does Devraj Nambiar play against left-arm pace bowling?",
            actual_output=full_response,
        )
        metric.measure(tc)
        print(f"\n[DEEPEVAL] Devraj Nambiar RAG proof: {metric.score:.3f} | {metric.reason}")
        assert metric.score >= 0.6, (
            f"Devraj Nambiar RAG proof failed: {metric.score:.3f} — "
            f"response lacked specific facts from the knowledge base. "
            f"RAG may not be retrieving the seeded doc. Reason: {metric.reason}"
        )

    def test_lucas_ferreira_rag_facts(self, api_responses):
        """
        Lucas Ferreira: the response should mention O Giro, Copa America final,
        89th minute, or his 18 assists — all from the seeded KB doc.
        """
        resp = api_responses.get("q7_lucas_ferreira_copa_america")
        if not resp:
            pytest.skip("Q7 response not collected")

        model = get_model()
        metric = GEval(
            name="Lucas Ferreira RAG Fact Verification",
            evaluation_steps=[
                "Check if the response mentions 'O Giro' or 'The Turn' — the name of his famous goal",
                "Check if the response mentions the Copa America final against Argentina",
                "Check if the response mentions the 89th minute or trailing 1-0",
                "Check if the response mentions his assist record or key passes statistics",
                "Score HIGH if the response contains specific invented facts that only exist in the knowledge base",
                "Score LOW if the response is generic about Lucas Ferreira with no specific facts",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        full_response = resp["tactician"] + " " + resp["statistician"]
        tc = LLMTestCase(
            input="What was Lucas Ferreira's most famous moment in his career?",
            actual_output=full_response,
        )
        metric.measure(tc)
        print(f"\n[DEEPEVAL] Lucas Ferreira RAG proof: {metric.score:.3f} | {metric.reason}")
        assert metric.score >= 0.6, (
            f"Lucas Ferreira RAG proof failed: {metric.score:.3f} — "
            f"response did not contain specific facts from the knowledge base. "
            f"Reason: {metric.reason}"
        )

    def test_mika_virtanen_rag_facts(self, api_responses):
        """
        Mika Virtanen: the response should mention Wimbledon 2025, 4 match points saved,
        Djokovic semi-final, or first Finnish Grand Slam winner — all from the seeded KB doc.
        """
        resp = api_responses.get("q8_mika_virtanen_wimbledon")
        if not resp:
            pytest.skip("Q8 response not collected")

        model = get_model()
        metric = GEval(
            name="Mika Virtanen RAG Fact Verification",
            evaluation_steps=[
                "Check if the response mentions Wimbledon 2025",
                "Check if the response mentions four match points saved against Djokovic",
                "Check if the response mentions Virtanen being Finnish or the first Finnish Grand Slam winner",
                "Check if the response mentions aces, fifth-set tiebreak, or the semi-final details",
                "Score HIGH if specific invented facts from the knowledge base are cited",
                "Score LOW if the response is vague or mentions only general tennis concepts",
            ],
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=0.6,
        )

        full_response = resp["tactician"] + " " + resp["statistician"]
        tc = LLMTestCase(
            input="How did Mika Virtanen win Wimbledon 2025?",
            actual_output=full_response,
        )
        metric.measure(tc)
        print(f"\n[DEEPEVAL] Mika Virtanen RAG proof: {metric.score:.3f} | {metric.reason}")
        assert metric.score >= 0.6, (
            f"Mika Virtanen RAG proof failed: {metric.score:.3f} — "
            f"response did not contain specific facts from the knowledge base. "
            f"Reason: {metric.reason}"
        )

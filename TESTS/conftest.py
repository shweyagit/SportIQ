"""
conftest.py — shared fixtures and API client for SportIQ RAG tests

All tests hit the live deployed API at SPORTIQ_API_URL.
Responses are collected once and reused across RAGAS and DeepEval tests.

Test cases fall into two categories:
  - Real players (Q1-Q5): verify smart RAG routing and quality
  - Fictional players (Q6-Q8): verify retrieval is working end-to-end.
    These players do not exist — Claude has zero training data on them.
    A correct answer MUST have come from the knowledge base.
"""

import pytest
import httpx
import json
import os

SPORTIQ_API_URL = os.getenv("SPORTIQ_API_URL", "https://sportiq-voxv.onrender.com")


def collect_analysis(question: str, sport: str) -> dict:
    """
    Hits the live streaming API and collects full response.
    Returns tactician text, statistician text, and retrieved sources.
    """
    tactician    = ""
    statistician = ""
    sources      = {"tactician": [], "statistician": []}
    intent       = None

    with httpx.stream(
        "POST",
        f"{SPORTIQ_API_URL}/api/analyse/stream",
        json={"question": question, "sport": sport},
        timeout=60,
        headers={"Content-Type": "application/json"}
    ) as r:
        for line in r.iter_lines():
            if not line.startswith("data: "):
                continue
            raw = line[6:].strip()
            if not raw:
                continue
            try:
                event = json.loads(raw)
                if event["type"] == "tactician":
                    tactician += event["token"]
                elif event["type"] == "statistician":
                    statistician += event["token"]
                elif event["type"] == "sources":
                    sources = event
                elif event["type"] == "intent":
                    intent = event.get("intent")
            except Exception:
                continue

    return {
        "question":              question,
        "sport":                 sport,
        "tactician":             tactician,
        "statistician":          statistician,
        "intent":                intent,
        "tactician_contexts":    [s["snippet"] for s in sources.get("tactician", [])],
        "statistician_contexts": [s["snippet"] for s in sources.get("statistician", [])],
        "tactician_sources":     sources.get("tactician", []),
        "statistician_sources":  sources.get("statistician", []),
    }


# ── The 5 test cases — chosen for contrast in RAG behaviour ──────────────────
#
# Q1: Both players in knowledge base — expect HIGH scores
# Q2: One player in KB — expect GOOD scores
# Q3: One player in KB, one not — expect MIXED scores
# Q4: Opinion question — retrieval should be SKIPPED by intent classifier
# Q5: Broad question — retrieval must choose between multiple players

TEST_CASES = [
    {
        "id":    "q1_messi_ronaldo",
        "question": "Who is the better dribbler, Messi or Ronaldo?",
        "sport": "football",
        "ground_truth": "Messi is widely considered the better dribbler due to his low centre of gravity, close ball control using the outside of his right foot, and rapid changes of direction. Ronaldo relies more on pace, power, and step-overs rather than tight technical dribbling.",
        "expected_rag": "HIGH — both in knowledge base",
    },
    {
        "id":    "q2_bumrah",
        "question": "Is Bumrah the best death bowler in cricket history?",
        "sport": "cricket",
        "ground_truth": "Bumrah is considered one of the best death bowlers due to his unorthodox action, yorker precision, and ability to generate reverse swing. His economy rate and wicket-taking ability in the final overs of ODIs and T20s are among the best recorded.",
        "expected_rag": "GOOD — Bumrah in knowledge base",
    },
    {
        "id":    "q3_sinner_alcaraz",
        "question": "How does Sinner compare to Alcaraz as the next generation of tennis?",
        "sport": "tennis",
        "ground_truth": "Sinner and Alcaraz represent the dominant next generation. Sinner is known for his baseline consistency, powerful two-handed backhand and aggressive returning. Alcaraz is more explosive with greater variety and net play. Both have won multiple Grand Slams.",
        "expected_rag": "MIXED — Sinner in KB, Alcaraz not",
    },
    {
        "id":    "q4_premier_league_opinion",
        "question": "Is the Premier League ruining international football?",
        "sport": "football",
        "ground_truth": "This is a subjective debate. Arguments for: fixture congestion reduces player availability and quality for national teams. Arguments against: Premier League raises technical standards that benefit international play.",
        "expected_rag": "SKIPPED — opinion question, intent classifier should skip retrieval",
    },
    {
        "id":    "q5_greatest_test_batter",
        "question": "Who is the greatest Test match batter of all time?",
        "sport": "cricket",
        "ground_truth": "Sachin Tendulkar holds the record for most Test runs (15,921) and most Test centuries (51). Don Bradman has the highest average (99.94). Kohli is the leading active batter. The debate typically centres on Tendulkar vs Bradman.",
        "expected_rag": "BROAD — multiple players in KB, retrieval must choose",
    },

    # ── Fictional player tests — pure RAG verification ────────────────────────
    # Claude has zero training data on these players.
    # Correct answers can ONLY come from the seeded knowledge base.
    # If Claude gets these right → retrieval pipeline is confirmed working.
    # If Claude hallucinates different facts → retrieval failed.

    {
        "id":    "q6_devraj_nambiar_weakness",
        "question": "How does Devraj Nambiar play against left-arm pace bowling?",
        "sport": "cricket",
        "ground_truth": (
            "Devraj Nambiar has a documented weakness against left-arm pace — he averages 28.4 against it, "
            "his lowest against any bowling category. He has been dismissed seven times in his first twelve "
            "Test innings by short balls angled into his body from right-arm pace. He takes guard on off "
            "stump rather than the standard middle-and-leg to improve his sight line against left-arm pace."
        ),
        "expected_rag": "FICTIONAL — facts exist ONLY in knowledge base. No correct answer possible from training data.",
        "rag_proof_keywords": ["left-arm pace", "28.4", "seven times", "off stump", "weakness"],
    },
    {
        "id":    "q7_lucas_ferreira_copa_america",
        "question": "What was Lucas Ferreira's most famous moment in his career?",
        "sport": "football",
        "ground_truth": (
            "Lucas Ferreira's most famous moment was in the Copa America 2025 final against Argentina in Miami. "
            "With Brazil trailing 1-0 in the 89th minute, he turned two defenders and scored a dipping right-foot "
            "shot into the top-left corner, known in Brazilian media as 'O Giro' (The Turn). Brazil won on "
            "penalties after the match ended 1-1. He was named Player of the Tournament with 3 goals and 5 assists."
        ),
        "expected_rag": "FICTIONAL — facts exist ONLY in knowledge base. No correct answer possible from training data.",
        "rag_proof_keywords": ["O Giro", "Copa America", "89th minute", "Argentina", "penalties"],
    },
    {
        "id":    "q8_mika_virtanen_wimbledon",
        "question": "How did Mika Virtanen win Wimbledon 2025?",
        "sport": "tennis",
        "ground_truth": (
            "Mika Virtanen won Wimbledon 2025 by defeating Carlos Alcaraz 6-4 3-6 7-6 6-4 in the final. "
            "His path included a famous semi-final against Djokovic where he saved four match points — three "
            "with aces and one with a first-serve winner — before winning the fifth-set tiebreak 10-8. "
            "He was the first Finnish player to win a Grand Slam. He hit 94 aces across the tournament."
        ),
        "expected_rag": "FICTIONAL — facts exist ONLY in knowledge base. No correct answer possible from training data.",
        "rag_proof_keywords": ["Wimbledon 2025", "four match points", "Djokovic", "Finnish", "Alcaraz", "94 aces"],
    },
]


@pytest.fixture(scope="session")
def api_responses():
    """
    Collect all API responses once per test session.
    Cached so RAGAS and DeepEval tests share the same responses
    without hitting the API twice.
    """
    print("\n[SETUP] Collecting API responses from live SportIQ API...")
    responses = {}
    for case in TEST_CASES:
        print(f"  → {case['id']} ({case['sport']}): {case['question'][:50]}...")
        try:
            result = collect_analysis(case["question"], case["sport"])
            result["ground_truth"]        = case["ground_truth"]
            result["expected_rag"]        = case["expected_rag"]
            result["id"]                  = case["id"]
            result["rag_proof_keywords"]  = case.get("rag_proof_keywords", [])
            responses[case["id"]]         = result
            print(f"     intent={result['intent']} | "
                  f"tactician_docs={len(result['tactician_sources'])} | "
                  f"statistician_docs={len(result['statistician_sources'])}")
            # For fictional player tests, check keyword presence immediately
            if result["rag_proof_keywords"]:
                full_response = result["tactician"] + result["statistician"]
                hits = [kw for kw in result["rag_proof_keywords"] if kw.lower() in full_response.lower()]
                print(f"     RAG proof keywords found: {hits}/{result['rag_proof_keywords']}")
        except Exception as e:
            print(f"     FAILED: {e}")
            responses[case["id"]] = None

    return responses


@pytest.fixture(scope="session")
def test_cases():
    return TEST_CASES

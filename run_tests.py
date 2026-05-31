import subprocess
import sys

# List of all test cases in the test files
tests = [
    # Ingestion
    "tests/test_ingestion.py::test_basic_ingest",
    "tests/test_ingestion.py::test_idempotency",
    "tests/test_ingestion.py::test_empty_batch",
    "tests/test_ingestion.py::test_batch_of_100",
    "tests/test_ingestion.py::test_staff_event_ingest",

    # Metrics
    "tests/test_metrics.py::test_metrics_zero_visitors",
    "tests/test_metrics.py::test_funnel_no_double_count_reentry",
    "tests/test_metrics.py::test_heatmap_returns_normalised_data",
    "tests/test_metrics.py::test_heatmap_low_confidence_flag",
    "tests/test_metrics.py::test_funnel_drop_off_pct",

    # Anomalies
    "tests/test_anomalies.py::test_loitering_detection",
    "tests/test_anomalies.py::test_anomaly_has_suggested_action",
    "tests/test_anomalies.py::test_queue_spike_warn",
    "tests/test_anomalies.py::test_queue_spike_critical",
]

print("Starting OpticRetail Test Cases in Strict Isolation (Zero Collisions)...")
passed = 0
failed = []

for idx, test in enumerate(tests, 1):
    print(f"\n[{idx}/{len(tests)}] Running {test}...")
    res = subprocess.run([r".\venv\Scripts\pytest.exe", test, "-q", "--tb=short"], capture_output=True, text=True)
    if "passed" in res.stdout.lower() and "failed" not in res.stdout.lower():
        print("PASSED")
        passed += 1
    else:
        print("FAILED")
        print(res.stdout)
        print(res.stderr)
        failed.append(test)

print("\n=================== TEST RUN SUMMARY ===================")
print(f"Total Tests: {len(tests)}")
print(f"Passed: {passed}")
print(f"Failed: {len(failed)}")
if failed:
    print("\nFailed Tests:")
    for f in failed:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nAll tests passed successfully in absolute isolation!")
    sys.exit(0)

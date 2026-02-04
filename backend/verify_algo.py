import sys
import os

# Add the current directory to sys.path to make app modules importable
sys.path.append(os.getcwd())

from app.services.policies import dwfq

def run_test():
    print("=== DWFQ Algorithm Verification ===\n")

    # Scenario 1: Priority Test
    # Vulnerable person (Score 1.0) waits 2.5 mins. Normal person (Score 0.0) waits 3 mins.
    # Effective Priority = Score + (Wait / 50)
    # Vuln: 1.0 + (2.5/50) = 1.05
    # Norm: 0.0 + (3.0/50) = 0.06
    # Fairness Ratio: 3.0 / 2.5 = 1.2 (< 1.5 threshold)
    # Winner should be Vulnerable.
    
    print("--- Scenario 1: Vulnerability Priority Check ---")
    queue_1 = [
        {"token_id": 101, "vulnerability_score": 0.0, "wait_minutes": 3.0, "number": "Normal-Wait-3m"},
        {"token_id": 102, "vulnerability_score": 1.0, "wait_minutes": 2.5, "number": "Vuln-Wait-2.5m"},
    ]
    
    result_1 = dwfq.suggest_next(queue_1)
    print(f"Candidates: {[i['number'] for i in queue_1]}")
    print(f"Selected:   {result_1['number'] if result_1 else 'None'}")
    
    if result_1 and result_1["number"] == "Vuln-Wait-2.5m":
        print("✅ PASS: Vulnerable user prioritized correctly.\n")
    else:
        print("❌ FAIL: Wrong user selected.\n")


    # Scenario 2: Fairness Test
    # Group A (Normal): 10 users, Waiting huge time (100m). Avg Wait = 100.
    # Group B (Vuln): 1 user, Waiting 1m. Avg Wait = 1.
    # Ratio = 100 / 1 = 100 (> 1.5 max ratio).
    # Normal group is "Disadvantaged" because they waited too long relative to the other group.
    # Algorithm should force pick from Normal group despite lower individual priority scores.
    
    print("--- Scenario 2: Fairness Ratio Override ---")
    queue_2 = []
    # Add 5 Long-waiting Normal users
    for i in range(5):
        queue_2.append({
            "token_id": i, 
            "vulnerability_score": 0.0, 
            "wait_minutes": 100.0, 
            "number": f"Normal-LongWait-{i}"
        })
        
    # Add 1 Short-waiting Vulnerable user
    # Priority = 1.0 + (1/50) = 1.02.   Normal Priority = 0 + (100/50) = 2.0.
    # Let's adjust numbers so Normal has LOWER priority but HIGHER Wait Ratio.
    # Vuln: Score 1.0. Wait 1m. Priority = 1.02.
    # Normal: Score 0.0. Wait 30m. Priority = 0.6.  <-- Lower Priority individually.
    # But Ratio: Avg Normal Wait (30) / Avg Vuln Wait (1) = 30. (> 1.5).
    # Trigger: Fairness should kick in and pick Normal because they are strictly disadvantaged.
    
    queue_2 = [
        {"token_id": 201, "vulnerability_score": 0.0, "wait_minutes": 40.0, "number": "Normal-Wait-40m"}, # Prio 0.8
        {"token_id": 202, "vulnerability_score": 1.0, "wait_minutes": 1.0, "number": "Vuln-Wait-1m"},    # Prio 1.02
    ]
    
    # Without fairness, Prio 1.02 > 0.8, so Vuln would win.
    # With fairness (Ratio 40/1 = 40 > 1.5), Normal should win.
    
    result_2 = dwfq.suggest_next(queue_2)
    # Re-calculate priority for display since suggest_next adds it to the dict
    print(f"Candidates: {[f'{i['number']} (Prio={i.get('_priority'):.2f})' for i in queue_2]}") 
    
    print(f"Selected:   {result_2['number'] if result_2 else 'None'}")

    if result_2 and result_2["number"] == "Normal-Wait-40m":
        print("✅ PASS: Fairness override triggered. Long-waiting Normal user picked over recent Vulnerable user.\n")
    else:
        print("❌ FAIL: Fairness check failed.\n")

if __name__ == "__main__":
    run_test()

#!/usr/bin/env python3
"""
Granular SAT Question Importer UI
Import specific Test + Domain + Event combinations to avoid API rate limiting
"""

import os
import json
import time
import requests
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Test configuration
TEST_CONFIG = {
    1: {
        "name": "Reading and Writing", 
        "domains": {
            "INI": "Information and Ideas",
            "CAS": "Craft and Structure", 
            "EOI": "Expression of Ideas",
            "SEC": "Standard English Conventions"
        }
    },
    2: {
        "name": "Math", 
        "domains": {
            "H": "Algebra",
            "P": "Advanced Math",
            "Q": "Problem Solving and Data Analysis", 
            "S": "Geometry and Trigonometry"
        }
    }
}

EVENT_IDS = [99, 100, 102]
PROGRESS_FILE = "sat_import_progress.json"

# College Board API constants  
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# SAT skill code mapping (same as before)
SAT_SKILL_MAPPING = {
    # MATH - Algebra (H)
    'H.A.': 'linear-equations-one-var',
    'H.B.': 'linear-functions',
    'H.C.': 'linear-equations-two-var', 
    'H.D.': 'systems-linear-equations',
    'H.E.': 'linear-inequalities',
    
    # MATH - Advanced Math (P)
    'P.A.': 'equivalent-expressions',
    'P.B.': 'nonlinear-equations-systems',
    'P.C.': 'nonlinear-functions',
    
    # MATH - Problem Solving & Data Analysis (Q)
    'Q.A.': 'ratios-rates-proportions',
    'Q.B.': 'percentages',
    'Q.C.': 'one-variable-data',
    'Q.D.': 'two-variable-data',
    'Q.E.': 'probability-conditional',
    'Q.F.': 'inference-statistics',
    'Q.G.': 'statistical-claims',
    
    # MATH - Geometry & Trigonometry (S)
    'S.A.': 'area-volume',
    'S.B.': 'lines-angles-triangles',
    'S.C.': 'right-triangles-trigonometry',
    'S.D.': 'circles',
    
    # ENGLISH - Information & Ideas
    'CID': 'central-ideas-details',
    'INF': 'inferences',  
    'COE': 'command-evidence',
    
    # ENGLISH - Craft & Structure
    'WIC': 'words-in-context',
    'TSP': 'text-structure-purpose',
    'CTC': 'cross-text-connections',
    
    # ENGLISH - Expression of Ideas
    'SYN': 'rhetorical-synthesis',
    'TRA': 'transitions',
    
    # ENGLISH - Standard English Conventions
    'BOU': 'boundaries',
    'FSS': 'form-structure-sense'
}

def get_domain_subject_mapping(skill_code):
    """Map SAT skill code to domain and subject"""
    if skill_code.startswith('H.'):
        return 'algebra', 'math'
    elif skill_code.startswith('P.'):
        return 'advanced-math', 'math'
    elif skill_code.startswith('Q.'):
        return 'problem-solving-data-analysis', 'math'
    elif skill_code.startswith('S.'):
        return 'geometry-trigonometry', 'math'
    elif skill_code in ['CID', 'INF', 'COE']:
        return 'information-ideas', 'english'
    elif skill_code in ['WIC', 'TSP', 'CTC']:
        return 'craft-structure', 'english'
    elif skill_code in ['SYN', 'TRA']:
        return 'expression-ideas', 'english'
    elif skill_code in ['BOU', 'FSS']:
        return 'standard-english-conventions', 'english'
    return None, None

def preprocess_mathml(text):
    """Replace mfenced tags with mo tags for better compatibility"""
    if not text:
        return text
    text = text.replace('<mfenced>', '<mo>(</mo>')
    text = text.replace('</mfenced>', '<mo>)</mo>')
    return text

class GranularSATImporter:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase = create_client(url, key)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        # Statistics
        self.imported = 0
        self.skipped = 0
        self.failed = 0

    def add_question(self, overview, question):
        """Add question to database"""
        try:
            external_id = overview.get('external_id')
            if not external_id:
                self.skipped += 1
                return

            # Get skill mapping
            skill_code = overview.get('skill_cd')
            skill_id = SAT_SKILL_MAPPING.get(skill_code)
            if not skill_id:
                print(f"  Unknown skill code: {skill_code}")
                self.skipped += 1
                return

            # Get domain and subject
            domain_id, subject_id = get_domain_subject_mapping(skill_code)
            if not domain_id or not subject_id:
                print(f"  Could not map domain/subject for: {skill_code}")
                self.skipped += 1
                return

            # Process answer options for MCQ
            answer_options = None
            if question.get("type") == "mcq" and question.get("answerOptions"):
                answer_options = []
                for option in question["answerOptions"]:
                    answer_options.append({
                        'id': str(option['id']),
                        'content': preprocess_mathml(option.get('content', '')),
                        'is_correct': False
                    })

            # Get correct answers
            correct_answers = question.get('keys', [])
            if isinstance(correct_answers, str):
                correct_answers = [correct_answers]

            # Insert question
            data = {
                "origin": "sat_official",
                "sat_external_id": external_id,
                "question_text": preprocess_mathml(question.get("stem", "")),
                "stimulus": preprocess_mathml(question.get("stimulus")),
                "question_type": question.get("type", "mcq"),
                "skill_id": skill_id,
                "sat_program": overview.get("program", "SAT"),
                "difficulty_band": overview.get("score_band_range_cd", 3),
                "difficulty_letter": overview.get("difficulty"),
                "answer_options": answer_options,
                "correct_answers": correct_answers,
                "explanation": question.get("rationale"),
                "domain_id": domain_id,
                "subject_id": subject_id,
                "is_active": True
            }

            response = (
                self.supabase.table("questions")
                .upsert(data, on_conflict="sat_external_id", ignore_duplicates=True)
                .execute()
            )

            if response.data:
                self.imported += 1
            else:
                self.skipped += 1

        except Exception as e:
            print(f"  Error adding question {external_id}: {e}")
            self.failed += 1

    def import_specific(self, test_id, domain, event_id):
        """Import specific Test + Domain + Event combination"""
        print(f"\n{'='*60}")
        print(f"IMPORTING: Test {test_id} | Domain {domain} | Event {event_id}")
        print(f"{'='*60}")
        
        try:
            # Get overview list
            content = {"asmtEventId": event_id, "test": test_id, "domain": domain}
            overview_response = self.session.post(OVERVIEW_API, json=content, timeout=30)
            overview_response.raise_for_status()
            overview_list = overview_response.json()

            if not overview_list:
                print("No questions found for this combination")
                return False

            print(f"Found {len(overview_list)} questions to process")

            # Reset statistics for this import
            self.imported = 0
            self.skipped = 0
            self.failed = 0

            # Process each question
            for i, overview in enumerate(tqdm(overview_list, desc="Processing")):
                if overview.get("external_id") is None:
                    continue

                # Get question details
                problem = {"external_id": overview["external_id"]}
                question_response = self.session.post(QUESTION_API, json=problem, timeout=15)
                
                if question_response.status_code != 200:
                    print(f"  Failed to fetch question {overview['external_id']}")
                    self.failed += 1
                    continue
                    
                question = question_response.json()
                
                # Add question to database
                self.add_question(overview, question)
                
                # Small delay
                time.sleep(0.2)

            print(f"\nResults: {self.imported} imported, {self.skipped} skipped, {self.failed} failed")
            return True

        except Exception as e:
            print(f"Error processing T{test_id}-{domain}-{event_id}: {e}")
            return False

class SATImportUI:
    def __init__(self):
        self.importer = GranularSATImporter()
        self.completed_tasks = self.load_progress()
        
    def load_progress(self):
        """Load completion progress from file"""
        try:
            if os.path.exists(PROGRESS_FILE):
                with open(PROGRESS_FILE, 'r') as f:
                    return json.load(f)
        except:
            pass
        return {}
    
    def save_progress(self):
        """Save completion progress to file"""
        try:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump(self.completed_tasks, f, indent=2)
        except Exception as e:
            print(f"Error saving progress: {e}")
    
    def mark_completed(self, test_id, domain, event_id):
        """Mark a combination as completed"""
        key = f"T{test_id}-{domain}-{event_id}"
        self.completed_tasks[key] = {
            "test_id": test_id,
            "domain": domain, 
            "event_id": event_id,
            "completed_at": time.time()
        }
        self.save_progress()
    
    def is_completed(self, test_id, domain, event_id):
        """Check if combination is already completed"""
        key = f"T{test_id}-{domain}-{event_id}"
        return key in self.completed_tasks
    
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def print_header(self):
        """Print application header"""
        print("=" * 70)
        print("                    SAT QUESTION IMPORTER")
        print("                     (Granular Import)")
        print("=" * 70)
        print()
    
    def print_progress(self):
        """Print current progress"""
        if not self.completed_tasks:
            print("No completed imports yet.")
            return
            
        print(f"COMPLETED: {len(self.completed_tasks)} combinations")
        
        # Group by test and domain
        by_test = {}
        for key, data in self.completed_tasks.items():
            test_id = data['test_id']
            domain = data['domain']
            if test_id not in by_test:
                by_test[test_id] = {}
            if domain not in by_test[test_id]:
                by_test[test_id][domain] = []
            by_test[test_id][domain].append(data['event_id'])
        
        for test_id in sorted(by_test.keys()):
            test_name = TEST_CONFIG[test_id]['name']
            print(f"  Test {test_id} ({test_name}):")
            for domain in sorted(by_test[test_id].keys()):
                events = sorted(by_test[test_id][domain])
                domain_name = TEST_CONFIG[test_id]['domains'][domain]
                print(f"    {domain} ({domain_name}): Events {events}")
        print()
    
    def get_pending_combinations(self):
        """Get all pending combinations"""
        pending = []
        for test_id, test_info in TEST_CONFIG.items():
            for domain in test_info['domains']:
                for event_id in EVENT_IDS:
                    if not self.is_completed(test_id, domain, event_id):
                        pending.append((test_id, domain, event_id))
        return pending
    
    def print_pending(self):
        """Print pending combinations"""
        pending = self.get_pending_combinations()
        if not pending:
            print("🎉 All combinations completed!")
            return
            
        print(f"PENDING: {len(pending)} combinations remaining")
        
        # Group by test
        by_test = {}
        for test_id, domain, event_id in pending:
            if test_id not in by_test:
                by_test[test_id] = {}
            if domain not in by_test[test_id]:
                by_test[test_id][domain] = []
            by_test[test_id][domain].append(event_id)
        
        for test_id in sorted(by_test.keys()):
            test_name = TEST_CONFIG[test_id]['name']
            print(f"  Test {test_id} ({test_name}):")
            for domain in sorted(by_test[test_id].keys()):
                events = sorted(by_test[test_id][domain])
                domain_name = TEST_CONFIG[test_id]['domains'][domain]
                print(f"    {domain} ({domain_name}): Events {events}")
        print()
    
    def run_menu(self):
        """Main menu loop"""
        while True:
            self.clear_screen()
            self.print_header()
            self.print_progress()
            self.print_pending()
            
            print("OPTIONS:")
            print("1. Import specific combination")
            print("2. Import next pending combination")
            print("3. Import all pending combinations")
            print("4. Clear progress (start over)")
            print("5. Exit")
            print()
            
            try:
                choice = int(input("Enter choice (1-5): "))
                
                if choice == 1:
                    self.import_specific_menu()
                elif choice == 2:
                    self.import_next_pending()
                elif choice == 3:
                    self.import_all_pending()
                elif choice == 4:
                    self.clear_progress()
                elif choice == 5:
                    print("Goodbye!")
                    break
                else:
                    print("Invalid choice. Press Enter to continue...")
                    input()
                    
            except ValueError:
                print("Please enter a valid number. Press Enter to continue...")
                input()
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
    
    def import_specific_menu(self):
        """Menu for importing specific combination"""
        print("\nSELECT COMBINATION TO IMPORT:")
        
        # Select test
        print("\nTests:")
        for test_id, test_info in TEST_CONFIG.items():
            print(f"  {test_id}. {test_info['name']}")
        
        try:
            test_id = int(input("Enter test number: "))
            if test_id not in TEST_CONFIG:
                print("Invalid test number!")
                input("Press Enter to continue...")
                return
        except ValueError:
            print("Invalid input!")
            input("Press Enter to continue...")
            return
        
        # Select domain
        print(f"\nDomains for {TEST_CONFIG[test_id]['name']}:")
        domain_list = list(TEST_CONFIG[test_id]['domains'].keys())
        for i, domain in enumerate(domain_list, 1):
            domain_name = TEST_CONFIG[test_id]['domains'][domain]
            status = "✅" if self.is_completed(test_id, domain, 99) and self.is_completed(test_id, domain, 100) and self.is_completed(test_id, domain, 102) else "⏳"
            print(f"  {i}. {domain} ({domain_name}) {status}")
        
        try:
            domain_choice = int(input("Enter domain number: "))
            if 1 <= domain_choice <= len(domain_list):
                domain = domain_list[domain_choice - 1]
            else:
                print("Invalid domain number!")
                input("Press Enter to continue...")
                return
        except ValueError:
            print("Invalid input!")
            input("Press Enter to continue...")
            return
        
        # Select event
        print(f"\nEvent IDs:")
        for i, event_id in enumerate(EVENT_IDS, 1):
            status = "✅" if self.is_completed(test_id, domain, event_id) else "⏳"
            print(f"  {i}. {event_id} {status}")
        
        try:
            event_choice = int(input("Enter event number: "))
            if 1 <= event_choice <= len(EVENT_IDS):
                event_id = EVENT_IDS[event_choice - 1]
            else:
                print("Invalid event number!")
                input("Press Enter to continue...")
                return
        except ValueError:
            print("Invalid input!")
            input("Press Enter to continue...")
            return
        
        # Confirm and import
        if self.is_completed(test_id, domain, event_id):
            print(f"\n⚠️  T{test_id}-{domain}-{event_id} is already completed!")
            if input("Import anyway? (y/n): ").lower() != 'y':
                return
        
        print(f"\nImporting T{test_id}-{domain}-{event_id}...")
        success = self.importer.import_specific(test_id, domain, event_id)
        
        if success:
            self.mark_completed(test_id, domain, event_id)
            print("✅ Import successful!")
        else:
            print("❌ Import failed!")
        
        input("\nPress Enter to continue...")
    
    def import_next_pending(self):
        """Import next pending combination"""
        pending = self.get_pending_combinations()
        if not pending:
            print("No pending combinations!")
            input("Press Enter to continue...")
            return
        
        test_id, domain, event_id = pending[0]
        print(f"Importing next: T{test_id}-{domain}-{event_id}")
        
        success = self.importer.import_specific(test_id, domain, event_id)
        
        if success:
            self.mark_completed(test_id, domain, event_id)
            print("✅ Import successful!")
        else:
            print("❌ Import failed!")
        
        input("\nPress Enter to continue...")
    
    def import_all_pending(self):
        """Import all pending combinations"""
        pending = self.get_pending_combinations()
        if not pending:
            print("No pending combinations!")
            input("Press Enter to continue...")
            return
        
        print(f"About to import {len(pending)} combinations. This may take a long time.")
        if input("Continue? (y/n): ").lower() != 'y':
            return
        
        successful = 0
        failed = 0
        
        for i, (test_id, domain, event_id) in enumerate(pending, 1):
            print(f"\n[{i}/{len(pending)}] Importing T{test_id}-{domain}-{event_id}")
            
            success = self.importer.import_specific(test_id, domain, event_id)
            
            if success:
                self.mark_completed(test_id, domain, event_id)
                successful += 1
            else:
                failed += 1
            
            # Small delay between imports
            time.sleep(1)
        
        print(f"\nBatch import complete!")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        input("\nPress Enter to continue...")
    
    def clear_progress(self):
        """Clear all progress"""
        if input("Are you sure you want to clear all progress? (y/n): ").lower() == 'y':
            self.completed_tasks = {}
            self.save_progress()
            print("Progress cleared!")
        input("Press Enter to continue...")

def main():
    # Check environment
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SECRET_KEY"):
        print("❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables")
        print("Make sure your .env file is properly configured")
        return
    
    try:
        ui = SATImportUI()
        ui.run_menu()
    except KeyboardInterrupt:
        print("\nGoodbye!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
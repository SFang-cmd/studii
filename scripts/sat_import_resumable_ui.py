#!/usr/bin/env python3
"""
Resumable SAT Question Importer UI
Tracks progress at individual question level to resume after rate limiting
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
PROGRESS_FILE = "sat_import_detailed_progress.json"
RATE_LIMIT_THRESHOLD = 422  # Stop before hitting rate limit

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

class ResumableSATImporter:
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

    def check_question_exists_by_external_id(self, external_id):
        """Check if question already exists in database by external_id"""
        try:
            response = (
                self.supabase.table("questions")
                .select("id")
                .eq("sat_external_id", external_id)
                .execute()
            )
            return len(response.data) > 0
        except:
            return False

    def check_question_exists_by_ibn(self, ibn):
        """Check if question already exists in database by ibn"""
        try:
            response = (
                self.supabase.table("questions")
                .select("id")
                .eq("sat_ibn", ibn)
                .execute()
            )
            return len(response.data) > 0
        except:
            return False

    def add_question(self, overview, question):
        """Add question to database"""
        try:
            external_id = overview.get('external_id')
            ibn = overview.get('ibn')
            
            # Determine question identifier for database operations
            question_id = external_id or ibn
            if not question_id:
                print(f"    DEBUG: No external_id or ibn found in overview: {overview}")
                return "skipped", "No external_id or ibn"

            # Check if already exists (check both fields)
            if external_id and self.check_question_exists_by_external_id(external_id):
                return "duplicate", "Already exists in database (external_id)"
            elif ibn and self.check_question_exists_by_ibn(ibn):
                return "duplicate", "Already exists in database (ibn)"

            # Get skill mapping
            skill_code = overview.get('skill_cd')
            print(f"    DEBUG: Processing skill_code '{skill_code}' for question {question_id}")
            
            skill_id = SAT_SKILL_MAPPING.get(skill_code)
            if not skill_id:
                print(f"    DEBUG: UNKNOWN SKILL CODE '{skill_code}' - not in mapping!")
                print(f"    DEBUG: Available skill codes: {list(SAT_SKILL_MAPPING.keys())}")
                return "skipped", f"Unknown skill code: {skill_code}"

            # Get domain and subject
            domain_id, subject_id = get_domain_subject_mapping(skill_code)
            if not domain_id or not subject_id:
                print(f"    DEBUG: Could not map domain/subject for skill_code '{skill_code}'")
                print(f"    DEBUG: Returned domain_id={domain_id}, subject_id={subject_id}")
                return "skipped", f"Could not map domain/subject for: {skill_code}"

            # Process answer options and determine question structure
            answer_options = None
            correct_answers = []
            question_text = ""
            stimulus = None
            explanation = ""
            question_type = "mcq"

            if external_id:
                # New API format
                question_text = preprocess_mathml(question.get("stem", ""))
                stimulus = preprocess_mathml(question.get("stimulus")) if question.get("stimulus") else None
                explanation = question.get("rationale", "")
                question_type = question.get("type", "mcq")
                
                if question_type == "mcq" and question.get("answerOptions"):
                    answer_options = []
                    for option in question["answerOptions"]:
                        answer_options.append({
                            'id': str(option['id']),
                            'content': preprocess_mathml(option.get('content', '')),
                            'is_correct': False
                        })
                
                correct_answers = question.get('keys', [])
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                    
            elif ibn:
                # Old API format (ibn-based)
                if isinstance(question, list) and len(question) > 0:
                    q_data = question[0]  # Take first item from array
                    
                    question_text = preprocess_mathml(q_data.get("prompt", ""))
                    stimulus = preprocess_mathml(q_data.get("body")) if q_data.get("body") else None
                    
                    answer_data = q_data.get("answer", {})
                    explanation = answer_data.get("rationale", "")
                    answer_style = answer_data.get("style", "Multiple Choice")
                    
                    # Determine question type from style
                    if answer_style == "SPR":
                        question_type = "spr"
                        answer_options = None  # No choices for SPR
                        correct_answers = []   # SPR doesn't have predefined correct answers
                    else:
                        question_type = "mcq"
                        
                        # Process choices from old format
                        choices = answer_data.get("choices", {})
                        if choices:
                            answer_options = []
                            for choice_key, choice_data in choices.items():
                                answer_options.append({
                                    'id': choice_key.upper(),  # Convert a,b,c,d to A,B,C,D
                                    'content': preprocess_mathml(choice_data.get('body', '')),
                                    'is_correct': False
                                })
                        
                        # Get correct answer
                        correct_choice = answer_data.get("correct_choice", "")
                        if correct_choice:
                            correct_answers = [correct_choice.upper()]

            # Insert question
            data = {
                "origin": "sat_official_ibn" if ibn else "sat_official",
                "sat_external_id": external_id,
                "sat_ibn": ibn,
                "question_text": question_text,
                "stimulus": stimulus,
                "question_type": question_type,
                "skill_id": skill_id,
                "sat_program": overview.get("program", "SAT"),
                "difficulty_band": overview.get("score_band_range_cd", 3),
                "difficulty_letter": overview.get("difficulty"),
                "answer_options": answer_options,
                "correct_answers": correct_answers,
                "explanation": explanation,
                "domain_id": domain_id,
                "subject_id": subject_id,
                "is_active": True
            }

            # Use appropriate conflict resolution based on data type
            if external_id:
                response = (
                    self.supabase.table("questions")
                    .upsert(data, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
            else:  # ibn
                response = (
                    self.supabase.table("questions")
                    .upsert(data, on_conflict="sat_ibn", ignore_duplicates=True)
                    .execute()
                )

            if response.data:
                return "imported", "Successfully imported"
            else:
                return "duplicate", "Duplicate detected by upsert"

        except Exception as e:
            return "failed", str(e)

    def fetch_overview(self, test_id, domain, event_id):
        """Fetch question overview for a combination"""
        try:
            content = {"asmtEventId": event_id, "test": test_id, "domain": domain}
            response = self.session.post(OVERVIEW_API, json=content, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching overview: {e}")
            return []

    def fetch_question_details(self, external_id=None, ibn=None):
        """Fetch detailed question data from either new API (external_id) or old API (ibn)"""
        try:
            if external_id:
                # New API endpoint
                problem = {"external_id": external_id}
                response = self.session.post(QUESTION_API, json=problem, timeout=15)
                response.raise_for_status()
                return response.json()
            elif ibn:
                # Old API endpoint using ibn
                old_api_url = f"https://saic.collegeboard.org/disclosed/{ibn}.json"
                response = self.session.get(old_api_url, timeout=15)
                response.raise_for_status()
                return response.json()
            else:
                print("No external_id or ibn provided")
                return None
        except Exception as e:
            identifier = external_id or ibn
            print(f"Error fetching question {identifier}: {e}")
            return None

    def import_with_resume(self, test_id, domain, event_id, start_index=0, max_questions=None):
        """Import with resume capability and rate limit protection"""
        combo_key = f"T{test_id}-{domain}-{event_id}"
        print(f"\n{'='*60}")
        print(f"IMPORTING: {combo_key} (starting from question {start_index + 1})")
        print(f"{'='*60}")
        
        # Fetch overview (always get fresh list)
        overview_list = self.fetch_overview(test_id, domain, event_id)
        if not overview_list:
            print("No questions found for this combination")
            return False, 0, 0, 0, 0, 0
        
        total_questions = len(overview_list)
        print(f"Total questions available: {total_questions}")
        
        if start_index >= total_questions:
            print("Starting index is beyond available questions!")
            return False, 0, 0, 0, 0, 0
        
        # Calculate how many to process
        if max_questions:
            end_index = min(start_index + max_questions, total_questions)
        else:
            end_index = min(start_index + RATE_LIMIT_THRESHOLD, total_questions)
        
        questions_to_process = end_index - start_index
        print(f"Processing questions {start_index + 1} to {end_index} ({questions_to_process} questions)")
        
        # Statistics
        imported = 0
        skipped = 0
        failed = 0
        duplicates = 0
        
        # Debug: Track skip reasons
        skip_reasons = {}
        unknown_skill_codes = set()
        
        # Process questions
        for i in range(start_index, end_index):
            overview = overview_list[i]
            external_id = overview.get('external_id')
            ibn = overview.get('ibn')
            
            # Always show the progress number
            progress = f"[{i - start_index + 1}/{questions_to_process}]"
            
            # Determine question identifier
            question_id = external_id or ibn
            if not question_id:
                print(f"{progress} SKIPPED - No external_id or ibn in overview")
                skipped += 1
                skip_reasons["No external_id or ibn"] = skip_reasons.get("No external_id or ibn", 0) + 1
                continue
            
            # Update progress bar
            question_type = "external_id" if external_id else "ibn"
            print(f"{progress} Processing {question_id} ({question_type})...", end=" ")
            
            # Debug: Show overview data for first few questions
            if i - start_index < 3:
                print(f"\n    DEBUG: Overview data: {overview}")
            
            # Fetch question details
            question_details = self.fetch_question_details(external_id=external_id, ibn=ibn)
            if not question_details:
                print("FAILED (fetch)")
                failed += 1
                continue
            
            # Add to database
            status, message = self.add_question(overview, question_details)
            
            if status == "imported":
                imported += 1
                print("IMPORTED")
            elif status == "duplicate":
                duplicates += 1
                print("DUPLICATE")
            elif status == "skipped":
                skipped += 1
                print(f"SKIPPED ({message})")
                # Track skip reason
                skip_reasons[message] = skip_reasons.get(message, 0) + 1
                # Track unknown skill codes
                if "Unknown skill code:" in message:
                    skill_code = message.split("Unknown skill code: ")[1]
                    unknown_skill_codes.add(skill_code)
            else:  # failed
                failed += 1
                print(f"FAILED ({message})")
            
            # Small delay to be nice to API
            time.sleep(0.1)
        
        # Results
        print(f"\nResults for {combo_key}:")
        print(f"  Imported: {imported}")
        print(f"  Duplicates: {duplicates}")
        print(f"  Skipped: {skipped}")
        print(f"  Failed: {failed}")
        print(f"  Processed: {questions_to_process}")
        print(f"  Next start index: {end_index}")
        
        # # Debug: Show skip analysis
        # if skip_reasons:
        #     print(f"\nDETAILED SKIP ANALYSIS:")
        #     for reason, count in skip_reasons.items():
        #         print(f"  {reason}: {count} questions")
        
        # if unknown_skill_codes:
        #     print(f"\nUNKNOWN SKILL CODES FOUND:")
        #     for skill_code in sorted(unknown_skill_codes):
        #         print(f"  {skill_code}")
        #     print(f"\nSUGGESTED MAPPING ADDITIONS:")
        #     for skill_code in sorted(unknown_skill_codes):
        #         print(f"    '{skill_code}': 'skill-{skill_code.lower().replace('.', '-')}',")
        
        return True, end_index, imported, duplicates, skipped, failed

class SATImportProgressManager:
    def __init__(self):
        self.importer = ResumableSATImporter()
        self.progress_data = self.load_progress()
        
    def load_progress(self):
        """Load detailed progress from file"""
        try:
            if os.path.exists(PROGRESS_FILE):
                with open(PROGRESS_FILE, 'r') as f:
                    return json.load(f)
        except:
            pass
        return {}
    
    def save_progress(self):
        """Save detailed progress to file"""
        try:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump(self.progress_data, f, indent=2)
        except Exception as e:
            print(f"Error saving progress: {e}")
    
    def get_combo_progress(self, test_id, domain, event_id):
        """Get progress for specific combination"""
        combo_key = f"T{test_id}-{domain}-{event_id}"
        return self.progress_data.get(combo_key, {
            "total_questions": 0,
            "processed_questions": 0,
            "next_start_index": 0,
            "imported": 0,
            "duplicates": 0,
            "skipped": 0,
            "failed": 0,
            "completed": False,
            "last_updated": None
        })
    
    def update_combo_progress(self, test_id, domain, event_id, total_questions, next_start_index, imported, duplicates, skipped, failed):
        """Update progress for specific combination"""
        combo_key = f"T{test_id}-{domain}-{event_id}"
        
        if combo_key not in self.progress_data:
            self.progress_data[combo_key] = {}
        
        progress = self.progress_data[combo_key]
        progress["total_questions"] = total_questions
        progress["processed_questions"] = next_start_index
        progress["next_start_index"] = next_start_index
        progress["imported"] = progress.get("imported", 0) + imported
        progress["duplicates"] = progress.get("duplicates", 0) + duplicates
        progress["skipped"] = progress.get("skipped", 0) + skipped
        progress["failed"] = progress.get("failed", 0) + failed
        progress["completed"] = next_start_index >= total_questions
        progress["last_updated"] = time.time()
        
        self.save_progress()
    
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def print_header(self):
        """Print application header"""
        print("=" * 70)
        print("              SAT QUESTION IMPORTER (RESUMABLE)")
        print("                Rate Limit Safe Import")
        print("=" * 70)
        print()
    
    def print_overview(self):
        """Print overview of all combinations"""
        print("IMPORT PROGRESS OVERVIEW:")
        print("=" * 50)
        
        total_combinations = 0
        completed_combinations = 0
        total_imported = 0
        
        for test_id, test_info in TEST_CONFIG.items():
            print(f"\n{test_info['name']} (Test {test_id}):")
            
            for domain, domain_name in test_info['domains'].items():
                print(f"  {domain} ({domain_name}):")
                
                domain_imported = 0
                domain_total = 0
                
                for event_id in EVENT_IDS:
                    total_combinations += 1
                    progress = self.get_combo_progress(test_id, domain, event_id)
                    
                    status = "✅" if progress["completed"] else "⏳"
                    processed = progress["processed_questions"]
                    total = progress["total_questions"]
                    imported = progress["imported"]
                    
                    if progress["completed"]:
                        completed_combinations += 1
                    
                    domain_imported += imported
                    domain_total += total
                    total_imported += imported
                    
                    if total > 0:
                        percentage = (processed / total) * 100
                        print(f"    Event {event_id}: {status} {processed}/{total} ({percentage:.1f}%) - Imported: {imported}")
                    else:
                        print(f"    Event {event_id}: {status} Not started - Imported: {imported}")
                
                print(f"    Domain Total: {domain_imported} questions imported")
        
        print(f"\nOVERALL SUMMARY:")
        print(f"  Combinations: {completed_combinations}/{total_combinations} completed")
        print(f"  Total imported: {total_imported} questions")
        print()
    
    def run_menu(self):
        """Main menu loop"""
        while True:
            self.clear_screen()
            self.print_header()
            self.print_overview()
            
            print("OPTIONS:")
            print("1. Import specific combination (with resume)")
            print("2. Import next incomplete combination")
            print("3. Show detailed progress for combination")
            print("4. Reset progress for combination")
            print("5. Export progress report")
            print("6. Exit")
            print()
            
            try:
                choice = int(input("Enter choice (1-6): "))
                
                if choice == 1:
                    self.import_specific_menu()
                elif choice == 2:
                    self.import_next_incomplete()
                elif choice == 3:
                    self.show_detailed_progress()
                elif choice == 4:
                    self.reset_combination_progress()
                elif choice == 5:
                    self.export_progress_report()
                elif choice == 6:
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
        """Menu for importing specific combination with resume"""
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
            print(f"  {i}. {domain} ({domain_name})")
        
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
            progress = self.get_combo_progress(test_id, domain, event_id)
            status = "✅" if progress["completed"] else "⏳"
            processed = progress["processed_questions"]
            total = progress["total_questions"]
            
            if total > 0:
                print(f"  {i}. {event_id} {status} ({processed}/{total} processed)")
            else:
                print(f"  {i}. {event_id} {status} (Not started)")
        
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
        
        # Show current progress and options
        progress = self.get_combo_progress(test_id, domain, event_id)
        combo_key = f"T{test_id}-{domain}-{event_id}"
        
        print(f"\nCurrent progress for {combo_key}:")
        print(f"  Processed: {progress['processed_questions']}/{progress['total_questions']}")
        print(f"  Imported: {progress['imported']}")
        print(f"  Next start index: {progress['next_start_index']}")
        print(f"  Status: {'Completed' if progress['completed'] else 'In Progress'}")
        
        # Import options
        print(f"\nImport options:")
        print(f"1. Resume from next position (index {progress['next_start_index']})")
        print(f"2. Start from custom position")
        print(f"3. Restart from beginning")
        print(f"4. Cancel")
        
        try:
            import_choice = int(input("Enter option: "))
            
            start_index = 0
            max_questions = None
            
            if import_choice == 1:
                start_index = progress['next_start_index']
            elif import_choice == 2:
                start_index = int(input(f"Enter start index (0-{progress.get('total_questions', 'unknown')}): "))
                max_questions_input = input("Enter max questions to process (or Enter for rate limit safe): ").strip()
                if max_questions_input:
                    max_questions = int(max_questions_input)
            elif import_choice == 3:
                start_index = 0
            elif import_choice == 4:
                return
            else:
                print("Invalid option!")
                input("Press Enter to continue...")
                return
        except ValueError:
            print("Invalid input!")
            input("Press Enter to continue...")
            return
        
        # Perform import
        print(f"\nStarting import...")
        result = self.importer.import_with_resume(test_id, domain, event_id, start_index, max_questions)
        
        if isinstance(result, tuple) and len(result) >= 6:
            success, next_index, session_imported, session_duplicates, session_skipped, session_failed = result[:6]
            
            if success:
                # Get fresh overview to update total count
                overview_list = self.importer.fetch_overview(test_id, domain, event_id)
                total_questions = len(overview_list) if overview_list else 0
                
                # Update progress with actual session stats
                self.update_combo_progress(test_id, domain, event_id, total_questions, next_index, 
                                         session_imported, session_duplicates, session_skipped, session_failed)
                
                print("✅ Import session completed!")
                if next_index < total_questions:
                    print(f"Resume from index {next_index} next time to continue.")
                else:
                    print("🎉 This combination is now complete!")
            else:
                print("❌ Import failed!")
        else:
            # Fallback for old return format
            print("⚠️ Import completed but could not update progress (old return format)")
        
        input("\nPress Enter to continue...")
    
    def import_next_incomplete(self):
        """Import next incomplete combination"""
        # Find first incomplete combination
        for test_id, test_info in TEST_CONFIG.items():
            for domain in test_info['domains']:
                for event_id in EVENT_IDS:
                    progress = self.get_combo_progress(test_id, domain, event_id)
                    if not progress['completed']:
                        combo_key = f"T{test_id}-{domain}-{event_id}"
                        print(f"Importing next incomplete: {combo_key}")
                        print(f"Resuming from index: {progress['next_start_index']}")
                        
                        result = self.importer.import_with_resume(
                            test_id, domain, event_id, progress['next_start_index'])
                        
                        if isinstance(result, tuple) and len(result) >= 6:
                            success, next_index, session_imported, session_duplicates, session_skipped, session_failed = result[:6]
                            
                            if success:
                                # Update progress with actual session stats
                                overview_list = self.importer.fetch_overview(test_id, domain, event_id)
                                total_questions = len(overview_list) if overview_list else 0
                                self.update_combo_progress(test_id, domain, event_id, total_questions, next_index, 
                                                         session_imported, session_duplicates, session_skipped, session_failed)
                                print("✅ Import session completed!")
                            else:
                                print("❌ Import failed!")
                        else:
                            print("⚠️ Import completed but could not update progress")
                        
                        input("\nPress Enter to continue...")
                        return
        
        print("No incomplete combinations found!")
        input("Press Enter to continue...")
    
    def show_detailed_progress(self):
        """Show detailed progress for a specific combination"""
        # Implementation similar to import_specific_menu but just shows info
        print("Feature coming soon...")
        input("Press Enter to continue...")
    
    def reset_combination_progress(self):
        """Reset progress for a specific combination"""
        print("Feature coming soon...")
        input("Press Enter to continue...")
    
    def export_progress_report(self):
        """Export detailed progress report"""
        report_file = f"sat_import_report_{int(time.time())}.json"
        try:
            with open(report_file, 'w') as f:
                json.dump(self.progress_data, f, indent=2)
            print(f"Progress report exported to: {report_file}")
        except Exception as e:
            print(f"Error exporting report: {e}")
        input("Press Enter to continue...")

def main():
    # Check environment
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SECRET_KEY"):
        print("❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables")
        print("Make sure your .env file is properly configured")
        return
    
    try:
        manager = SATImportProgressManager()
        manager.run_menu()
    except KeyboardInterrupt:
        print("\nGoodbye!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
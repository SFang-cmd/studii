#!/usr/bin/env python3
"""
Modular SAT Question Importer - Import specific sections individually
"""

import os
import json
import time
import requests
import argparse
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# College Board API constants
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# Assessment event IDs
ASMT_EVENT_IDS = [99, 100, 102]

# Domain mappings
DOMAIN_CONFIG = {
    # Reading domains (test=1)
    "INI": {"test": 1, "name": "Information and Ideas"},
    "CAS": {"test": 1, "name": "Craft and Structure"},
    "EOI": {"test": 1, "name": "Expression of Ideas"},
    "SEC": {"test": 1, "name": "Standard English Conventions"},
    
    # Math domains (test=2)
    "H": {"test": 2, "name": "Algebra"},
    "P": {"test": 2, "name": "Advanced Math"},
    "Q": {"test": 2, "name": "Problem Solving and Data Analysis"},
    "S": {"test": 2, "name": "Geometry and Trigonometry"}
}

# SAT skill code mapping
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

class ModularSATImporter:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase = create_client(url, key)
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
                print(f"Unknown skill code: {skill_code}")
                self.skipped += 1
                return

            # Get domain and subject
            domain_id, subject_id = get_domain_subject_mapping(skill_code)
            if not domain_id or not subject_id:
                print(f"Could not map domain/subject for: {skill_code}")
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
            print(f"Error adding question {external_id}: {e}")
            self.failed += 1

    def import_domain(self, domain_code, event_ids=None):
        """Import questions for a specific domain"""
        if domain_code not in DOMAIN_CONFIG:
            print(f"Unknown domain: {domain_code}")
            print(f"Available domains: {', '.join(DOMAIN_CONFIG.keys())}")
            return

        if event_ids is None:
            event_ids = ASMT_EVENT_IDS

        domain_info = DOMAIN_CONFIG[domain_code]
        test_id = domain_info["test"]
        domain_name = domain_info["name"]

        print(f"Importing {domain_name} ({domain_code}) questions...")
        print(f"Event IDs: {event_ids}")

        for event_id in event_ids:
            print(f"\nProcessing event {event_id} for domain {domain_code}")
            
            try:
                # Get overview list
                content = {"asmtEventId": event_id, "test": test_id, "domain": domain_code}
                overview_response = requests.post(OVERVIEW_API, json=content, timeout=30)
                overview_list = overview_response.json()

                if not overview_list:
                    print(f"No questions found for {domain_code}-{event_id}")
                    continue

                print(f"Found {len(overview_list)} questions")

                # Process each question
                for overview in tqdm(overview_list, desc=f"Processing {domain_code}-{event_id}"):
                    if overview.get("external_id") is None:
                        continue

                    # Get question details
                    problem = {"external_id": overview["external_id"]}
                    question_response = requests.post(QUESTION_API, json=problem, timeout=15)
                    question = question_response.json()
                    
                    # Add question to database
                    self.add_question(overview, question)
                    
                    # Small delay
                    time.sleep(0.2)

            except Exception as e:
                print(f"Error processing {domain_code}-{event_id}: {e}")
                continue

        print(f"\nDomain {domain_code} import complete!")
        self.print_stats()

    def import_all_reading(self):
        """Import all reading domains"""
        reading_domains = ["INI", "CAS", "EOI", "SEC"]
        print("Importing all Reading domains...")
        for domain in reading_domains:
            self.import_domain(domain)

    def import_all_math(self):
        """Import all math domains"""
        math_domains = ["H", "P", "Q", "S"]
        print("Importing all Math domains...")
        for domain in math_domains:
            self.import_domain(domain)

    def import_all(self):
        """Import all domains"""
        print("Importing all domains...")
        for domain_code in DOMAIN_CONFIG.keys():
            self.import_domain(domain_code)

    def print_stats(self):
        """Print import statistics"""
        print(f"Imported: {self.imported}")
        print(f"Skipped: {self.skipped}")
        print(f"Failed: {self.failed}")
        print(f"Total: {self.imported + self.skipped + self.failed}")

def main():
    parser = argparse.ArgumentParser(description='Modular SAT Question Importer')
    parser.add_argument('--domain', type=str, help='Domain to import (INI, CAS, EOI, SEC, H, P, Q, S)')
    parser.add_argument('--events', nargs='+', type=int, help='Specific event IDs to import (default: all)')
    parser.add_argument('--all-reading', action='store_true', help='Import all reading domains')
    parser.add_argument('--all-math', action='store_true', help='Import all math domains')
    parser.add_argument('--all', action='store_true', help='Import all domains')
    parser.add_argument('--list-domains', action='store_true', help='List available domains')

    args = parser.parse_args()

    if args.list_domains:
        print("Available domains:")
        for code, info in DOMAIN_CONFIG.items():
            subject = "Reading" if info["test"] == 1 else "Math"
            print(f"  {code}: {info['name']} ({subject})")
        return

    importer = ModularSATImporter()

    if args.all:
        importer.import_all()
    elif args.all_reading:
        importer.import_all_reading()
    elif args.all_math:
        importer.import_all_math()
    elif args.domain:
        event_ids = args.events if args.events else None
        importer.import_domain(args.domain, event_ids)
    else:
        print("No import option specified. Use --help for options.")
        parser.print_help()

if __name__ == "__main__":
    main()
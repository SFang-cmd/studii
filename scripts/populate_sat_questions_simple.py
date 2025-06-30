#!/usr/bin/env python3
"""
Simple SAT Question Importer - Clean implementation following original pattern
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

# College Board API constants
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# Assessment event IDs
ASMT_EVENT_IDS = [99, 100, 102]

# Test configuration - test 1 is reading, test 2 is math
TESTS = [1, 2]
READING_DOMAINS = ["INI", "CAS", "EOI", "SEC"]
MATH_DOMAINS = ["H", "P", "Q", "S"]

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

class SATImporter:
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
        """Add question to database - simplified version"""
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

    def run_import(self):
        """Main import process - following original pattern"""
        print("Starting SAT question import...")
        
        # Loop through tests (1=reading, 2=math)
        for test in TESTS:
            domains = READING_DOMAINS if test == 1 else MATH_DOMAINS
            subject_name = "Reading" if test == 1 else "Math"
            print(f"\nCurrently Populating Subject: {subject_name}")

            # Loop through domains
            for domain in domains:
                print(f"->Currently Populating domain: {domain}")

                # Loop through assessment event IDs
                for event_id in ASMT_EVENT_IDS:
                    print(f"->->Currently Populating test: {event_id}")
                    
                    try:
                        # Get overview list
                        content = {"asmtEventId": event_id, "test": test, "domain": domain}
                        overview_response = requests.post(OVERVIEW_API, json=content, timeout=30)
                        overview_list = overview_response.json()

                        # Process each question in overview
                        for overview in tqdm(overview_list):
                            if overview.get("external_id") is None:
                                continue

                            # Get the question details
                            problem = {"external_id": overview["external_id"]}
                            question_response = requests.post(QUESTION_API, json=problem, timeout=15)
                            question = question_response.json()
                            
                            # Add question to database
                            self.add_question(overview, question)
                            
                            # Small delay to be nice to the API
                            time.sleep(0.2)

                    except Exception as e:
                        print(f"Error processing {domain}-{event_id}: {e}")
                        continue

        print(f"\nImport complete!")
        print(f"Imported: {self.imported}")
        print(f"Skipped: {self.skipped}")
        print(f"Failed: {self.failed}")
        print(f"Total: {self.imported + self.skipped + self.failed}")

def main():
    importer = SATImporter()
    importer.run_import()

if __name__ == "__main__":
    main()
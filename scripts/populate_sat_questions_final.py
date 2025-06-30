#!/usr/bin/env python3
"""
SAT Question Database Population Script - Final Version
Using direct Supabase upsert pattern matching user's existing code style
"""

import os
import json
import time
import random
import requests
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client, Client
import logging
from typing import Dict, List, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sat_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# College Board API constants
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# Assessment event IDs to fetch
ASMT_EVENT_IDS = [99, 100, 102]

# Test configuration
TEST_CONFIG = {
    1: {
        "name": "Reading and Writing", 
        "domains": ["INI", "CAS", "EOI", "SEC"]
    },
    2: {
        "name": "Math", 
        "domains": ["H", "P", "Q", "S"]
    }
}

# Complete SAT skill code mapping
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

def preprocess_mathml_content(text: str) -> str:
    """
    Preprocess MathML content to replace mfenced tags with mo tags
    """
    if not text:
        return text
    
    # Replace opening mfenced tags with mo opening parenthesis
    text = text.replace('<mfenced>', '<mo>(</mo>')
    
    # Replace closing mfenced tags with mo closing parenthesis  
    text = text.replace('</mfenced>', '<mo>)</mo>')
    
    return text

class SATQuestionImporter:
    
    def __init__(self):
        load_dotenv()
        
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
        
        # Create a session without automatic retries (we'll handle retries manually)
        self.session = requests.Session()
        
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        # Statistics
        self.imported_count = 0
        self.duplicate_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        self.retry_count = 0
        
        # Flag to indicate when a timeout occurs
        self.timeout_occurred = False
    
    def fetch_question_overview(self, test_id: int, domain: str, event_id: int) -> List[Dict]:
        """Fetch question overview from SAT API"""
        payload = {
            "asmtEventId": event_id,
            "test": test_id,
            "domain": domain
        }
        
        try:
            # Single attempt with short timeout
            response = self.session.post(OVERVIEW_API, json=payload, timeout=15)
            response.raise_for_status()
            
            # Handle different response formats
            data = response.json()
            
            # If data is a list, use it directly
            if isinstance(data, list):
                return data
            
            # If data is a dict with 'questions' key, use that
            if isinstance(data, dict) and 'questions' in data:
                return data['questions']
                
            # Otherwise return empty list
            logger.warning(f"Unexpected response format for {domain}-{event_id}")
            return []
            
        except requests.RequestException as e:
            # Log the error and signal that we should move to a different domain/test
            logger.error(f"Timeout or error fetching overview for {domain}-{event_id}: {str(e)}")
            # Set a flag to indicate we should break out of the current domain/event
            self.timeout_occurred = True
            return []
    
    def fetch_question_details(self, external_id: str) -> Optional[Dict]:
        """Fetch detailed question data for a specific question"""
        payload = {
            "external_id": external_id
        }
        
        try:
            # Single attempt with short timeout
            response = self.session.post(QUESTION_API, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # Log the error and signal that we should move to a different domain/test
            logger.error(f"Timeout or error fetching question {external_id}: {str(e)}")
            # Set a flag to indicate we should break out of the current domain/event
            self.timeout_occurred = True
            return None
    
    def add_question(self, overview: dict, question: dict):
        """Add question using upsert pattern matching user's existing code style"""
        try:
            # Extract external_id
            external_id = overview.get('external_id') or overview.get('externalid')
            if not external_id:
                logger.warning("Question missing external_id, skipping")
                self.skipped_count += 1
                return
            
            # Map SAT skill code to internal skill ID
            sat_skill_code = overview.get('skill_cd')
            skill_id = SAT_SKILL_MAPPING.get(sat_skill_code) if sat_skill_code else None
            
            if not sat_skill_code or sat_skill_code not in SAT_SKILL_MAPPING:
                logger.warning(f"Unknown SAT skill code: {sat_skill_code}, skipping question {external_id}")
                self.skipped_count += 1
                return
                
            # Map domain and subject IDs based on SAT skill code
            domain_id = None
            subject_id = None
            
            if sat_skill_code:
                # Math domains
                if sat_skill_code.startswith('H.'):
                    domain_id = 'algebra'
                    subject_id = 'math'
                elif sat_skill_code.startswith('P.'):
                    domain_id = 'advanced-math'
                    subject_id = 'math'
                elif sat_skill_code.startswith('Q.'):
                    domain_id = 'problem-solving-data-analysis'
                    subject_id = 'math'
                elif sat_skill_code.startswith('S.'):
                    domain_id = 'geometry-trigonometry'
                    subject_id = 'math'
                # English domains
                elif sat_skill_code in ['CID', 'INF', 'COE']:
                    domain_id = 'information-ideas'
                    subject_id = 'english'
                elif sat_skill_code in ['WIC', 'TSP', 'CTC']:
                    domain_id = 'craft-structure'
                    subject_id = 'english'
                elif sat_skill_code in ['SYN', 'TRA']:
                    domain_id = 'expression-ideas'
                    subject_id = 'english'
                elif sat_skill_code in ['BOU', 'FSS']:
                    domain_id = 'standard-english-conventions'
                    subject_id = 'english'
            
            if not domain_id or not subject_id:
                logger.warning(f"Could not map domain/subject for skill code: {sat_skill_code}, skipping question {external_id}")
                self.skipped_count += 1
                return
                
            # Log the domain/subject mapping for debugging
            logger.debug(f"Mapped skill {sat_skill_code} to domain={domain_id}, subject={subject_id} for question {external_id}")
            
            # Process answer options based on question type
            if question["type"] == "mcq":
                # Extract individual answer options for MCQ
                answer_options = question.get("answerOptions", [])
                processed_answer_options = []
                
                for option in answer_options:
                    if isinstance(option, dict) and 'id' in option:
                        # Preprocess answer option content for MathML
                        option_content = str(option.get('content', option.get('text', '')))
                        processed_answer_options.append({
                            'id': str(option['id']),
                            'content': preprocess_mathml_content(option_content),
                            'is_correct': option.get('is_correct', False)
                        })
                
                # Extract correct answers
                correct_answers = question.get('keys', question.get('correct_answers', []))
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                # Preprocess question text and stimulus for MathML
                question_text = preprocess_mathml_content(question.get("stem", ""))
                stimulus = preprocess_mathml_content(question.get("stimulus")) if question.get("stimulus") else None
                
                # Upsert MCQ question
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question_text,
                        "stimulus": stimulus,
                        "question_type": question["type"],
                        "skill_id": skill_id,
                        "sat_program": overview.get("program", "SAT"),
                        "difficulty_band": overview.get("score_band_range_cd", 3),
                        "difficulty_letter": overview.get("difficulty"),
                        "answer_options": processed_answer_options,
                        "correct_answers": correct_answers,
                        "explanation": question.get("rationale"),
                        "domain_id": domain_id,
                        "subject_id": subject_id,
                        "is_active": True
                    }, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
                
            elif question["type"] == "spr":
                # Handle student-produced response questions
                correct_answers = question.get('keys', question.get('correct_answers', []))
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                # Preprocess question text and stimulus for MathML
                question_text = preprocess_mathml_content(question.get("stem", ""))
                stimulus = preprocess_mathml_content(question.get("stimulus")) if question.get("stimulus") else None
                
                # Upsert SPR/Grid-in question
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question_text,
                        "stimulus": stimulus,
                        "question_type": question["type"],
                        "skill_id": skill_id,
                        "sat_program": overview.get("program", "SAT"),
                        "difficulty_band": overview.get("score_band_range_cd", 3),
                        "difficulty_letter": overview.get("difficulty"),
                        "answer_options": None,  # No multiple choice options
                        "correct_answers": correct_answers,
                        "explanation": question.get("rationale"),
                        "domain_id": domain_id,
                        "subject_id": subject_id,
                        "is_active": True
                    }, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
            else:
                logger.warning(f"Unknown question type: {question['type']}, skipping question {external_id}")
                self.skipped_count += 1
                return
            
            if response.data:
                self.imported_count += 1
                logger.debug(f"Successfully imported question {external_id}")
            else:
                logger.warning(f"Question {external_id} may have been a duplicate")
                self.duplicate_count += 1
                
        except Exception as e:
            logger.error(f"Error importing question {overview.get('external_id', 'unknown')}: {e}")
            self.failed_count += 1
    
    def process_domain_questions(self, test_id: int, domain: str):
        """Process all questions for a specific domain"""
        logger.info(f"Processing domain: {domain}")
        
        # Reset timeout flag at the start of processing a new domain
        self.timeout_occurred = False
        
        for event_id in ASMT_EVENT_IDS:
            logger.info(f"  Fetching questions from event {event_id}")
            
            # Skip INI-99 if we've already had a timeout
            if event_id == 99 and self.timeout_occurred:
                logger.warning("Skipping event 99 due to previous timeout")
                continue
                
            # Get question overview
            overview_questions = self.fetch_question_overview(test_id, domain, event_id)
            if not overview_questions:
                continue
            
            logger.info(f"  Found {len(overview_questions)} questions to process")
            
            # Process questions with rate limiting
            for i, overview in enumerate(tqdm(overview_questions, desc=f"  Processing {domain}-{event_id}")):
                external_id = overview.get('external_id') or overview.get('externalid')
                if not external_id:
                    self.skipped_count += 1
                    continue
                
                # Fetch detailed question data
                question_details = self.fetch_question_details(external_id)
                
                # Check if a timeout occurred
                if self.timeout_occurred:
                    logger.warning(f"Timeout detected at question {i+1}/{len(overview_questions)} with ID {external_id}")
                    logger.warning(f"Breaking out of event {event_id} and moving to next")
                    break
                    
                if not question_details:
                    self.failed_count += 1
                    continue
                
                # Import the question
                self.add_question(overview, question_details)
                
                # Basic rate limiting to avoid overwhelming the API
                time.sleep(0.5)  # Basic delay between requests
                
                # Additional rate limiting with progressive delays
                if (i + 1) % 10 == 0:  # Short pause every 10 questions
                    pause_time = 2 + random.uniform(0, 1)
                    logger.info(f"Short pause - sleeping for {pause_time:.1f}s after {i + 1} questions")
                    time.sleep(pause_time)
                    
                if (i + 1) % 50 == 0:  # Longer pause every 50 questions
                    pause_time = 15 + random.uniform(0, 5)
                    logger.info(f"Rate limiting pause - sleeping for {pause_time:.1f}s after {i + 1} questions")
                    time.sleep(pause_time)
    
    def run_import(self):
        """Main import process"""
        logger.info("Starting comprehensive SAT question import")
        logger.info(f"Target skill mappings: {len(SAT_SKILL_MAPPING)} skills")
        
        start_time = time.time()
        
        for test_id, test_info in TEST_CONFIG.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"Processing {test_info['name']} (Test ID: {test_id})")
            logger.info(f"{'='*50}")
            
            for domain in test_info['domains']:
                try:
                    self.process_domain_questions(test_id, domain)
                    logger.info(f"Domain {domain} completed")
                except Exception as e:
                    logger.error(f"Error processing domain {domain}: {e}")
        
        # Final statistics
        elapsed_time = time.time() - start_time
        logger.info(f"\n{'='*50}")
        logger.info("IMPORT COMPLETE")
        logger.info(f"{'='*50}")
        logger.info(f"Total imported: {self.imported_count}")
        logger.info(f"Total duplicates skipped: {self.duplicate_count}")
        logger.info(f"Total failed: {self.failed_count}")
        logger.info(f"Total skipped: {self.skipped_count}")
        logger.info(f"Total retries: {self.retry_count}")
        logger.info(f"Total processed: {self.imported_count + self.duplicate_count + self.failed_count + self.skipped_count}")
        logger.info(f"Elapsed time: {elapsed_time:.2f} seconds (avg {elapsed_time/(self.imported_count + self.duplicate_count + 0.001):.2f}s per successful question)")

def main():
    """Main execution function"""
    try:
        logger.info("Starting SAT question import with enhanced error handling and rate limiting")
        importer = SATQuestionImporter()
        importer.run_import()
    except KeyboardInterrupt:
        logger.info("Import interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error during import: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    main()
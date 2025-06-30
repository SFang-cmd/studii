#!/usr/bin/env python3
"""
SAT Question Database Population Script - Modular Version
Allows importing questions for specific test IDs, domains, and event IDs
"""

import os
import json
import time
import random
import requests
import argparse
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
    'H.F.': 'nonlinear-functions',
    
    # MATH - Problem Solving (P)
    'P.A.': 'ratio-rate-proportion',
    'P.B.': 'percentages',
    'P.C.': 'unit-conversion',
    'P.D.': 'data-collection-conclusions',
    'P.E.': 'data-inferences',
    'P.F.': 'probability',
    'P.G.': 'center-spread-shape',
    'P.H.': 'scatterplots-trend-lines',
    'P.I.': 'nonlinear-data-relationships',
    'P.J.': 'categorical-data-comparisons',
    
    # MATH - Advanced Math (Q)
    'Q.A.': 'equivalent-expressions',
    'Q.B.': 'systems-equations-inequalities',
    'Q.C.': 'quadratic-exponential-functions',
    'Q.D.': 'polynomial-operations',
    'Q.E.': 'function-notation',
    'Q.F.': 'function-structure',
    'Q.G.': 'complex-numbers',
    'Q.H.': 'rational-radical-equations',
    
    # MATH - Geometry (S)
    'S.A.': 'area-volume',
    'S.B.': 'lines-angles-triangles',
    'S.C.': 'right-triangles',
    'S.D.': 'trigonometric-ratios',
    'S.E.': 'circle-equations',
    
    # READING - Information and Ideas (INI)
    'INI.A.': 'central-ideas-details',
    'INI.B.': 'relationships',
    'INI.C.': 'text-purpose-point-of-view',
    'INI.D.': 'claims-counterclaims',
    'INI.E.': 'evidence',
    
    # READING - Craft and Structure (CAS)
    'CAS.A.': 'text-structure-organization',
    'CAS.B.': 'word-choice-text-elements',
    'CAS.C.': 'cross-text-connections',
    
    # WRITING - Expression of Ideas (EOI)
    'EOI.A.': 'development',
    'EOI.B.': 'organization',
    'EOI.C.': 'effective-language-use',
    
    # WRITING - Standard English Conventions (SEC)
    'SEC.A.': 'boundaries',
    'SEC.B.': 'form-structure-sense',
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
    """Class to handle SAT question importing"""
    
    def __init__(self):
        """Initialize the importer with Supabase client and counters"""
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY environment variables must be set")
            
        self.supabase = create_client(supabase_url, supabase_key)
        
        # Initialize counters
        self.imported_count = 0
        self.duplicate_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        self.retry_count = 0
        
        # Flag to track if a timeout occurred
        self.timeout_occurred = False
        
        # Configure session with more robust retry mechanism
        retries = Retry(
            total=5,  # Increased from 3 to 5
            backoff_factor=1.5,  # Increased from 0.5 to 1.5
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
            respect_retry_after_header=True
        )
        self.session = requests.Session()
        
        # Add the same headers as in the original script
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        self.session.mount("https://", HTTPAdapter(max_retries=retries))
        
    def fetch_question_overview(self, test_id: int, domain: str, event_id: int) -> List[Dict]:
        """Fetch question overview from SAT API"""
        # Use the correct parameter names as expected by the API
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
    
    def add_question(self, overview: Dict, question_details: Dict) -> bool:
    """Process and add a question to the database"""
    try:
        # Extract the external ID
        external_id = overview.get('external_id') or overview.get('externalid')
        if not external_id:
            logger.warning(f"Missing external ID in question overview")
            self.skipped_count += 1
            return False
        
        # In the final version, question_details is the actual question data
        question = question_details
        if not question:
            logger.warning(f"Missing question data for {external_id}")
            self.skipped_count += 1
            return False
            
        # Extract SAT skill code and map to domain/subject
        sat_skill_code = overview.get('skill_cd', '')
        domain_id = None
        subject_id = None
        
        # Map skill code to domain and subject
        if sat_skill_code:
            # First check the direct mapping
            if sat_skill_code in SAT_SKILL_MAPPING:
                domain_id = SAT_SKILL_MAPPING[sat_skill_code]
                
                # Determine subject based on skill code prefix
                if sat_skill_code.startswith(('H.', 'P.', 'Q.', 'S.')):
                    subject_id = 'math'
                else:
                    subject_id = 'english'
            else:
                # Try to map based on the prefix
                if sat_skill_code.startswith('INI'):
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
            return False
                
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
                        "question": question_text,
                        "stimulus": stimulus,
                        "explanation": preprocess_mathml_content(question.get("explanation", "")),
                        "question_type": "multiple_choice",
                        "difficulty": overview.get("difficulty", "medium"),
                        "subject": subject_id,
                        "domain": domain_id,
                        "skill_code": sat_skill_code,
                        "options": processed_answer_options,
                        "correct_answer_ids": correct_answers,
                        "metadata": {
                            "original_data": {
                                "overview": overview,
                                "details": question_details
                            }
                        }
                    }, on_conflict="sat_external_id")
                )
                
                # Check for errors
                if hasattr(response, 'error') and response.error:
                    logger.error(f"Error upserting question {external_id}: {response.error}")
                    self.failed_count += 1
                    return False
                else:
                    # Check if this was an insert or update
                    if hasattr(response, 'data') and response.data:
                        self.imported_count += 1
                    else:
                        logger.warning(f"Question {external_id} may have been a duplicate")
                        self.duplicate_count += 1
                    return True
                    
            else:
                # Skip non-MCQ questions for now
                logger.warning(f"Skipping non-MCQ question {external_id} of type {question['type']}")
                self.skipped_count += 1
                return False
        except Exception as e:
            logger.error(f"Error processing question {overview.get('external_id', 'unknown')}: {e}")
            self.failed_count += 1
            return False
    
    def process_domain_questions(self, test_id: int, domain: str, event_id: int = None):
        """Process all questions for a specific domain"""
        # If no specific event ID is provided, process all configured event IDs
        event_ids = [event_id] if event_id is not None else ASMT_EVENT_IDS
        
        logger.info(f"Processing domain {domain} for test {test_id}")
        logger.info(f"Target event IDs: {event_ids}")
        
        for event_id in event_ids:
            logger.info(f"Processing event ID {event_id} for domain {domain}")
            
            # Reset timeout flag for each event
            self.timeout_occurred = False
            
            # Fetch overview questions
            overview_questions = self.fetch_question_overview(test_id, domain, event_id)
            
            if not overview_questions:
                logger.warning(f"No questions found for {domain}-{event_id}")
                continue
                
            logger.info(f"Found {len(overview_questions)} questions for {domain}-{event_id}")
            
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

    def run_import(self, test_id: int = None, domain: str = None, event_id: int = None):
        """Run the import process for specific parameters or all configured tests"""
        # If specific parameters are provided, use them
        # Otherwise, process all configured tests and domains
        if test_id is not None and domain is not None:
            logger.info(f"Starting targeted SAT question import for Test {test_id}, Domain {domain}, Event {event_id or 'ALL'}")
            
            # Validate inputs
            if test_id not in TEST_CONFIG:
                logger.error(f"Invalid test ID: {test_id}")
                return
                
            if domain not in TEST_CONFIG[test_id]["domains"]:
                logger.error(f"Invalid domain {domain} for test {test_id}")
                return
            
            start_time = time.time()
            
            try:
                self.process_domain_questions(test_id, domain, event_id)
            except Exception as e:
                logger.error(f"Error processing domain {domain}: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            # Process all configured tests and domains
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
                        import traceback
                        logger.error(traceback.format_exc())
        
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
    """Main execution function with command line arguments"""
    parser = argparse.ArgumentParser(description="Import SAT questions for specific test, domain, and event")
    parser.add_argument("--test", type=int, help="Test ID (1 for Reading/Writing, 2 for Math)")
    parser.add_argument("--domain", type=str, help="Domain code (e.g., INI, CAS, H, P)")
    parser.add_argument("--event", type=int, help="Event ID (e.g., 100, 102)")
    parser.add_argument("--all", action="store_true", help="Import all tests, domains, and events")
    
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Configure logging
    logger.info("Starting SAT question import")
    
    try:
        importer = SATQuestionImporter()
        
        if args.all:
            # Run the comprehensive import
            logger.info("Running comprehensive import for all tests, domains, and events")
            importer.run_import()
        elif args.test and args.domain:
            # Run import for specific parameters
            logger.info(f"Running targeted import for Test ID: {args.test}, Domain: {args.domain}, Event ID: {args.event if args.event else 'ALL'}")
            importer.run_import(args.test, args.domain, args.event)
        else:
            # Show usage if no valid combination of arguments
            logger.error("Please specify either --all to import everything, or provide --test and --domain (with optional --event)")
            parser.print_help()
    except KeyboardInterrupt:
        logger.info("Import interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error during import: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    main()
